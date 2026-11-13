package com.repairflow.security;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Giới hạn tần suất kiểu "fixed window" bằng Redis INCR + EXPIRE (nguyên tử, dùng chung cho mọi instance).
 * Dùng cho API công khai (tra cứu bảo hành) để chống dò quét serial. Redis lỗi → fail-open có log.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RequestRateLimiter {

    private final StringRedisTemplate redis;

    public void check(String key, int limit, Duration window) {
        check(key, limit, window, "Bạn tra cứu quá nhiều lần, vui lòng thử lại sau " + window.toSeconds() + " giây");
    }

    public void check(String key, int limit, Duration window, String message) {
        try {
            Long count = redis.opsForValue().increment("rl:" + key);
            if (count != null && count == 1) {
                redis.expire("rl:" + key, window);
            }
            if (count != null && count > limit) {
                throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS, message);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            log.warn("Rate limiter không khả dụng (fail-open): {}", e.getMessage());
        }
    }
}
