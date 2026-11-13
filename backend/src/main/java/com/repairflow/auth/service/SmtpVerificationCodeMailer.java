package com.repairflow.auth.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.security.AuthProperties;
import java.time.Duration;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Gửi mã qua SMTP khi đã đặt MAIL_HOST. Chưa cấu hình SMTP:
 * <ul>
 *   <li>dev ({@code app.auth.log-reset-links=true}): in mã ra log để tự kiểm thử;</li>
 *   <li>môi trường khác: báo lỗi 503 rõ ràng thay vì im lặng "thành công" mà không ai nhận được mã.</li>
 * </ul>
 */
@Slf4j
@Component
public class SmtpVerificationCodeMailer implements VerificationCodeMailer {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final AuthProperties properties;
    private final boolean smtpConfigured;
    private final String mailUsername;

    public SmtpVerificationCodeMailer(ObjectProvider<JavaMailSender> mailSender, AuthProperties properties,
                                      @Value("${spring.mail.host:}") String mailHost,
                                      @Value("${spring.mail.username:}") String mailUsername) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.smtpConfigured = StringUtils.hasText(mailHost);
        this.mailUsername = mailUsername;
    }

    /**
     * Người gửi: MAIL_FROM nếu đúng định dạng ("Tên &lt;email&gt;" hoặc "email"), sai định dạng (vd. thiếu &lt; &gt;)
     * thì dùng MAIL_USERNAME – Gmail cũng chỉ cho gửi dưới tên tài khoản đã đăng nhập SMTP.
     */
    private String sender() {
        try {
            InternetAddress[] parsed = InternetAddress.parse(properties.mailFrom(), true);
            if (parsed.length == 1) {
                return properties.mailFrom();
            }
        } catch (AddressException e) {
            log.warn("MAIL_FROM không đúng định dạng \"Tên <email>\" → dùng MAIL_USERNAME làm người gửi");
        }
        return StringUtils.hasText(mailUsername) ? "RepairFlow <" + mailUsername + ">" : properties.mailFrom();
    }

    @Override
    public void sendRegistrationCode(String email, String code, Duration ttl) {
        JavaMailSender sender = smtpConfigured ? mailSender.getIfAvailable() : null;
        if (sender == null) {
            if (properties.logResetLinks()) {
                log.info("[DEV – chưa cấu hình MAIL_HOST] Mã xác nhận đăng ký cho {}: {}", email, code);
                return;
            }
            throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE,
                    "Hệ thống chưa cấu hình gửi email, vui lòng liên hệ cửa hàng");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender());
        message.setTo(email);
        message.setSubject("[RepairFlow] Mã xác nhận đăng ký: " + code);
        message.setText("""
                Xin chào,

                Mã xác nhận đăng ký tài khoản RepairFlow của bạn là: %s

                Mã có hiệu lực trong %d phút. Không chia sẻ mã này cho bất kỳ ai.
                Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.

                RepairFlow – Quản lý sửa chữa & bảo hành thiết bị
                """.formatted(code, ttl.toMinutes()));
        try {
            sender.send(message);
        } catch (MailException e) {
            // Không log nội dung thư (có mã) – chỉ loại lỗi để chẩn đoán (sai App Password, sai cổng...)
            log.error("Gửi mã xác nhận tới {} thất bại: {}", email, e.getMessage());
            throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE,
                    "Không gửi được email xác nhận, vui lòng thử lại sau");
        }
    }
}
