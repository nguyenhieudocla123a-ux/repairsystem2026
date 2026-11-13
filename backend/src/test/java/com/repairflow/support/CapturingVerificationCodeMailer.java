package com.repairflow.support;

import com.repairflow.auth.service.VerificationCodeMailer;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thay SMTP trong integration test: ghi lại mã cuối cùng gửi tới mỗi email để test đọc ra và đăng ký
 * như người dùng thật (đi đúng luồng gửi mã → nhập mã, không bỏ qua bước xác minh).
 */
public class CapturingVerificationCodeMailer implements VerificationCodeMailer {

    private final Map<String, String> lastCodes = new ConcurrentHashMap<>();

    @Override
    public void sendRegistrationCode(String email, String code, Duration ttl) {
        lastCodes.put(email, code);
    }

    public String lastCodeFor(String email) {
        String code = lastCodes.get(email.trim().toLowerCase());
        if (code == null) {
            throw new IllegalStateException("Chưa gửi mã nào tới " + email);
        }
        return code;
    }
}
