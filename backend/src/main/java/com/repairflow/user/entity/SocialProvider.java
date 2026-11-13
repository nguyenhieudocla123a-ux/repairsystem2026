package com.repairflow.user.entity;

import java.util.Locale;
import java.util.Optional;

/** Nhà cung cấp đăng nhập mạng xã hội. registrationId (Spring OAuth2) = tên viết thường. */
public enum SocialProvider {
    GOOGLE,
    FACEBOOK;

    public String registrationId() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<SocialProvider> fromRegistrationId(String registrationId) {
        for (SocialProvider p : values()) {
            if (p.registrationId().equals(registrationId)) {
                return Optional.of(p);
            }
        }
        return Optional.empty();
    }
}
