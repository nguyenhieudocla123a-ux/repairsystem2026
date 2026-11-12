package com.repairflow.config;

import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Tạo 4 tài khoản demo (mỗi vai trò một tài khoản) – CHỈ ở profile dev.
 * Mật khẩu đọc từ biến môi trường DEMO_USER_PASSWORD (không hardcode). Để trống → không tạo.
 * Chạy lại nhiều lần an toàn: tài khoản đã tồn tại thì bỏ qua (không ghi đè mật khẩu).
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private record DemoAccount(String email, String fullName, String phone, Role role) {
    }

    private static final List<DemoAccount> ACCOUNTS = List.of(
            new DemoAccount("admin@repairflow.local", "Quản Trị Viên", "0900000001", Role.ADMIN),
            new DemoAccount("staff@repairflow.local", "Lê Thu Ngân", "0900000002", Role.STAFF),
            new DemoAccount("tech@repairflow.local", "Trần Kỹ Thuật", "0900000003", Role.TECHNICIAN),
            new DemoAccount("customer@repairflow.local", "Nguyễn Văn Khách", "0900000004", Role.CUSTOMER));

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final CodeGenerator codeGenerator;

    @Value("${app.demo.password:}")
    private String demoPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(demoPassword)) {
            log.info("DEMO_USER_PASSWORD trống → bỏ qua tạo tài khoản demo");
            return;
        }
        String hash = passwordEncoder.encode(demoPassword);
        for (DemoAccount account : ACCOUNTS) {
            if (userRepository.existsByEmail(account.email())) {
                continue;
            }
            User user = userRepository.save(new User(account.email(), hash, account.fullName(), account.phone(), account.role()));
            if (account.role() == Role.CUSTOMER) {
                Customer customer = new Customer(codeGenerator.next(CodeType.CUSTOMER), account.fullName(), account.phone());
                customer.setEmail(account.email());
                customer.setUser(user);
                customerRepository.save(customer);
            }
            log.info("Đã tạo tài khoản demo {} ({})", account.email(), account.role());
        }
    }
}
