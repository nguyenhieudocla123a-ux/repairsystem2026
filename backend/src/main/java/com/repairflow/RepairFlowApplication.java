package com.repairflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// Tắt user mặc định (mật khẩu sinh ngẫu nhiên in ra log) – xác thực sẽ dùng JWT + bảng users.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class RepairFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(RepairFlowApplication.class, args);
    }
}
