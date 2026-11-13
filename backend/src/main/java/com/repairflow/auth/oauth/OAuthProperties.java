package com.repairflow.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * Client ID / Secret của Google, Facebook (app.oauth.*, đọc từ biến môi trường – không hardcode).
 * Nhà cung cấp nào để trống thì coi như tắt: không đăng ký client, frontend không hiện nút.
 */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthProperties(Client google, Client facebook) {

    public record Client(String clientId, String clientSecret) {

        public boolean configured() {
            return StringUtils.hasText(clientId) && StringUtils.hasText(clientSecret);
        }
    }
}
