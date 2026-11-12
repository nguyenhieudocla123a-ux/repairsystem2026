package com.repairflow.user.dto;

import com.repairflow.common.validation.StrongPassword;
import com.repairflow.common.validation.VietnamesePhone;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** DTO quản trị tài khoản (ADMIN) – docs/api-specification.md §3. */
public final class UserAdminDtos {

    private UserAdminDtos() {
    }

    /** Tạo tài khoản nội bộ. CUSTOMER không tạo ở đây (khách tự đăng ký hoặc kích hoạt từ hồ sơ khách hàng). */
    public record CreateUserRequest(
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255)
            String email,
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @VietnamesePhone String phone,
            @NotNull(message = "Vui lòng chọn vai trò") Role role,
            @StrongPassword String password) {
    }

    public record UpdateUserRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @VietnamesePhone String phone,
            @NotNull(message = "Vui lòng chọn vai trò") Role role) {
    }

    public record UpdateUserStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái") UserStatus status) {
    }

    public record AdminResetPasswordRequest(@StrongPassword String newPassword) {
    }
}
