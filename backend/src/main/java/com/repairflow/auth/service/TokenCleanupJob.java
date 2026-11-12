package com.repairflow.auth.service;

import com.repairflow.auth.repository.PasswordResetTokenRepository;
import com.repairflow.auth.repository.RefreshTokenRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Dọn token hết hạn mỗi ngày lúc 3h sáng (giữ lại 1 ngày để còn điều tra sự cố nếu cần). */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenCleanupJob {

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final Clock clock;

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        Instant threshold = clock.instant().minus(Duration.ofDays(1));
        int refresh = refreshTokenRepository.deleteExpiredBefore(threshold);
        int reset = passwordResetTokenRepository.deleteExpiredBefore(threshold);
        log.info("Đã dọn {} refresh token và {} token đặt lại mật khẩu hết hạn", refresh, reset);
    }
}
