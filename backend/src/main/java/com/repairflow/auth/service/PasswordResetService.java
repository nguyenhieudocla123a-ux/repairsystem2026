package com.repairflow.auth.service;

import com.repairflow.auth.entity.PasswordResetToken;
import com.repairflow.auth.repository.PasswordResetTokenRepository;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.security.AuthProperties;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quên mật khẩu bằng link một lần (hết hạn sau 30 phút).
 * Chưa tích hợp SMTP (ngoài phạm vi bản đầu): ở profile dev, link được ghi ra log để kiểm thử.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties properties;
    private final Clock clock;

    /** Luôn "thành công" với caller dù email không tồn tại → không lộ email nào đã đăng ký. */
    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmail(AuthService.normalizeEmail(email))
                .filter(User::isActive)
                .ifPresent(this::createToken);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = tokenRepository.findByTokenHash(TokenHasher.sha256(rawToken))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(now))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        token.setUsedAt(now);
        refreshTokenService.revokeAllOfUser(user.getId());
    }

    private void createToken(User user) {
        Instant now = clock.instant();
        tokenRepository.invalidateAllOfUser(user.getId(), now);
        String raw = TokenHasher.generateToken();
        tokenRepository.save(new PasswordResetToken(user, TokenHasher.sha256(raw), now.plus(properties.passwordResetTtl())));

        if (properties.logResetLinks()) {
            log.info("[DEV – chưa có SMTP] Link đặt lại mật khẩu cho {}: {}/reset-password?token={}",
                    user.getEmail(), properties.frontendUrl(), raw);
        }
    }
}
