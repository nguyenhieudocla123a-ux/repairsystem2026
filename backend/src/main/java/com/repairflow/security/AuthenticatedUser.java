package com.repairflow.security;

import com.repairflow.user.entity.Role;

/**
 * Người dùng hiện tại, dựng từ claim của access token (không truy vấn DB mỗi request → stateless).
 * Lấy trong controller bằng {@code @AuthenticationPrincipal AuthenticatedUser user}.
 */
public record AuthenticatedUser(Long id, String email, Role role) {

    public boolean hasRole(Role expected) {
        return role == expected;
    }
}
