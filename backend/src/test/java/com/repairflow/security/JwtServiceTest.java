package com.repairflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private static final String SECRET = "dGVzdC1vbmx5LXNlY3JldC1rZXktZm9yLXJlcGFpcmZsb3ctaW50ZWdyYXRpb24tdGVzdHM=";
    private static final Instant NOW = Instant.parse("2026-11-12T03:00:00Z");

    private static AuthProperties props(String secret) {
        return new AuthProperties(secret, Duration.ofMinutes(15), Duration.ofDays(7), false, 5,
                Duration.ofMinutes(15), Duration.ofMinutes(30), "http://localhost:5173", false);
    }

    private static JwtService serviceAt(Instant instant) {
        return new JwtService(props(SECRET), Clock.fixed(instant, ZoneOffset.UTC));
    }

    private static User user() {
        User user = new User("Tech@RepairFlow.local", "hash", "KTV", null, Role.TECHNICIAN);
        ReflectionTestUtils.setField(user, "id", 42L);
        return user;
    }

    @Test
    void generatedTokenCarriesUserClaims() {
        JwtService service = serviceAt(NOW);

        JwtService.ParsedToken parsed = service.parse(service.generateAccessToken(user()));

        assertThat(parsed.user()).isEqualTo(new AuthenticatedUser(42L, "tech@repairflow.local", Role.TECHNICIAN));
        assertThat(parsed.jti()).isNotBlank();
        assertThat(parsed.expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(15)));
    }

    @Test
    void eachTokenHasUniqueId() {
        JwtService service = serviceAt(NOW);
        String a = service.generateAccessToken(user());
        String b = service.generateAccessToken(user());

        assertThat(service.parse(a).jti()).isNotEqualTo(service.parse(b).jti());
    }

    @Test
    void expiredTokenIsRejectedWithExpiredException() {
        String token = serviceAt(NOW).generateAccessToken(user());

        JwtService sixteenMinutesLater = serviceAt(NOW.plus(Duration.ofMinutes(16)));

        assertThatThrownBy(() -> sixteenMinutesLater.parse(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService service = serviceAt(NOW);
        String token = service.generateAccessToken(user());
        String tampered = token.substring(0, token.length() - 4) + "abcd";

        assertThatThrownBy(() -> service.parse(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String otherSecret = "YW5vdGhlci1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2gtZm9yLWhzMjU2LXNpZ25pbmc=";
        String foreign = new JwtService(props(otherSecret), Clock.fixed(NOW, ZoneOffset.UTC)).generateAccessToken(user());

        assertThatThrownBy(() -> serviceAt(NOW).parse(foreign)).isInstanceOf(JwtException.class);
    }

    @Test
    void weakSecretFailsFast() {
        assertThatThrownBy(() -> new JwtService(props("c2hvcnQ="), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 byte");
    }
}
