package com.repairflow.auth.service;

import java.time.Duration;

/**
 * Cổng gửi email xác thực (mã đăng ký, liên kết đặt lại mật khẩu). Tách thành interface để:
 * (1) service không phụ thuộc trực tiếp vào SMTP, (2) integration test thay bằng bản ghi lại mã thay vì gửi mail thật.
 */
public interface VerificationCodeMailer {

    void sendRegistrationCode(String email, String code, Duration ttl);

    /** Gửi liên kết đặt lại mật khẩu một lần; lỗi gửi thư ném {@code BusinessException}. */
    void sendPasswordResetLink(String email, String link, Duration ttl);
}
