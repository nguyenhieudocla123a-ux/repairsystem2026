package com.repairflow.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Sinh token ngẫu nhiên (refresh token, link đặt lại mật khẩu) và băm SHA-256 để lưu DB.
 * <p>
 * Vì sao SHA-256 mà không phải BCrypt? Token có 256 bit ngẫu nhiên nên không thể dò ngược bằng từ điển
 * (khác mật khẩu người dùng đặt); SHA-256 nhanh và cho phép tra cứu trực tiếp theo hash (có index UNIQUE).
 */
public final class TokenHasher {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenHasher() {
    }

    /** 32 byte ngẫu nhiên, mã hóa base64url (không padding) → 43 ký tự an toàn cho cookie/URL. */
    public static String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }
}
