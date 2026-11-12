package com.repairflow.common.util;

import java.time.Clock;
import java.time.Year;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Sinh mã nghiệp vụ dễ đọc (RO-2026-000123) từ sequence PostgreSQL.
 * Sequence là nguyên tử ở mức DB nên không bao giờ trùng mã kể cả khi nhiều request tạo đồng thời
 * (khác với cách "SELECT MAX(code) + 1" dễ bị race condition).
 */
@Component
@RequiredArgsConstructor
public class CodeGenerator {

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public String next(CodeType type) {
        Long value = jdbcTemplate.queryForObject("SELECT nextval('" + type.sequenceName + "')", Long.class);
        if (type.includeYear) {
            return "%s-%d-%06d".formatted(type.prefix, Year.now(clock).getValue(), value);
        }
        return "%s-%06d".formatted(type.prefix, value);
    }

    /** Tên sequence là hằng số trong code (không nhận từ input người dùng) nên nối chuỗi SQL ở trên là an toàn. */
    public enum CodeType {
        CUSTOMER("CUS", "customer_code_seq", false),
        REPAIR_REQUEST("RQ", "repair_request_code_seq", true),
        REPAIR_ORDER("RO", "repair_order_code_seq", true),
        WARRANTY("WR", "warranty_code_seq", true),
        WARRANTY_CLAIM("WC", "warranty_claim_code_seq", true);

        private final String prefix;
        private final String sequenceName;
        private final boolean includeYear;

        CodeType(String prefix, String sequenceName, boolean includeYear) {
            this.prefix = prefix;
            this.sequenceName = sequenceName;
            this.includeYear = includeYear;
        }
    }
}
