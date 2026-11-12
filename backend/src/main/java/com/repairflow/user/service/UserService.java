package com.repairflow.user.service;

import com.repairflow.auth.service.RefreshTokenService;
import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.user.dto.TechnicianOption;
import com.repairflow.user.dto.UserAdminDtos.CreateUserRequest;
import com.repairflow.user.dto.UserAdminDtos.UpdateUserRequest;
import com.repairflow.user.dto.UserResponse;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.entity.UserStatus;
import com.repairflow.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Quản trị tài khoản (chỉ ADMIN gọi được – kiểm tra ở controller bằng @PreAuthorize). */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "fullName", "email", "role", "lastLoginAt");
    private static final Set<RepairStatus> ACTIVE_REPAIR_STATUSES = EnumSet.of(
            RepairStatus.RECEIVED, RepairStatus.INSPECTING, RepairStatus.WAITING_CONFIRMATION, RepairStatus.APPROVED,
            RepairStatus.WAITING_FOR_PARTS, RepairStatus.REPAIRING);

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(Collection<Role> roles, UserStatus status, String keyword, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(userRepository.findAll(filter(roles, status, keyword), page), this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return toResponse(load(id));
    }

    @Transactional(readOnly = true)
    public List<TechnicianOption> activeTechnicians() {
        return userRepository.findActiveTechnicians(ACTIVE_REPAIR_STATUSES);
    }

    @Transactional
    public UserResponse create(Long actorId, CreateUserRequest request) {
        if (request.role() == Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Tài khoản khách hàng được tạo qua đăng ký hoặc từ hồ sơ khách hàng");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã được sử dụng");
        }
        User user = userRepository.save(new User(email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), blankToNull(request.phone()), request.role()));
        auditService.record(actorId, "USER_CREATED", "USER", user.getId(), Map.of("role", user.getRole().name()));
        return toResponse(user);
    }

    @Transactional
    public UserResponse update(Long actorId, Long id, UpdateUserRequest request) {
        User user = load(id);
        Role oldRole = user.getRole();
        if (oldRole != request.role()) {
            if (id.equals(actorId)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Bạn không thể tự thay đổi vai trò của chính mình");
            }
            if (oldRole == Role.CUSTOMER || request.role() == Role.CUSTOMER) {
                // Tài khoản khách hàng gắn với hồ sơ khách → không chuyển qua lại với tài khoản nội bộ
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Không thể chuyển đổi giữa tài khoản khách hàng và tài khoản nội bộ");
            }
            user.setRole(request.role());
            // Token cũ mang role cũ → buộc đăng nhập lại để nhận quyền mới
            refreshTokenService.revokeAllOfUser(id);
            auditService.record(actorId, "USER_ROLE_CHANGED", "USER", id,
                    Map.of("from", oldRole.name(), "to", request.role().name()));
        }
        user.setFullName(request.fullName().trim());
        user.setPhone(blankToNull(request.phone()));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateStatus(Long actorId, Long id, UserStatus status) {
        if (id.equals(actorId) && status == UserStatus.LOCKED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Bạn không thể tự khóa tài khoản của chính mình");
        }
        User user = load(id);
        if (user.getStatus() != status) {
            user.setStatus(status);
            if (status == UserStatus.LOCKED) {
                refreshTokenService.revokeAllOfUser(id);
            }
            auditService.record(actorId, status == UserStatus.LOCKED ? "USER_LOCKED" : "USER_UNLOCKED", "USER", id, Map.of());
        }
        return toResponse(user);
    }

    @Transactional
    public void resetPassword(Long actorId, Long id, String newPassword) {
        User user = load(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        refreshTokenService.revokeAllOfUser(id);
        auditService.record(actorId, "USER_PASSWORD_RESET", "USER", id, Map.of());
    }

    private Specification<User> filter(Collection<Role> roles, UserStatus status, String keyword) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (roles != null && !roles.isEmpty()) {
                predicates.add(root.get("role").in(roles));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), like),
                        cb.like(root.get("email"), like),
                        cb.like(root.get("phone"), like)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private User load(Long id) {
        return userRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Người dùng", id));
    }

    private UserResponse toResponse(User user) {
        Long customerId = user.getRole() == Role.CUSTOMER
                ? customerRepository.findByUserId(user.getId()).map(Customer::getId).orElse(null)
                : null;
        return UserResponse.from(user, customerId);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
