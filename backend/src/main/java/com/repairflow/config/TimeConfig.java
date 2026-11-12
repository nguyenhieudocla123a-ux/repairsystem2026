package com.repairflow.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Inject {@link Clock} thay vì gọi trực tiếp now() → test có thể cố định thời gian (VD kiểm tra hết hạn bảo hành). */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
