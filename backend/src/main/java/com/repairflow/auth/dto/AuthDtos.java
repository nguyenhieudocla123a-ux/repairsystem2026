package com.repairflow.auth.dto;

import com.repairflow.common.validation.StrongPassword;
import com.repairflow.common.validation.VietnamesePhone;
import com.repairflow.user.dto.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO của module auth (docs/api-specification.md §2). Gom vào một file vì đều nhỏ và chỉ dùng trong module này.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
            @NotBlank(message = "Vui lòng nhập mật khẩu") String password) {
    }

    public record RegisterRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255)
            String email,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @VietnamesePhone String phone,
            @StrongPassword String password,
            @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự") String address) {
    }

    /** Access token trả trong body; refresh token chỉ nằm trong cookie HttpOnly (không bao giờ trong body). */
    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {

        public static AuthResponse of(String accessToken, long expiresIn, UserResponse user) {
            return new AuthResponse(accessToken, "Bearer", expiresIn, user);
        }
    }

    public record RefreshResponse(String accessToken, String tokenType, long expiresIn) {
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @VietnamesePhone String phone) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
            @StrongPassword String newPassword) {
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank(message = "Thiếu mã đặt lại mật khẩu") String token,
            @StrongPassword String newPassword) {
    }
}
