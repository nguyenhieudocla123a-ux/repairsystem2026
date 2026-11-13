package com.repairflow.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.auth.oauth.RedisAuthorizationRequestRepository;
import com.repairflow.auth.oauth.SocialLoginService;
import com.repairflow.auth.oauth.SocialLoginService.Outcome;
import com.repairflow.auth.oauth.SocialLoginService.SocialProfile;
import com.repairflow.auth.service.RequestMetadata;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.SocialProvider;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserIdentityRepository;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * Đăng nhập / đăng ký bằng Google, Facebook. Không gọi tới Google/Facebook thật: kiểm tra bước chuyển hướng
 * (URL + state lưu trong Redis), còn phần sau callback gọi thẳng {@link SocialLoginService} với thông tin giả lập.
 */
class SocialLoginIT extends ApiTestSupport {

    @LocalServerPort
    private int port;

    @Autowired
    private SocialLoginService socialLoginService;

    @Autowired
    private UserIdentityRepository identityRepository;

    @Autowired
    private RedisAuthorizationRequestRepository authorizationRequestRepository;

    @Autowired
    private StringRedisTemplate redis;

    private static SocialProfile google(String sub, String email, boolean verified) {
        return SocialLoginService.SocialProfile.from(SocialProvider.GOOGLE,
                Map.of("sub", sub, "email", email, "email_verified", verified, "name", "Khách Google"));
    }

    private ResponseEntity<JsonNode> withSignupCookie(HttpMethod method, String path, Object body, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.add(HttpHeaders.COOKIE, "rf_oauth_signup=" + token);
        }
        return rest.exchange("/api/v1" + path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    @Test
    void providersListsConfiguredClients() {
        ResponseEntity<JsonNode> res = get("/auth/oauth2/providers", null);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("providers").toString()).contains("google").contains("facebook");
    }

    @Test
    void authorizeRedirectsToGoogleAndKeepsStateInRedisOnce() throws Exception {
        HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
        HttpResponse<Void> res = client.send(HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + "/api/v1/auth/oauth2/authorize/google")).build(),
                HttpResponse.BodyHandlers.discarding());

        assertThat(res.statusCode()).isEqualTo(302);
        String location = res.headers().firstValue("Location").orElseThrow();
        assertThat(location).startsWith("https://accounts.google.com/o/oauth2/v2/auth");
        Map<String, String> query = new HashMap<>();
        Arrays.stream(URI.create(location).getRawQuery().split("&")).map(p -> p.split("=", 2))
                .forEach(kv -> query.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.UTF_8)));
        assertThat(query.get("redirect_uri")).isEqualTo("http://localhost:5173/api/v1/auth/oauth2/callback/google");
        assertThat(query.get("scope")).contains("email");
        String state = query.get("state");
        assertThat(redis.hasKey("oauth2:req:" + state)).isTrue();
        // Không tạo HttpSession (API stateless)
        assertThat(res.headers().allValues("Set-Cookie")).noneMatch(c -> c.startsWith("JSESSIONID"));

        MockHttpServletRequest callback = new MockHttpServletRequest();
        callback.setParameter("state", state);
        var stored = authorizationRequestRepository.removeAuthorizationRequest(callback, new MockHttpServletResponse());
        assertThat(stored).isNotNull();
        assertThat(stored.getState()).isEqualTo(state);
        assertThat(authorizationRequestRepository.removeAuthorizationRequest(callback, new MockHttpServletResponse()))
                .as("state chỉ dùng được một lần").isNull();
    }

    @Test
    void newGoogleUserCompletesSignupWithEmailCodeThenLogsInDirectly() {
        String sub = UUID.randomUUID().toString();
        String email = uniqueEmail("gg");

        Outcome first = socialLoginService.handle(google(sub, email, true), RequestMetadata.unknown());
        assertThat(first).isInstanceOf(Outcome.NeedsSignup.class);
        String token = ((Outcome.NeedsSignup) first).pendingToken();

        ResponseEntity<JsonNode> pending = withSignupCookie(HttpMethod.GET, "/auth/oauth2/pending", null, token);
        assertThat(pending.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pending.getBody().get("email").asText()).isEqualTo(email);
        assertThat(pending.getBody().get("provider").asText()).isEqualTo("google");

        // Gửi mã 6 số về email rồi hoàn tất
        assertThat(post("/auth/register/send-code", Map.of("email", email), null).getStatusCode()).isEqualTo(HttpStatus.OK);
        String code = mailer.lastCodeFor(email);
        String phone = uniquePhone();
        Map<String, String> body = new HashMap<>(Map.of("fullName", "Khách Google", "phone", phone,
                "verificationCode", code.equals("000000") ? "111111" : "000000"));

        ResponseEntity<JsonNode> wrong = withSignupCookie(HttpMethod.POST, "/auth/oauth2/complete", body, token);
        assertThat(wrong.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(userRepository.findByEmail(email)).isEmpty();

        body.put("verificationCode", code);
        ResponseEntity<JsonNode> done = withSignupCookie(HttpMethod.POST, "/auth/oauth2/complete", body, token);
        assertThat(done.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(done.getBody().get("user").get("role").asText()).isEqualTo("CUSTOMER");
        assertThat(done.getHeaders().get(HttpHeaders.SET_COOKIE)).anyMatch(c -> c.startsWith("rf_refresh="))
                .anyMatch(c -> c.startsWith("rf_oauth_signup=;"));

        User created = userRepository.findByEmail(email).orElseThrow();
        assertThat(created.getPasswordHash()).isNull();
        assertThat(identityRepository.findByProviderAndProviderUserId(SocialProvider.GOOGLE, sub)).isPresent();

        // Phiên đăng ký chờ đã bị xoá
        assertThat(withSignupCookie(HttpMethod.GET, "/auth/oauth2/pending", null, token).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Lần sau: đăng nhập thẳng theo liên kết
        assertThat(socialLoginService.handle(google(sub, email, true), RequestMetadata.unknown()))
                .isInstanceOf(Outcome.LoggedIn.class);
        // Tài khoản chưa có mật khẩu không đăng nhập bằng mật khẩu được
        ResponseEntity<JsonNode> pwLogin = post("/auth/login", Map.of("email", email, "password", PASSWORD), null);
        assertThat(pwLogin.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void completeWithoutPendingCookieIsRejected() {
        Map<String, String> body = Map.of("fullName", "Ai Đó", "phone", uniquePhone(), "verificationCode", "123456");

        ResponseEntity<JsonNode> res = withSignupCookie(HttpMethod.POST, "/auth/oauth2/complete", body, null);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void existingCustomerIsLinkedOnlyWhenGoogleVerifiedEmail() {
        User customer = createUser(Role.CUSTOMER);

        Outcome facebook = socialLoginService.handle(SocialLoginService.SocialProfile.from(SocialProvider.FACEBOOK,
                Map.of("id", "fb-" + UUID.randomUUID(), "email", customer.getEmail(), "name", "FB")), RequestMetadata.unknown());
        assertThat(facebook).isEqualTo(new Outcome.Failed("EMAIL_EXISTS"));

        assertThat(socialLoginService.handle(google(UUID.randomUUID().toString(), customer.getEmail(), false),
                RequestMetadata.unknown())).isEqualTo(new Outcome.Failed("EMAIL_EXISTS"));

        String sub = UUID.randomUUID().toString();
        assertThat(socialLoginService.handle(google(sub, customer.getEmail(), true), RequestMetadata.unknown()))
                .isInstanceOf(Outcome.LoggedIn.class);
        assertThat(identityRepository.findByProviderAndProviderUserId(SocialProvider.GOOGLE, sub))
                .get().extracting(i -> i.getUser().getId()).isEqualTo(customer.getId());
    }

    @Test
    void staffAccountsCannotUseSocialLogin() {
        User staff = createUser(Role.STAFF);

        assertThat(socialLoginService.handle(google(UUID.randomUUID().toString(), staff.getEmail(), true),
                RequestMetadata.unknown())).isEqualTo(new Outcome.Failed("STAFF_ACCOUNT"));
    }

    @Test
    void providerWithoutEmailIsRejected() {
        Outcome outcome = socialLoginService.handle(SocialLoginService.SocialProfile.from(SocialProvider.FACEBOOK,
                Map.of("id", "fb-" + UUID.randomUUID(), "name", "Không email")), RequestMetadata.unknown());

        assertThat(outcome).isEqualTo(new Outcome.Failed("EMAIL_REQUIRED"));
    }
}
