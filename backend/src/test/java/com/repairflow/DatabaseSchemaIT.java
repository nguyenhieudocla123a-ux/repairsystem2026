package com.repairflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.support.IntegrationTestBase;
import java.time.Year;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Kiểm tra Mốc 2: Flyway chạy đủ migration, Hibernate validate khớp schema (nếu lệch, context không khởi động
 * được và mọi test ở đây đều fail), và các ràng buộc quan trọng ở DB hoạt động đúng.
 */
class DatabaseSchemaIT extends IntegrationTestBase {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CodeGenerator codeGenerator;

    @Test
    void allMigrationsAreApplied() {
        List<String> versions = java.util.Arrays.stream(flyway.info().applied())
                .map(m -> m.getVersion().getVersion())
                .toList();
        assertThat(versions).containsExactly("1", "2", "3", "4", "5", "6");
        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    void stockCannotBeNegative() {
        jdbc.update("INSERT INTO parts (sku, name, quantity_on_hand) VALUES ('TEST-NEG', 'Test part', 1)");

        assertThatThrownBy(() -> jdbc.update("UPDATE parts SET quantity_on_hand = -1 WHERE sku = 'TEST-NEG'"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_parts_quantity_non_negative");
    }

    @Test
    void onlyOneSentQuotationPerRepairOrder() {
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES ('quote-test@repairflow.local', 'x', 'Staff', 'STAFF') RETURNING id""", Long.class);
        Long customerId = jdbc.queryForObject(
                "INSERT INTO customers (code, full_name, phone) VALUES ('CUS-T1', 'KH', '0999000001') RETURNING id",
                Long.class);
        Long deviceId = jdbc.queryForObject(
                "INSERT INTO devices (customer_id, name, device_type) VALUES (?, 'Phone', 'PHONE') RETURNING id",
                Long.class, customerId);
        Long orderId = jdbc.queryForObject("""
                INSERT INTO repair_orders (code, customer_id, device_id, created_by, reported_issue)
                VALUES ('RO-T1', ?, ?, ?, 'Hỏng màn hình') RETURNING id""", Long.class, customerId, deviceId, userId);

        String insertSent = "INSERT INTO quotations (repair_order_id, version_no, status, created_by) VALUES (?, ?, 'SENT', ?)";
        jdbc.update(insertSent, orderId, 1, userId);

        assertThatThrownBy(() -> jdbc.update(insertSent, orderId, 2, userId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uk_quotations_one_sent_per_order");
    }

    @Test
    void serialNumberIsUniqueIgnoringCase() {
        Long customerId = jdbc.queryForObject(
                "INSERT INTO customers (code, full_name, phone) VALUES ('CUS-T2', 'KH2', '0999000002') RETURNING id",
                Long.class);
        String insert = "INSERT INTO devices (customer_id, name, device_type, serial_number) VALUES (?, 'D', 'PHONE', ?)";
        jdbc.update(insert, customerId, "abc123");

        assertThatThrownBy(() -> jdbc.update(insert, customerId, "ABC123"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void generatedCodesAreUniqueUnderConcurrency() throws Exception {
        Set<String> codes = ConcurrentHashMap.newKeySet();
        var pool = Executors.newFixedThreadPool(8);
        IntStream.range(0, 50).forEach(i -> pool.submit(() -> codes.add(codeGenerator.next(CodeType.REPAIR_ORDER))));
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(codes).hasSize(50);
        assertThat(codes).allMatch(c -> c.matches("RO-" + Year.now().getValue() + "-\\d{6}"));
    }
}
