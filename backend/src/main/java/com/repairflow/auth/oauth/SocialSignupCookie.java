package com.repairflow.auth.oauth;

import com.repairflow.security.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Cookie giữ token "phiên đăng ký chờ" sau khi quay về từ Google/Facebook: HttpOnly, SameSite=Strict,
 * chỉ gửi tới /api/v1/auth/oauth2. Token không nằm trên URL (không lọt vào lịch sử trình duyệt / log proxy).
 */
@Component
@RequiredArgsConstructor
public class SocialSignupCookie {

    public static final String NAME = "rf_oauth_signup";
    private static final String PATH = "/api/v1/auth/oauth2";

    private final AuthProperties properties;

    public ResponseCookie create(String token) {
        return base(token).maxAge(SocialLoginService.PENDING_TTL).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(PATH);
    }
}
