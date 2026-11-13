package com.repairflow.auth.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.security.AuthProperties;
import com.repairflow.security.RequestRateLimiter;
import com.repairflow.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Mã xác nhận email khi khách tự đăng ký (chứng minh sở hữu email trước khi tạo tài khoản).
 *
 * <ul>
 *   <li>Mã 6 chữ số sinh bằng {@link SecureRandom}; Redis chỉ lưu bản băm SHA-256 (gắn với email), TTL 10 phút.</li>
 *   <li>Gửi lại: phải chờ {@link #RESEND_COOLDOWN}; mỗi IP tối đa {@code app.auth.registration-code-ip-limit} lần gửi/giờ → chống spam mail.</li>
 *   <li>Nhập sai {@link #MAX_ATTEMPTS} lần → huỷ mã, phải gửi mã mới → chống dò 10^6 tổ hợp.</li>
 *   <li>Mã chỉ dùng một lần: xác nhận đúng là xoá ngay.</li>
 * </ul>
 * Khác rate limiter (fail-open), bước xác minh là <b>fail-closed</b>: Redis lỗi thì không cho đăng ký,
 * vì nếu bỏ qua kiểm tra thì mã xác nhận mất ý nghĩa.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationCodeService {

    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final int MAX_ATTEMPTS = 5;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_KEY = "reg:code:";
    private static final String ATTEMPTS_KEY = "reg:attempts:";
    private static final String COOLDOWN_KEY = "reg:cooldown:";

    private final StringRedisTemplate redis;
    private final RequestRateLimiter rateLimiter;
    private final VerificationCodeMailer mailer;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AuthProperties properties;

    public record SentCode(Duration expiresIn, Duration resendAfter) {
    }

    public SentCode send(String rawEmail, String clientIp) {
        String email = AuthService.normalizeEmail(rawEmail);
        if (userRepository.existsByEmail(email) || customerRepository.existsByEmail(email)) {
            // Cùng thông báo với bước đăng ký (vốn đã trả 409) → không lộ thêm thông tin nào
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã được sử dụng");
        }
        rateLimiter.check("reg-code:" + clientIp, properties.registrationCodeIpLimit(), Duration.ofHours(1),
                "Bạn đã yêu cầu gửi mã quá nhiều lần, vui lòng thử lại sau ít phút");

        Duration ttl = properties.registrationCodeTtl();
        String code = "%06d".formatted(RANDOM.nextInt(1_000_000));
        try {
            Boolean first = redis.opsForValue().setIfAbsent(COOLDOWN_KEY + email, "1", RESEND_COOLDOWN);
            if (!Boolean.TRUE.equals(first)) {
                Long wait = redis.getExpire(COOLDOWN_KEY + email);
                throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,
                        "Vui lòng chờ " + (wait != null && wait > 0 ? wait : RESEND_COOLDOWN.toSeconds())
                                + " giây trước khi gửi lại mã");
            }
            // Mã mới thay mã cũ và đặt lại số lần thử
            redis.opsForValue().set(CODE_KEY + email, hash(email, code), ttl);
            redis.delete(ATTEMPTS_KEY + email);
        } catch (DataAccessException e) {
            throw unavailable(e);
        }

        try {
            mailer.sendRegistrationCode(email, code, ttl);
        } catch (RuntimeException e) {
            // Gửi thất bại → bỏ mã + thời gian chờ để người dùng thử lại ngay được
            redis.delete(List.of(CODE_KEY + email, COOLDOWN_KEY + email));
            throw e;
        }
        return new SentCode(ttl, RESEND_COOLDOWN);
    }

    /** Kiểm tra và tiêu thụ mã (một lần). Sai/hết hạn → 400 với thông báo cụ thể. */
    public void verifyAndConsume(String rawEmail, String code) {
        String email = AuthService.normalizeEmail(rawEmail);
        try {
            String stored = redis.opsForValue().get(CODE_KEY + email);
            if (stored == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Mã xác nhận đã hết hạn hoặc chưa được gửi, vui lòng gửi lại mã");
            }
            if (!MessageDigest.isEqual(stored.getBytes(StandardCharsets.UTF_8),
                    hash(email, code).getBytes(StandardCharsets.UTF_8))) {
                Long attempts = redis.opsForValue().increment(ATTEMPTS_KEY + email);
                redis.expire(ATTEMPTS_KEY + email, properties.registrationCodeTtl());
                long used = attempts == null ? 1 : attempts;
                if (used >= MAX_ATTEMPTS) {
                    redis.delete(List.of(CODE_KEY + email, ATTEMPTS_KEY + email));
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Bạn đã nhập sai mã quá " + MAX_ATTEMPTS + " lần, vui lòng gửi lại mã mới");
                }
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Mã xác nhận không đúng (còn " + (MAX_ATTEMPTS - used) + " lần thử)");
            }
            redis.delete(List.of(CODE_KEY + email, ATTEMPTS_KEY + email));
        } catch (DataAccessException e) {
            throw unavailable(e);
        }
    }

    private static String hash(String email, String code) {
        return TokenHasher.sha256(email + ":" + code);
    }

    private static BusinessException unavailable(DataAccessException e) {
        log.error("Redis không khả dụng khi xử lý mã xác nhận: {}", e.getMessage());
        return new BusinessException(ErrorCode.SERVICE_UNAVAILABLE,
                "Hệ thống xác nhận email tạm thời gián đoạn, vui lòng thử lại sau");
    }
}
