package com.repairflow.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Danh sách origin được phép gọi API, cấu hình qua biến môi trường CORS_ALLOWED_ORIGINS (phân tách dấu phẩy). */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
