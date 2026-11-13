package com.repairflow.auth.service;

import java.time.Duration;

/**
 * Cổng gửi mã xác nhận đăng ký. Tách thành interface để:
 * (1) service không phụ thuộc trực tiếp vào SMTP, (2) integration test thay bằng bản ghi lại mã thay vì gửi mail thật.
 */
public interface VerificationCodeMailer {

    void sendRegistrationCode(String email, String code, Duration ttl);
}
