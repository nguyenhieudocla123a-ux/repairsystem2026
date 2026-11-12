package com.repairflow.security;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Cấu hình xác thực (app.auth.*). @Validated → thiếu JWT_SECRET thì app dừng ngay khi khởi động. */
@Validated
@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
        @NotBlank(message = "Thiếu biến môi trường JWT_SECRET") String jwtSecret,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl,
        boolean cookieSecure,
        @Min(1) int loginMaxAttempts,
        @NotNull Duration loginLockDuration,
        @NotNull Duration passwordResetTtl,
        @NotBlank String frontendUrl,
        boolean logResetLinks) {

    public static final String REFRESH_COOKIE = "rf_refresh";
    public static final String REFRESH_COOKIE_PATH = "/api/v1/auth";
}
