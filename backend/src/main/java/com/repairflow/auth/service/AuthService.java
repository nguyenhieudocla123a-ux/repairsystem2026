package com.repairflow.auth.service;

import com.repairflow.auth.dto.AuthDtos.AuthResponse;
import com.repairflow.auth.dto.AuthDtos.ChangePasswordRequest;
import com.repairflow.auth.dto.AuthDtos.LoginRequest;
import com.repairflow.auth.dto.AuthDtos.RefreshResponse;
import com.repairflow.auth.dto.AuthDtos.RegisterRequest;
import com.repairflow.auth.dto.AuthDtos.UpdateProfileRequest;
import com.repairflow.auth.service.RefreshTokenService.IssuedToken;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.security.JwtService;
import com.repairflow.security.LoginAttemptService;
import com.repairflow.security.TokenBlacklistService;
import com.repairflow.user.dto.UserResponse;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import java.time.Clock;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Nghiệp vụ xác thực. Controller chỉ lo HTTP/cookie; mọi quy tắc nằm ở đây.
 * Kết quả trả về {@link AuthResult} gồm body JSON + refresh token thô để controller đặt vào cookie.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService blacklistService;
    private final LoginAttemptService loginAttemptService;
    private final CodeGenerator codeGenerator;
    private final Clock clock;

    /**
     * Hash BCrypt thật của chuỗi ngẫu nhiên, dùng khi email không tồn tại để thời gian phản hồi giống trường hợp
     * sai mật khẩu → kẻ tấn công không thể đo thời gian để dò email nào đã đăng ký. Sinh một lần, lười (lazy).
     */
    private volatile String dummyHash;

    public record AuthResult(AuthResponse body, IssuedToken refreshToken) {
    }

    public record RefreshResult(RefreshResponse body, IssuedToken refreshToken) {
    }

    @Transactional
    public AuthResult login(LoginRequest request, RequestMetadata metadata) {
        String email = normalizeEmail(request.email());
        loginAttemptService.assertNotBlocked(email);

        User user = userRepository.findByEmail(email).orElse(null);
        String hash = user != null ? user.getPasswordHash() : dummyHash();
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
        if (user == null || !passwordMatches) {
            loginAttemptService.recordFailure(email);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Email hoặc mật khẩu không đúng");
        }
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên");
        }

        loginAttemptService.reset(email);
        user.setLastLoginAt(clock.instant());
        return startSession(user, metadata);
    }

    /** Khách hàng tự đăng ký: tạo tài khoản CUSTOMER + hồ sơ khách hàng, đăng nhập luôn. */
    @Transactional
    public AuthResult register(RegisterRequest request, RequestMetadata metadata) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email) || customerRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã được sử dụng");
        }
        if (customerRepository.existsByPhone(request.phone())) {
            // Không tự liên kết với hồ sơ có sẵn: ai biết SĐT cũng có thể chiếm hồ sơ người khác (requirements AUTH-02)
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE,
                    "Số điện thoại đã có hồ sơ tại cửa hàng. Vui lòng liên hệ nhân viên để kích hoạt tài khoản");
        }

        User user = userRepository.save(new User(email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), request.phone(), Role.CUSTOMER));
        user.setLastLoginAt(clock.instant());

        Customer customer = new Customer(codeGenerator.next(CodeType.CUSTOMER), request.fullName().trim(), request.phone());
        customer.setEmail(email);
        customer.setAddress(StringUtils.hasText(request.address()) ? request.address().trim() : null);
        customer.setUser(user);
        customerRepository.save(customer);

        return startSession(user, metadata);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public RefreshResult refresh(String rawRefreshToken, RequestMetadata metadata) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại");
        }
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(rawRefreshToken, metadata);
        String accessToken = jwtService.generateAccessToken(rotation.user());
        return new RefreshResult(new RefreshResponse(accessToken, "Bearer", jwtService.accessTokenTtlSeconds()),
                rotation.newToken());
    }

    /** Đăng xuất idempotent: thu hồi refresh token (nếu có) và chặn access token còn hạn (nếu có). */
    @Transactional
    public void logout(String rawRefreshToken, String accessToken) {
        if (StringUtils.hasText(rawRefreshToken)) {
            refreshTokenService.revokeSession(rawRefreshToken);
        }
        if (StringUtils.hasText(accessToken)) {
            try {
                JwtService.ParsedToken parsed = jwtService.parse(accessToken);
                blacklistService.blacklist(parsed.jti(), parsed.expiresAt());
            } catch (JwtException | IllegalArgumentException ignored) {
                // Token đã hết hạn hoặc không hợp lệ → không cần chặn
            }
        }
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return toResponse(loadUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = loadUser(userId);
        String phone = StringUtils.hasText(request.phone()) ? request.phone() : null;
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);

        // Khách hàng: đồng bộ hồ sơ khách (tên, SĐT) để nhân viên thấy thông tin mới nhất
        if (user.getRole() == Role.CUSTOMER) {
            customerRepository.findByUserId(userId).ifPresent(customer -> {
                if (phone == null) {
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Khách hàng phải có số điện thoại");
                }
                if (customerRepository.existsByPhoneAndIdNot(phone, customer.getId())) {
                    throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Số điện thoại đã được sử dụng");
                }
                customer.setFullName(user.getFullName());
                customer.setPhone(phone);
            });
        }
        return toResponse(user);
    }

    /** Đổi mật khẩu → đăng xuất mọi thiết bị khác, cấp phiên mới cho thiết bị hiện tại. */
    @Transactional
    public AuthResult changePassword(Long userId, ChangePasswordRequest request, RequestMetadata metadata) {
        User user = loadUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        refreshTokenService.revokeAllOfUser(userId);
        return startSession(user, metadata);
    }

    private AuthResult startSession(User user, RequestMetadata metadata) {
        IssuedToken refresh = refreshTokenService.issue(user, UUID.randomUUID(), metadata);
        String accessToken = jwtService.generateAccessToken(user);
        AuthResponse body = AuthResponse.of(accessToken, jwtService.accessTokenTtlSeconds(), toResponse(user));
        return new AuthResult(body, refresh);
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> BusinessException.notFound("Người dùng", userId));
    }

    private UserResponse toResponse(User user) {
        Long customerId = user.getRole() == Role.CUSTOMER
                ? customerRepository.findByUserId(user.getId()).map(Customer::getId).orElse(null)
                : null;
        return UserResponse.from(user, customerId);
    }

    private String dummyHash() {
        if (dummyHash == null) {
            dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
        }
        return dummyHash;
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
