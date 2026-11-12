package com.repairflow.security;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Chống dò mật khẩu: tối đa N lần sai / email trong khoảng thời gian cấu hình (mặc định 5 lần / 15 phút).
 * Đếm bằng Redis INCR (nguyên tử) – an toàn khi nhiều request đồng thời.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private static final String PREFIX = "rl:login:";

    private final StringRedisTemplate redis;
    private final AuthProperties properties;

    public void assertNotBlocked(String email) {
        try {
            String value = redis.opsForValue().get(PREFIX + email);
            if (value != null && Integer.parseInt(value) >= properties.loginMaxAttempts()) {
                throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,
                        "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau "
                                + properties.loginLockDuration().toMinutes() + " phút");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            log.warn("Rate limit không khả dụng (fail-open): {}", e.getMessage());
        }
    }

    public void recordFailure(String email) {
        try {
            String key = PREFIX + email;
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1) {
                redis.expire(key, properties.loginLockDuration());
            }
        } catch (RuntimeException e) {
            log.warn("Không ghi được lần đăng nhập sai: {}", e.getMessage());
        }
    }

    public void reset(String email) {
        try {
            redis.delete(PREFIX + email);
        } catch (RuntimeException e) {
            log.warn("Không xóa được bộ đếm đăng nhập: {}", e.getMessage());
        }
    }
}
