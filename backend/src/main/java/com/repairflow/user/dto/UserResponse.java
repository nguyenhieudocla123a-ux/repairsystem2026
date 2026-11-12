package com.repairflow.user.dto;

import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.entity.UserStatus;
import java.time.Instant;

/** Thông tin tài khoản trả ra ngoài – không bao giờ chứa passwordHash. */
public record UserResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        Role role,
        UserStatus status,
        Long customerId,
        Instant lastLoginAt,
        Instant createdAt,
        /** Phiên bản ảnh đại diện (null = chưa có ảnh) – frontend gắn vào URL ảnh để phá cache khi đổi ảnh. */
        Instant avatarUpdatedAt) {

    /** Mapper viết tay (TD-10). customerId chỉ có với tài khoản CUSTOMER. */
    public static UserResponse from(User user, Long customerId) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.getRole(),
                user.getStatus(), customerId, user.getLastLoginAt(), user.getCreatedAt(), user.getAvatarUpdatedAt());
    }
}
