package com.repairflow.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Danh sách access token đã đăng xuất (Redis). Key tự hết hạn đúng lúc token hết hạn → không phình dữ liệu.
 * Redis lỗi → fail-open (cho qua, ghi log): access token chỉ sống 15 phút nên rủi ro thấp,
 * đổi lại hệ thống không sập theo Redis (TD-04).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String PREFIX = "jwt:blacklist:";

    private final StringRedisTemplate redis;
    private final Clock clock;

    public void blacklist(String jti, Instant expiresAt) {
        Duration ttl = Duration.between(clock.instant(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) {
            return; // đã hết hạn, không cần chặn
        }
        try {
            redis.opsForValue().set(PREFIX + jti, "1", ttl);
        } catch (RuntimeException e) {
            log.warn("Không ghi được blacklist token vào Redis: {}", e.getMessage());
        }
    }

    public boolean isBlacklisted(String jti) {
        try {
            return Boolean.TRUE.equals(redis.hasKey(PREFIX + jti));
        } catch (RuntimeException e) {
            log.warn("Không đọc được blacklist token từ Redis (fail-open): {}", e.getMessage());
            return false;
        }
    }
}
