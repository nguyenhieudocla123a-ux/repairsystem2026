package com.repairflow.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Helper gọi API thật qua HTTP cho integration test (tạo user, đăng nhập, gọi endpoint với token). */
public abstract class ApiTestSupport extends IntegrationTestBase {

    protected static final String PASSWORD = "Passw0rd!";

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected ResponseEntity<JsonNode> call(HttpMethod method, String path, Object body, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange("/api/v1" + path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    protected ResponseEntity<JsonNode> get(String path, String token) {
        return call(HttpMethod.GET, path, null, token);
    }

    protected ResponseEntity<JsonNode> post(String path, Object body, String token) {
        return call(HttpMethod.POST, path, body, token);
    }

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected static String uniqueEmail(String prefix) {
        return unique(prefix) + "@test.local";
    }

    protected static String uniquePhone() {
        return "09" + String.format("%08d", Math.floorMod(UUID.randomUUID().getMostSignificantBits(), 100_000_000L));
    }

    protected User createUser(Role role) {
        return userRepository.save(new User(uniqueEmail(role.name().toLowerCase()), passwordEncoder.encode(PASSWORD),
                "User " + role, null, role));
    }

    protected String tokenOf(User user) {
        return login(user.getEmail());
    }

    protected String login(String email) {
        ResponseEntity<JsonNode> res = call(HttpMethod.POST, "/auth/login", Map.of("email", email, "password", PASSWORD), null);
        return res.getBody().get("accessToken").asText();
    }

    /** Đăng ký khách hàng tự phục vụ, trả về access token. */
    protected String registerCustomer() {
        Map<String, String> body = Map.of("fullName", "Khách Test", "email", uniqueEmail("cus"), "phone", uniquePhone(),
                "password", PASSWORD);
        return post("/auth/register", body, null).getBody().get("accessToken").asText();
    }
}
