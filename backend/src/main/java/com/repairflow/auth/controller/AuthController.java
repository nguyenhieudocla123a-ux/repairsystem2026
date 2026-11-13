package com.repairflow.auth.controller;

import com.repairflow.auth.dto.AuthDtos.AuthResponse;
import com.repairflow.auth.dto.AuthDtos.ChangePasswordRequest;
import com.repairflow.auth.dto.AuthDtos.ForgotPasswordRequest;
import com.repairflow.auth.dto.AuthDtos.LoginRequest;
import com.repairflow.auth.dto.AuthDtos.RefreshResponse;
import com.repairflow.auth.dto.AuthDtos.RegisterRequest;
import com.repairflow.auth.dto.AuthDtos.SendRegistrationCodeRequest;
import com.repairflow.auth.dto.AuthDtos.SendRegistrationCodeResponse;
import com.repairflow.auth.dto.AuthDtos.ResetPasswordRequest;
import com.repairflow.auth.dto.AuthDtos.UpdateProfileRequest;
import com.repairflow.auth.service.AuthService;
import com.repairflow.auth.service.PasswordResetService;
import com.repairflow.auth.service.RegistrationCodeService;
import com.repairflow.auth.service.RequestMetadata;
import com.repairflow.security.AuthProperties;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "Đăng nhập, đăng ký, phiên làm việc, hồ sơ cá nhân")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RegistrationCodeService registrationCodeService;
    private final RefreshTokenCookies cookies;

    @Operation(summary = "Đăng nhập – trả access token, đặt refresh token vào cookie HttpOnly")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        AuthService.AuthResult result = authService.login(request, RequestMetadata.from(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
                .body(result.body());
    }

    @Operation(summary = "Gửi mã xác nhận 6 số tới email (bước 1 của đăng ký)")
    @PostMapping("/register/send-code")
    public SendRegistrationCodeResponse sendRegistrationCode(@Valid @RequestBody SendRegistrationCodeRequest request,
                                                             HttpServletRequest http) {
        RegistrationCodeService.SentCode sent = registrationCodeService.send(request.email(), http.getRemoteAddr());
        return new SendRegistrationCodeResponse(sent.expiresIn().toSeconds(), sent.resendAfter().toSeconds());
    }

    @Operation(summary = "Khách hàng đăng ký tài khoản bằng mã xác nhận email (đăng nhập luôn)")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        AuthService.AuthResult result = authService.register(request, RequestMetadata.from(http));
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
                .body(result.body());
    }

    @Operation(summary = "Cấp access token mới bằng refresh token trong cookie (xoay vòng refresh token)")
    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(
            @CookieValue(name = AuthProperties.REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest http) {
        AuthService.RefreshResult result = authService.refresh(refreshToken, RequestMetadata.from(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
                .body(result.body());
    }

    @Operation(summary = "Đăng xuất – thu hồi refresh token, chặn access token hiện tại")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = AuthProperties.REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String accessToken = authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring(7)
                : null;
        authService.logout(refreshToken, accessToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
                .build();
    }

    @Operation(summary = "Gửi link đặt lại mật khẩu (luôn trả 204, không tiết lộ email có tồn tại)")
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Đặt lại mật khẩu bằng token trong link")
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Thông tin người dùng hiện tại")
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return authService.me(user.id());
    }

    @Operation(summary = "Cập nhật họ tên, số điện thoại")
    @PutMapping("/me")
    public UserResponse updateProfile(@AuthenticationPrincipal AuthenticatedUser user,
                                      @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(user.id(), request);
    }

    @Operation(summary = "Đổi mật khẩu – đăng xuất các thiết bị khác, trả phiên mới cho thiết bị hiện tại")
    @PutMapping("/me/password")
    public ResponseEntity<AuthResponse> changePassword(@AuthenticationPrincipal AuthenticatedUser user,
                                                       @Valid @RequestBody ChangePasswordRequest request,
                                                       HttpServletRequest http) {
        AuthService.AuthResult result = authService.changePassword(user.id(), request, RequestMetadata.from(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
                .body(result.body());
    }
}
