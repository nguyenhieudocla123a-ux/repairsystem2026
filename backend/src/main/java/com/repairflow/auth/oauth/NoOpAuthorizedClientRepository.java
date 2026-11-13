package com.repairflow.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

/**
 * Không lưu access token của Google/Facebook: RepairFlow chỉ cần biết "người này là ai" một lần lúc đăng nhập,
 * không gọi API của họ về sau. Mặc định Spring giữ token trong bộ nhớ → tốn RAM và giữ dữ liệu không cần thiết.
 */
public class NoOpAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    @Override
    public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String clientRegistrationId, Authentication principal,
                                                                     HttpServletRequest request) {
        return null;
    }

    @Override
    public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient, Authentication principal,
                                     HttpServletRequest request, HttpServletResponse response) {
        // cố ý không lưu
    }

    @Override
    public void removeAuthorizedClient(String clientRegistrationId, Authentication principal, HttpServletRequest request,
                                       HttpServletResponse response) {
        // không có gì để xoá
    }
}
