package com.repairflow.security;

import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Sinh và kiểm tra access token (JWT, HS256).
 * Claim: jti (id duy nhất – dùng cho blacklist khi logout), sub = userId, email, role, iat, exp.
 */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // HS256 yêu cầu khóa >= 256 bit

    private final SecretKey key;
    private final Duration accessTokenTtl;
    private final Clock clock;

    public JwtService(AuthProperties properties, Clock clock) {
        byte[] secret = Decoders.BASE64.decode(properties.jwtSecret());
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET phải là chuỗi base64 của ít nhất 32 byte");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.accessTokenTtl = properties.accessTokenTtl();
        this.clock = clock;
    }

    public String generateAccessToken(User user) {
        Instant now = clock.instant();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key)
                .compact();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    /**
     * Kiểm tra chữ ký + hạn dùng.
     *
     * @throws io.jsonwebtoken.ExpiredJwtException token hết hạn (filter trả mã TOKEN_EXPIRED để client refresh)
     * @throws JwtException                        token sai chữ ký / sai định dạng
     */
    public ParsedToken parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        try {
            AuthenticatedUser user = new AuthenticatedUser(
                    Long.valueOf(claims.getSubject()),
                    claims.get("email", String.class),
                    Role.valueOf(claims.get("role", String.class)));
            return new ParsedToken(user, claims.getId(), claims.getExpiration().toInstant());
        } catch (RuntimeException e) {
            throw new JwtException("Token thiếu claim hợp lệ", e);
        }
    }

    public record ParsedToken(AuthenticatedUser user, String jti, Instant expiresAt) {
    }
}
