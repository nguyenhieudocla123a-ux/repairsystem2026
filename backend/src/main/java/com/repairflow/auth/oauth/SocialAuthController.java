package com.repairflow.auth.oauth;

import com.repairflow.auth.controller.RefreshTokenCookies;
import com.repairflow.auth.dto.AuthDtos.AuthResponse;
import com.repairflow.auth.service.AuthService;
import com.repairflow.auth.service.RequestMetadata;
import com.repairflow.common.validation.VietnamesePhone;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API phụ trợ đăng nhập Google/Facebook. Bản thân luồng chuyển hướng do Spring Security xử lý tại
 * {@code /api/v1/auth/oauth2/authorize/{google|facebook}} và {@code /api/v1/auth/oauth2/callback/{id}}.
 */
@Tag(name = "Auth – Google/Facebook")
@RestController
@RequestMapping("/api/v1/auth/oauth2")
@RequiredArgsConstructor
public class SocialAuthController {

    private final OAuthClientConfig.SocialClientRegistrations registrations;
    private final SocialLoginService socialLoginService;
    private final RefreshTokenCookies refreshCookies;
    private final SocialSignupCookie signupCookie;

    public record ProvidersResponse(List<String> providers) {
    }

    public record PendingSignupResponse(String provider, String email, String fullName) {
    }

    public record CompleteSocialSignupRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @VietnamesePhone String phone,
            @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự") String address,
            @NotBlank(message = "Vui lòng nhập mã xác nhận đã gửi tới email")
            @Pattern(regexp = "\\d{6}", message = "Mã xác nhận gồm 6 chữ số") String verificationCode) {
    }

    @Operation(summary = "Nhà cung cấp đang bật (frontend chỉ hiện nút của các bên này)")
    @GetMapping("/providers")
    public ProvidersResponse providers() {
        return new ProvidersResponse(registrations.enabled());
    }

    @Operation(summary = "Thông tin phiên đăng ký chờ sau khi quay về từ Google/Facebook (đọc từ cookie)")
    @GetMapping("/pending")
    public PendingSignupResponse pending(@CookieValue(name = SocialSignupCookie.NAME, required = false) String token) {
        SocialLoginService.PendingSignup p = socialLoginService.pending(token);
        return new PendingSignupResponse(p.provider().registrationId(), p.email(), p.fullName());
    }

    @Operation(summary = "Hoàn tất đăng ký Google/Facebook: SĐT + mã 6 số gửi về email (gửi mã bằng /auth/register/send-code)")
    @PostMapping("/complete")
    public ResponseEntity<AuthResponse> complete(
            @CookieValue(name = SocialSignupCookie.NAME, required = false) String token,
            @Valid @RequestBody CompleteSocialSignupRequest request, HttpServletRequest http) {
        AuthService.AuthResult result = socialLoginService.complete(token, request.fullName(), request.phone(),
                request.address(), request.verificationCode(), RequestMetadata.from(http));
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookies.create(result.refreshToken()).toString())
                .header(HttpHeaders.SET_COOKIE, signupCookie.clear().toString())
                .body(result.body());
    }
}
