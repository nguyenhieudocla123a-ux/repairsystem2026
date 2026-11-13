package com.repairflow.auth.oauth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairflow.auth.service.AuthService;
import com.repairflow.auth.service.RegistrationCodeService;
import com.repairflow.auth.service.RequestMetadata;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.SocialProvider;
import com.repairflow.user.entity.User;
import com.repairflow.user.entity.UserIdentity;
import com.repairflow.user.repository.UserIdentityRepository;
import com.repairflow.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Đăng nhập / đăng ký bằng Google, Facebook (sau khi Spring Security đã đổi code lấy thông tin người dùng).
 *
 * <ol>
 *   <li>Đã liên kết (provider + id ở nhà cung cấp) → đăng nhập.</li>
 *   <li>Chưa liên kết nhưng email trùng tài khoản KHÁCH HÀNG và Google xác nhận email (email_verified) → liên kết rồi
 *       đăng nhập. Facebook không trả cờ xác minh → không tự liên kết (tránh chiếm tài khoản qua email chưa xác minh).</li>
 *   <li>Email thuộc tài khoản nội bộ (ADMIN/STAFF/TECHNICIAN) → từ chối: nhân viên chỉ đăng nhập bằng mật khẩu.</li>
 *   <li>Người mới → lưu "phiên đăng ký chờ" trong Redis (15 phút) và cho người dùng hoàn tất: nhập SĐT +
 *       <b>mã 6 số gửi về email</b> (dùng chung {@link RegistrationCodeService}) → tạo tài khoản không mật khẩu.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class SocialLoginService {

    static final Duration PENDING_TTL = Duration.ofMinutes(15);
    private static final String PENDING_KEY = "oauth2:signup:";

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;
    private final CustomerRepository customerRepository;
    private final AuthService authService;
    private final RegistrationCodeService registrationCodeService;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    /** Thông tin lấy từ nhà cung cấp, đã chuẩn hoá. */
    public record SocialProfile(SocialProvider provider, String providerUserId, String email, boolean emailVerified,
                                String fullName) {

        /** Google (OIDC): sub, email, email_verified, name · Facebook: id, email, name. */
        public static SocialProfile from(SocialProvider provider, Map<String, Object> attributes) {
            Object idAttr = provider == SocialProvider.GOOGLE ? attributes.get("sub") : attributes.get("id");
            Object email = attributes.get("email");
            Object name = attributes.get("name");
            boolean verified = provider == SocialProvider.GOOGLE && Boolean.TRUE.equals(attributes.get("email_verified"));
            return new SocialProfile(provider, idAttr == null ? null : String.valueOf(idAttr),
                    email == null ? null : AuthService.normalizeEmail(String.valueOf(email)), verified,
                    name == null ? null : String.valueOf(name).trim());
        }
    }

    /** Kết quả xử lý callback: đăng nhập luôn / cần hoàn tất đăng ký / lỗi (mã gửi về frontend qua query). */
    public sealed interface Outcome {
        record LoggedIn(AuthService.AuthResult result) implements Outcome {
        }

        record NeedsSignup(String pendingToken) implements Outcome {
        }

        record Failed(String reason) implements Outcome {
        }
    }

    /** Phiên đăng ký chờ (lưu JSON trong Redis, khoá = SHA-256 của token trong cookie). */
    public record PendingSignup(SocialProvider provider, String providerUserId, String email, String fullName) {
    }

    @Transactional
    public Outcome handle(SocialProfile profile, RequestMetadata metadata) {
        if (!StringUtils.hasText(profile.providerUserId())) {
            return new Outcome.Failed("OAUTH_FAILED");
        }
        Optional<UserIdentity> identity = identityRepository
                .findByProviderAndProviderUserId(profile.provider(), profile.providerUserId());
        if (identity.isPresent()) {
            return logIn(identity.get().getUser(), metadata);
        }
        if (!StringUtils.hasText(profile.email())) {
            return new Outcome.Failed("EMAIL_REQUIRED");
        }

        Optional<User> existing = userRepository.findByEmail(profile.email());
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getRole() != Role.CUSTOMER) {
                return new Outcome.Failed("STAFF_ACCOUNT");
            }
            if (!profile.emailVerified()) {
                return new Outcome.Failed("EMAIL_EXISTS");
            }
            if (!identityRepository.existsByUserIdAndProvider(user.getId(), profile.provider())) {
                identityRepository.save(new UserIdentity(user, profile.provider(), profile.providerUserId()));
            }
            return logIn(user, metadata);
        }
        if (customerRepository.existsByEmail(profile.email())) {
            // Hồ sơ do cửa hàng tạo sẵn, chưa có tài khoản → giống đăng ký thường: liên hệ cửa hàng để kích hoạt
            return new Outcome.Failed("EMAIL_EXISTS");
        }

        String token = TokenHasher.generateToken();
        PendingSignup pending = new PendingSignup(profile.provider(), profile.providerUserId(), profile.email(),
                StringUtils.hasText(profile.fullName()) ? profile.fullName() : "");
        redis.opsForValue().set(PENDING_KEY + TokenHasher.sha256(token), toJson(pending), PENDING_TTL);
        return new Outcome.NeedsSignup(token);
    }

    public PendingSignup pending(String token) {
        if (!StringUtils.hasText(token)) {
            throw expired();
        }
        String json = redis.opsForValue().get(PENDING_KEY + TokenHasher.sha256(token));
        if (json == null) {
            throw expired();
        }
        try {
            return objectMapper.readValue(json, PendingSignup.class);
        } catch (JsonProcessingException e) {
            throw expired();
        }
    }

    /** Hoàn tất đăng ký: kiểm tra trùng → xác minh mã 6 số gửi về email → tạo tài khoản + liên kết → đăng nhập. */
    @Transactional
    public AuthService.AuthResult complete(String token, String fullName, String phone, String address,
                                           String verificationCode, RequestMetadata metadata) {
        PendingSignup pending = pending(token);
        authService.assertCanRegister(pending.email(), phone);
        registrationCodeService.verifyAndConsume(pending.email(), verificationCode);
        User user = authService.createCustomerAccount(pending.email(), null, fullName, phone, address);
        identityRepository.save(new UserIdentity(user, pending.provider(), pending.providerUserId()));
        redis.delete(PENDING_KEY + TokenHasher.sha256(token));
        return authService.startSession(user, metadata);
    }

    private Outcome logIn(User user, RequestMetadata metadata) {
        if (!user.isActive()) {
            return new Outcome.Failed("ACCOUNT_LOCKED");
        }
        user.setLastLoginAt(clock.instant());
        return new Outcome.LoggedIn(authService.startSession(user, metadata));
    }

    private String toJson(PendingSignup pending) {
        try {
            return objectMapper.writeValueAsString(pending);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static BusinessException expired() {
        return new BusinessException(ErrorCode.BAD_REQUEST,
                "Phiên đăng ký bằng Google/Facebook đã hết hạn, vui lòng chọn lại nút Google/Facebook");
    }
}
