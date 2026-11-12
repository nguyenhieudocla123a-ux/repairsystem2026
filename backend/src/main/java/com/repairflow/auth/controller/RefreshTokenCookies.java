package com.repairflow.auth.controller;

import com.repairflow.auth.service.RefreshTokenService.IssuedToken;
import com.repairflow.security.AuthProperties;
import java.time.Clock;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Tạo cookie refresh token: HttpOnly (JS không đọc được → chống XSS), SameSite=Strict (chống CSRF),
 * Path=/api/v1/auth (chỉ gửi kèm các API auth, không gửi theo mọi request).
 */
@Component
@RequiredArgsConstructor
public class RefreshTokenCookies {

    private final AuthProperties properties;
    private final Clock clock;

    public ResponseCookie create(IssuedToken token) {
        Duration maxAge = Duration.between(clock.instant(), token.expiresAt());
        return base(token.rawToken()).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(AuthProperties.REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(AuthProperties.REFRESH_COOKIE_PATH);
    }
}
