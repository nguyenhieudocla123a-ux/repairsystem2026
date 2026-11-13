package com.repairflow.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.Duration;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Lưu yêu cầu xác thực OAuth2 (state, redirect_uri, PKCE…) giữa lúc chuyển sang Google/Facebook và lúc quay về,
 * trong Redis theo khoá {@code state} – thay cho HttpSession mặc định vì API chạy stateless (nhiều instance dùng chung).
 * <ul>
 *   <li>TTL 10 phút; đọc là xoá (getAndDelete) → mỗi state chỉ dùng một lần, chống phát lại callback.</li>
 *   <li>Dữ liệu do chính server ghi (khoá suy từ state ngẫu nhiên); vẫn giới hạn lớp được giải tuần tự hoá
 *       bằng ObjectInputFilter để phòng thủ nhiều lớp.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String KEY = "oauth2:req:";
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final ObjectInputFilter FILTER = ObjectInputFilter.Config.createFilter(
            "org.springframework.security.oauth2.core.**;org.springframework.security.oauth2.core.endpoint.*;"
                    + "java.util.*;java.lang.*;maxdepth=10;!*");

    private final StringRedisTemplate redis;

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        String state = request.getParameter(OAuth2ParameterNames.STATE);
        if (!StringUtils.hasText(state)) {
            return null;
        }
        return deserialize(redis.opsForValue().get(KEY + state));
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request,
                                         HttpServletResponse response) {
        if (authorizationRequest == null) {
            return;
        }
        redis.opsForValue().set(KEY + authorizationRequest.getState(), serialize(authorizationRequest), TTL);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        String state = request.getParameter(OAuth2ParameterNames.STATE);
        if (!StringUtils.hasText(state)) {
            return null;
        }
        return deserialize(redis.opsForValue().getAndDelete(KEY + state));
    }

    private static String serialize(OAuth2AuthorizationRequest value) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(value);
        } catch (IOException e) {
            throw new IllegalStateException("Không lưu được yêu cầu OAuth2", e);
        }
        return Base64.getEncoder().encodeToString(bytes.toByteArray());
    }

    private static OAuth2AuthorizationRequest deserialize(String value) {
        if (value == null) {
            return null;
        }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(value)))) {
            in.setObjectInputFilter(FILTER);
            return (OAuth2AuthorizationRequest) in.readObject();
        } catch (IOException | ClassNotFoundException | ClassCastException | IllegalArgumentException e) {
            log.warn("Yêu cầu OAuth2 trong Redis không hợp lệ: {}", e.getMessage());
            return null;
        }
    }
}
