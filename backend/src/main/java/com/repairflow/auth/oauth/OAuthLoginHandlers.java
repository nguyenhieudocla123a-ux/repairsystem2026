package com.repairflow.auth.oauth;

import com.repairflow.auth.controller.RefreshTokenCookies;
import com.repairflow.auth.service.RequestMetadata;
import com.repairflow.security.AuthProperties;
import com.repairflow.user.entity.SocialProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Xử lý kết quả callback OAuth2 và chuyển trình duyệt về frontend:
 * <ul>
 *   <li>đăng nhập được → đặt cookie refresh token (HttpOnly) → {@code /oauth/callback}; frontend gọi /auth/refresh lấy
 *       access token như khi tải lại trang. Không bao giờ đưa token lên URL.</li>
 *   <li>người mới → cookie phiên đăng ký chờ → {@code /register/social} để nhập SĐT + mã xác nhận email.</li>
 *   <li>lỗi → {@code /login?oauthError=MÃ} (mã cố định, frontend tự dịch ra thông báo).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthLoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private final SocialLoginService socialLoginService;
    private final RefreshTokenCookies refreshCookies;
    private final SocialSignupCookie signupCookie;
    private final AuthProperties properties;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        SecurityContextHolder.clearContext(); // API stateless: phiên thật là JWT/refresh token của RepairFlow
        if (!(authentication instanceof OAuth2AuthenticationToken token)) {
            redirect(response, "/login?oauthError=OAUTH_FAILED");
            return;
        }
        SocialProvider provider = SocialProvider.fromRegistrationId(token.getAuthorizedClientRegistrationId()).orElse(null);
        if (provider == null) {
            redirect(response, "/login?oauthError=OAUTH_FAILED");
            return;
        }
        SocialLoginService.SocialProfile profile =
                SocialLoginService.SocialProfile.from(provider, token.getPrincipal().getAttributes());
        SocialLoginService.Outcome outcome = socialLoginService.handle(profile, RequestMetadata.from(request));
        // Java 17: chưa có pattern matching cho switch → dùng instanceof
        if (outcome instanceof SocialLoginService.Outcome.LoggedIn in) {
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookies.create(in.result().refreshToken()).toString());
            redirect(response, "/oauth/callback");
        } else if (outcome instanceof SocialLoginService.Outcome.NeedsSignup signup) {
            response.addHeader(HttpHeaders.SET_COOKIE, signupCookie.create(signup.pendingToken()).toString());
            redirect(response, "/register/social");
        } else if (outcome instanceof SocialLoginService.Outcome.Failed failed) {
            redirect(response, "/login?oauthError=" + failed.reason());
        }
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        String code = "OAUTH_FAILED";
        if (exception instanceof OAuth2AuthenticationException oauth
                && "access_denied".equals(oauth.getError().getErrorCode())) {
            code = "CANCELLED"; // người dùng bấm Huỷ ở màn hình Google/Facebook
        } else {
            log.warn("Đăng nhập OAuth2 thất bại: {}", exception.getMessage());
        }
        redirect(response, "/login?oauthError=" + code);
    }

    private void redirect(HttpServletResponse response, String path) throws IOException {
        response.sendRedirect(properties.frontendUrl() + path);
    }
}
