package com.repairflow.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.auth.entity.PasswordResetToken;
import com.repairflow.auth.repository.PasswordResetTokenRepository;
import com.repairflow.common.util.TokenHasher;
import com.repairflow.support.IntegrationTestBase;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Luồng xác thực end-to-end qua HTTP thật (PostgreSQL + Redis bằng Testcontainers).
 * Mỗi test dùng email/SĐT ngẫu nhiên nên không phụ thuộc thứ tự chạy.
 */
class AuthFlowIT extends IntegrationTestBase {

    private static final String PASSWORD = "Passw0rd!";

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.auth.jwt-secret}")
    private String jwtSecret;

    // ---------- helpers ----------

    private ResponseEntity<JsonNode> call(HttpMethod method, String path, Object body, String token, String cookie) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        if (cookie != null) {
            headers.add(HttpHeaders.COOKIE, "rf_refresh=" + cookie);
        }
        return rest.exchange("/api/v1" + path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static String refreshCookie(ResponseEntity<?> response) {
        List<String> cookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotNull();
        String cookie = cookies.stream().filter(c -> c.startsWith("rf_refresh=")).findFirst().orElseThrow();
        return cookie.substring("rf_refresh=".length(), cookie.indexOf(';'));
    }

    private static String uniquePhone() {
        return "09" + String.format("%08d", Math.floorMod(UUID.randomUUID().getMostSignificantBits(), 100_000_000L));
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
    }

    private Map<String, String> registerBody(String email) {
        return Map.of("fullName", "Khách Test", "email", email, "phone", uniquePhone(), "password", PASSWORD);
    }

    private User createUser(Role role) {
        return userRepository.save(new User(uniqueEmail(role.name().toLowerCase()), passwordEncoder.encode(PASSWORD),
                "User " + role, null, role));
    }

    private ResponseEntity<JsonNode> login(String email, String password) {
        return call(HttpMethod.POST, "/auth/login", Map.of("email", email, "password", password), null, null);
    }

    private String accessTokenOf(User user) {
        return login(user.getEmail(), PASSWORD).getBody().get("accessToken").asText();
    }

    // ---------- tests ----------

    @Nested
    class Registration {

        @Test
        void registerCreatesCustomerAndSetsSecureCookie() {
            ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/auth/register", registerBody(uniqueEmail("reg")), null, null);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            JsonNode body = res.getBody();
            assertThat(body.get("accessToken").asText()).isNotBlank();
            assertThat(body.get("user").get("role").asText()).isEqualTo("CUSTOMER");
            assertThat(body.get("user").get("customerId").isNumber()).isTrue();
            assertThat(body.toString()).doesNotContain("password").doesNotContain("rf_refresh");

            String setCookie = res.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
            assertThat(setCookie).contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api/v1/auth");
        }

        @Test
        void weakPasswordReturnsFieldErrors() {
            Map<String, String> body = Map.of("fullName", "A B", "email", uniqueEmail("weak"), "phone", uniquePhone(),
                    "password", "abc");

            ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/auth/register", body, null, null);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(res.getBody().get("code").asText()).isEqualTo("VALIDATION_FAILED");
            assertThat(res.getBody().get("fieldErrors").findValuesAsText("field")).contains("password");
        }

        @Test
        void duplicatePhoneIsRejected() {
            Map<String, String> first = registerBody(uniqueEmail("dup1"));
            call(HttpMethod.POST, "/auth/register", first, null, null);
            Map<String, String> second = Map.of("fullName", "Người khác", "email", uniqueEmail("dup2"),
                    "phone", first.get("phone"), "password", PASSWORD);

            ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/auth/register", second, null, null);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(res.getBody().get("code").asText()).isEqualTo("DUPLICATE_RESOURCE");
        }
    }

    @Nested
    class Login {

        @Test
        void wrongPasswordAndUnknownEmailGiveSameError() {
            User user = createUser(Role.STAFF);

            ResponseEntity<JsonNode> wrongPassword = login(user.getEmail(), "Wrong123");
            ResponseEntity<JsonNode> unknownEmail = login(uniqueEmail("nobody"), "Wrong123");

            assertThat(wrongPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(wrongPassword.getBody().get("code").asText()).isEqualTo("INVALID_CREDENTIALS");
            assertThat(unknownEmail.getBody().get("message")).isEqualTo(wrongPassword.getBody().get("message"));
        }

        @Test
        void emailIsCaseInsensitive() {
            User user = createUser(Role.STAFF);
            assertThat(login(user.getEmail().toUpperCase(), PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        void tooManyFailuresAreRateLimited() {
            User user = createUser(Role.STAFF);
            for (int i = 0; i < 5; i++) {
                login(user.getEmail(), "Wrong123");
            }

            ResponseEntity<JsonNode> blocked = login(user.getEmail(), PASSWORD);

            assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    @Nested
    class Session {

        @Test
        void refreshRotatesTokenAndReuseRevokesWholeSession() {
            ResponseEntity<JsonNode> registered = call(HttpMethod.POST, "/auth/register", registerBody(uniqueEmail("rot")), null, null);
            String first = refreshCookie(registered);

            ResponseEntity<JsonNode> refreshed = call(HttpMethod.POST, "/auth/refresh", null, null, first);
            assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(refreshed.getBody().get("accessToken").asText()).isNotBlank();
            String second = refreshCookie(refreshed);
            assertThat(second).isNotEqualTo(first);

            // Dùng lại token cũ → bị từ chối VÀ token mới cũng bị thu hồi (reuse detection)
            assertThat(call(HttpMethod.POST, "/auth/refresh", null, null, first).getStatusCode())
                    .isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(call(HttpMethod.POST, "/auth/refresh", null, null, second).getStatusCode())
                    .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        @Test
        void logoutBlacklistsAccessTokenAndRevokesRefreshToken() {
            ResponseEntity<JsonNode> registered = call(HttpMethod.POST, "/auth/register", registerBody(uniqueEmail("out")), null, null);
            String access = registered.getBody().get("accessToken").asText();
            String refresh = refreshCookie(registered);
            assertThat(call(HttpMethod.GET, "/auth/me", null, access, null).getStatusCode()).isEqualTo(HttpStatus.OK);

            ResponseEntity<JsonNode> logout = call(HttpMethod.POST, "/auth/logout", null, access, refresh);

            assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
            assertThat(logout.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
            assertThat(call(HttpMethod.GET, "/auth/me", null, access, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(call(HttpMethod.POST, "/auth/refresh", null, null, refresh).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        @Test
        void expiredAccessTokenReturnsTokenExpiredCode() {
            var key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
            Instant past = Instant.now().minus(Duration.ofHours(1));
            String expired = Jwts.builder().id("x").subject("1").claim("email", "a@b.c").claim("role", "ADMIN")
                    .issuedAt(Date.from(past)).expiration(Date.from(past.plusSeconds(60))).signWith(key).compact();

            ResponseEntity<JsonNode> res = call(HttpMethod.GET, "/auth/me", null, expired, null);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(res.getBody().get("code").asText()).isEqualTo("TOKEN_EXPIRED");
        }

        @Test
        void garbageTokenReturnsUnauthorized() {
            ResponseEntity<JsonNode> res = call(HttpMethod.GET, "/auth/me", null, "not-a-jwt", null);
            assertThat(res.getBody().get("code").asText()).isEqualTo("UNAUTHORIZED");
        }

        @Test
        void changePasswordRevokesOtherSessions() {
            User user = createUser(Role.TECHNICIAN);
            ResponseEntity<JsonNode> deviceA = login(user.getEmail(), PASSWORD);
            ResponseEntity<JsonNode> deviceB = login(user.getEmail(), PASSWORD);
            String tokenB = deviceB.getBody().get("accessToken").asText();

            ResponseEntity<JsonNode> changed = call(HttpMethod.PUT, "/auth/me/password",
                    Map.of("currentPassword", PASSWORD, "newPassword", "NewPassw0rd"), tokenB, null);

            assertThat(changed.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(call(HttpMethod.POST, "/auth/refresh", null, null, refreshCookie(deviceA)).getStatusCode())
                    .isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(call(HttpMethod.POST, "/auth/refresh", null, null, refreshCookie(changed)).getStatusCode())
                    .isEqualTo(HttpStatus.OK);
            assertThat(login(user.getEmail(), "NewPassw0rd").getStatusCode()).isEqualTo(HttpStatus.OK);
        }
    }

    @Nested
    class PasswordReset {

        @Test
        void forgotPasswordDoesNotRevealWhetherEmailExists() {
            ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/auth/forgot-password",
                    Map.of("email", uniqueEmail("ghost")), null, null);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        }

        @Test
        void resetWithValidTokenChangesPasswordOnce() {
            User user = createUser(Role.STAFF);
            String raw = TokenHasher.generateToken();
            resetTokenRepository.save(new PasswordResetToken(user, TokenHasher.sha256(raw), Instant.now().plusSeconds(600)));
            Map<String, String> body = Map.of("token", raw, "newPassword", "Reset123abc");

            assertThat(call(HttpMethod.POST, "/auth/reset-password", body, null, null).getStatusCode())
                    .isEqualTo(HttpStatus.NO_CONTENT);
            assertThat(login(user.getEmail(), "Reset123abc").getStatusCode()).isEqualTo(HttpStatus.OK);
            // Link chỉ dùng được một lần
            assertThat(call(HttpMethod.POST, "/auth/reset-password", body, null, null).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    class Authorization {

        @Test
        void customerCannotAccessAdminApi() {
            ResponseEntity<JsonNode> registered = call(HttpMethod.POST, "/auth/register", registerBody(uniqueEmail("rbac")), null, null);
            String customerToken = registered.getBody().get("accessToken").asText();

            ResponseEntity<JsonNode> res = call(HttpMethod.GET, "/users", null, customerToken, null);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(res.getBody().get("code").asText()).isEqualTo("ACCESS_DENIED");
        }

        @Test
        void staffCanListTechniciansButNotUsers() {
            String staffToken = accessTokenOf(createUser(Role.STAFF));

            assertThat(call(HttpMethod.GET, "/users/technicians", null, staffToken, null).getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(call(HttpMethod.GET, "/users", null, staffToken, null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }

        @Test
        void adminManagesUsersAndLockedUserCannotLogin() {
            User admin = createUser(Role.ADMIN);
            String adminToken = accessTokenOf(admin);
            String staffEmail = uniqueEmail("newstaff");

            ResponseEntity<JsonNode> created = call(HttpMethod.POST, "/users", Map.of("email", staffEmail,
                    "fullName", "Nhân viên mới", "role", "STAFF", "password", PASSWORD), adminToken, null);
            assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            long staffId = created.getBody().get("id").asLong();

            ResponseEntity<JsonNode> page = call(HttpMethod.GET, "/users?role=STAFF,TECHNICIAN&q=newstaff&sort=fullName,asc",
                    null, adminToken, null);
            assertThat(page.getBody().get("totalElements").asLong()).isGreaterThanOrEqualTo(1);

            call(HttpMethod.PATCH, "/users/" + staffId + "/status", Map.of("status", "LOCKED"), adminToken, null);
            ResponseEntity<JsonNode> lockedLogin = login(staffEmail, PASSWORD);
            assertThat(lockedLogin.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(lockedLogin.getBody().get("code").asText()).isEqualTo("ACCOUNT_LOCKED");
        }

        @Test
        void adminCannotLockThemselvesOrSortByPassword() {
            User admin = createUser(Role.ADMIN);
            String adminToken = accessTokenOf(admin);

            assertThat(call(HttpMethod.PATCH, "/users/" + admin.getId() + "/status", Map.of("status", "LOCKED"),
                    adminToken, null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(call(HttpMethod.GET, "/users?sort=passwordHash", null, adminToken, null).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        void adminCannotCreateCustomerAccountsDirectly() {
            String adminToken = accessTokenOf(createUser(Role.ADMIN));
            ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/users", Map.of("email", uniqueEmail("c"),
                    "fullName", "Khách", "role", "CUSTOMER", "password", PASSWORD), adminToken, null);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }
}
