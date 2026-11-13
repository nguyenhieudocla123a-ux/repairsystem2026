package com.repairflow.auth.oauth;

import com.repairflow.security.AuthProperties;
import com.repairflow.user.entity.SocialProvider;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

/**
 * Đăng ký client OAuth2 từ biến môi trường. Tự dựng repository (thay vì spring.security.oauth2.client.registration.*)
 * để nhà cung cấp chưa cấu hình được bỏ qua êm thay vì làm app không khởi động được.
 *
 * <p>redirect-uri đi qua origin của frontend ({@code FRONTEND_URL}/api/v1/auth/oauth2/callback/{id}) – dev qua proxy
 * của Vite, production qua nginx – nên cookie phiên đặt cùng site với ứng dụng và chỉ cần khai báo MỘT URI ở Google/Meta.
 */
@Configuration
public class OAuthClientConfig {

    public static final String AUTHORIZE_BASE_URI = "/api/v1/auth/oauth2/authorize";
    public static final String CALLBACK_BASE_URI = "/api/v1/auth/oauth2/callback/*";
    private static final String FACEBOOK_API = "v21.0";

    @Bean
    public SocialClientRegistrations clientRegistrationRepository(OAuthProperties oauth, AuthProperties auth) {
        String redirectUri = auth.frontendUrl() + "/api/v1/auth/oauth2/callback/{registrationId}";
        Map<String, ClientRegistration> registrations = new LinkedHashMap<>();
        if (oauth.google() != null && oauth.google().configured()) {
            registrations.put(SocialProvider.GOOGLE.registrationId(), CommonOAuth2Provider.GOOGLE
                    .getBuilder(SocialProvider.GOOGLE.registrationId())
                    .clientId(oauth.google().clientId())
                    .clientSecret(oauth.google().clientSecret())
                    .redirectUri(redirectUri)
                    .scope("openid", "profile", "email")
                    .build());
        }
        if (oauth.facebook() != null && oauth.facebook().configured()) {
            registrations.put(SocialProvider.FACEBOOK.registrationId(), CommonOAuth2Provider.FACEBOOK
                    .getBuilder(SocialProvider.FACEBOOK.registrationId())
                    .clientId(oauth.facebook().clientId())
                    .clientSecret(oauth.facebook().clientSecret())
                    // Spring mặc định trỏ Graph API v2.8 (đã ngừng hỗ trợ) → ghim phiên bản hiện hành
                    .authorizationUri("https://www.facebook.com/" + FACEBOOK_API + "/dialog/oauth")
                    .tokenUri("https://graph.facebook.com/" + FACEBOOK_API + "/oauth/access_token")
                    .userInfoUri("https://graph.facebook.com/" + FACEBOOK_API + "/me?fields=id,name,email")
                    .redirectUri(redirectUri)
                    .scope("public_profile", "email")
                    .build());
        }
        return new SocialClientRegistrations(Map.copyOf(registrations), List.copyOf(registrations.keySet()));
    }

    /** Repository chỉ đọc; {@link #enabled()} cho biết nhà cung cấp nào đang bật (để hiện nút ở frontend). */
    public record SocialClientRegistrations(Map<String, ClientRegistration> byId, List<String> enabled)
            implements ClientRegistrationRepository {

        @Override
        public ClientRegistration findByRegistrationId(String registrationId) {
            return byId.get(registrationId);
        }

        public boolean isEmpty() {
            return byId.isEmpty();
        }
    }
}
