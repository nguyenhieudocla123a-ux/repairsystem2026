package com.repairflow.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Lớp nền cho integration test: PostgreSQL 16 + Redis 7 thật trong Docker (Testcontainers).
 * Container khai báo static và khởi động một lần → mọi test class dùng chung, chạy nhanh hơn.
 * Dùng DB thật thay vì H2 vì schema dùng tính năng riêng của PostgreSQL (partial index, pg_trgm, FOR UPDATE).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(IntegrationTestBase.MailTestConfig.class)
public abstract class IntegrationTestBase {

    /** Mailer ghi lại mã thay cho SMTP – khai báo ở lớp nền nên mọi test dùng chung một ApplicationContext. */
    @TestConfiguration
    static class MailTestConfig {
        @Bean
        @Primary
        CapturingVerificationCodeMailer capturingVerificationCodeMailer() {
            return new CapturingVerificationCodeMailer();
        }
    }

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @ServiceConnection(name = "redis")
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }
}
