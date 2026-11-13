package com.repairflow.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.repairflow.auth.entity.RefreshToken;
import com.repairflow.auth.repository.RefreshTokenRepository;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.security.AuthProperties;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.entity.UserStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-12T03:00:00Z");
    private static final UUID FAMILY = UUID.randomUUID();
    private static final String RAW = "raw-refresh-token";

    @Mock
    private RefreshTokenRepository repository;

    private RefreshTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        AuthProperties props = new AuthProperties("unused", Duration.ofMinutes(15), Duration.ofDays(7), false, 5,
                Duration.ofMinutes(15), Duration.ofMinutes(30), "http://localhost", false,
                Duration.ofMinutes(10), 10, "no-reply@test.local");
        service = new RefreshTokenService(repository, props, Clock.fixed(NOW, ZoneOffset.UTC));
        user = new User("a@test.local", "hash", "A", null, Role.CUSTOMER);
    }

    private RefreshToken stored(Instant expiresAt, Instant revokedAt) {
        RefreshToken token = new RefreshToken(user, TokenHasher.sha256(RAW), FAMILY, expiresAt);
        token.setRevokedAt(revokedAt);
        when(repository.findForUpdate(TokenHasher.sha256(RAW))).thenReturn(Optional.of(token));
        return token;
    }

    @Test
    void rotateRevokesCurrentAndIssuesNewTokenInSameFamily() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)), null);
        when(repository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshTokenService.Rotation rotation = service.rotate(RAW, RequestMetadata.unknown());

        assertThat(current.getRevokedAt()).isEqualTo(NOW);
        assertThat(rotation.user()).isSameAs(user);
        assertThat(rotation.newToken().rawToken()).isNotEqualTo(RAW);
        assertThat(rotation.newToken().expiresAt()).isEqualTo(NOW.plus(Duration.ofDays(7)));
        verify(repository).save(org.mockito.ArgumentMatchers.argThat(t -> t.getFamilyId().equals(FAMILY)));
    }

    @Test
    void reusingRevokedTokenRevokesWholeFamily() {
        stored(NOW.plus(Duration.ofDays(1)), NOW.minus(Duration.ofMinutes(5)));

        assertThatThrownBy(() -> service.rotate(RAW, RequestMetadata.unknown()))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
        verify(repository).revokeFamily(FAMILY, NOW);
        verify(repository, never()).save(any());
    }

    @Test
    void expiredTokenIsRejected() {
        stored(NOW.minus(Duration.ofSeconds(1)), null);

        assertThatThrownBy(() -> service.rotate(RAW, RequestMetadata.unknown())).isInstanceOf(BusinessException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void lockedUserCannotRefresh() {
        user.setStatus(UserStatus.LOCKED);
        stored(NOW.plus(Duration.ofDays(1)), null);

        assertThatThrownBy(() -> service.rotate(RAW, RequestMetadata.unknown()))
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ACCOUNT_LOCKED);
        verify(repository).revokeFamily(FAMILY, NOW);
    }

    @Test
    void unknownTokenIsRejected() {
        when(repository.findForUpdate(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("nope", RequestMetadata.unknown())).isInstanceOf(BusinessException.class);
    }
}
