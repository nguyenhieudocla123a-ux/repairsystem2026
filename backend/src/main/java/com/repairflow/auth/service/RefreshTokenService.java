package com.repairflow.auth.service;

import com.repairflow.auth.entity.RefreshToken;
import com.repairflow.auth.repository.RefreshTokenRepository;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.security.AuthProperties;
import com.repairflow.user.entity.User;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quản lý refresh token: cấp mới, xoay vòng (rotation) và phát hiện dùng lại (reuse detection).
 *
 * <pre>
 * Đăng nhập          → token A (family F)
 * Refresh bằng A     → thu hồi A, cấp B (family F)
 * Kẻ gian dùng lại A → A đã bị thu hồi ⇒ dấu hiệu token bị đánh cắp ⇒ thu hồi toàn bộ family F
 *                      (cả B của người dùng thật) → buộc đăng nhập lại.
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final AuthProperties properties;
    private final Clock clock;

    public record IssuedToken(String rawToken, Instant expiresAt) {
    }

    public record Rotation(User user, IssuedToken newToken) {
    }

    @Transactional
    public IssuedToken issue(User user, UUID familyId, RequestMetadata metadata) {
        String raw = TokenHasher.generateToken();
        Instant expiresAt = clock.instant().plus(properties.refreshTokenTtl());
        RefreshToken token = new RefreshToken(user, TokenHasher.sha256(raw), familyId, expiresAt);
        token.setUserAgent(metadata.userAgent());
        token.setIpAddress(metadata.ipAddress());
        repository.save(token);
        return new IssuedToken(raw, expiresAt);
    }

    /**
     * noRollbackFor: khi phát hiện dùng lại, lệnh thu hồi cả family PHẢI được commit dù sau đó ném lỗi 401.
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public Rotation rotate(String rawToken, RequestMetadata metadata) {
        Instant now = clock.instant();
        RefreshToken current = repository.findForUpdate(TokenHasher.sha256(rawToken))
                .orElseThrow(RefreshTokenService::invalidSession);

        if (current.getRevokedAt() != null) {
            int revoked = repository.revokeFamily(current.getFamilyId(), now);
            log.warn("Phát hiện refresh token bị dùng lại (user {}), đã thu hồi {} token cùng phiên",
                    current.getUser().getId(), revoked);
            throw invalidSession();
        }
        if (!current.isUsable(now)) {
            throw invalidSession();
        }
        User user = current.getUser();
        if (!user.isActive()) {
            repository.revokeFamily(current.getFamilyId(), now);
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, "Tài khoản đã bị khóa");
        }

        current.setRevokedAt(now);
        IssuedToken next = issue(user, current.getFamilyId(), metadata);
        return new Rotation(user, next);
    }

    /** Đăng xuất: thu hồi cả phiên (family) của token này. Token không tồn tại → bỏ qua (idempotent). */
    @Transactional
    public void revokeSession(String rawToken) {
        repository.findByTokenHash(TokenHasher.sha256(rawToken))
                .ifPresent(t -> repository.revokeFamily(t.getFamilyId(), clock.instant()));
    }

    /** Đổi/đặt lại mật khẩu, khóa tài khoản → đăng xuất khỏi mọi thiết bị. */
    @Transactional
    public void revokeAllOfUser(Long userId) {
        repository.revokeAllOfUser(userId, clock.instant());
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại");
    }
}
