package com.repairflow.dashboard.repository;

import com.repairflow.dashboard.dto.DashboardDtos.AmountPoint;
import com.repairflow.dashboard.dto.DashboardDtos.LowStockPart;
import com.repairflow.dashboard.dto.DashboardDtos.PartUsageStat;
import com.repairflow.dashboard.dto.DashboardDtos.StatusCount;
import com.repairflow.dashboard.dto.DashboardDtos.TechnicianStat;
import com.repairflow.repair.entity.RepairStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Truy vấn tổng hợp cho dashboard/báo cáo bằng SQL thuần: GROUP BY, date_trunc, generate_series của PostgreSQL
 * diễn đạt gọn và chạy hiệu quả hơn nhiều so với tải entity về rồi tính trong Java.
 * Mốc thời gian: [from 00:00, to+1 00:00) theo múi giờ cửa hàng, truyền vào dưới dạng Instant (UTC).
 */
@Repository
@RequiredArgsConstructor
public class DashboardQueries {

    private static final String SHOP_TZ = "Asia/Ho_Chi_Minh";

    private final NamedParameterJdbcTemplate jdbc;

    public long countReceivedBetween(Instant start, Instant end) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE received_at >= :start AND received_at < :end",
                Map.of("start", ts(start), "end", ts(end)));
    }

    public long countCompletedBetween(Instant start, Instant end) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE completed_at >= :start AND completed_at < :end",
                Map.of("start", ts(start), "end", ts(end)));
    }

    public long countByStatuses(Collection<RepairStatus> statuses) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE status IN (:statuses)", Map.of("statuses", names(statuses)));
    }

    public long countByTechnicianAndStatuses(Long technicianId, Collection<RepairStatus> statuses) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE technician_id = :tech AND status IN (:statuses)",
                Map.of("tech", technicianId, "statuses", names(statuses)));
    }

    public long countCompletedByTechnicianSince(Long technicianId, Instant since) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE technician_id = :tech AND completed_at >= :since",
                Map.of("tech", technicianId, "since", ts(since)));
    }

    public long countByCustomerAndStatuses(Long customerId, Collection<RepairStatus> statuses) {
        return count("SELECT COUNT(*) FROM repair_orders WHERE customer_id = :cid AND status IN (:statuses)",
                Map.of("cid", customerId, "statuses", names(statuses)));
    }

    public BigDecimal revenueBetween(Instant start, Instant end) {
        BigDecimal v = jdbc.queryForObject("""
                SELECT COALESCE(SUM(final_amount), 0) FROM repair_orders
                WHERE status = 'DELIVERED' AND delivered_at >= :start AND delivered_at < :end
                """, Map.of("start", ts(start), "end", ts(end)), BigDecimal.class);
        return v == null ? BigDecimal.ZERO : v;
    }

    /** Doanh thu theo ngày/tháng; generate_series để ngày không có doanh thu vẫn hiện 0 trên biểu đồ. */
    public List<AmountPoint> revenueSeries(LocalDate from, LocalDate to, boolean monthly) {
        String unit = monthly ? "month" : "day";
        String sql = """
                WITH buckets AS (
                    SELECT generate_series(date_trunc('%1$s', CAST(:from AS date)), CAST(:to AS date), INTERVAL '1 %1$s')::date AS bucket
                )
                SELECT b.bucket, COALESCE(SUM(r.final_amount), 0) AS amount
                FROM buckets b
                LEFT JOIN repair_orders r
                       ON r.status = 'DELIVERED'
                      AND date_trunc('%1$s', r.delivered_at AT TIME ZONE '%2$s')::date = b.bucket
                GROUP BY b.bucket ORDER BY b.bucket
                """.formatted(unit, SHOP_TZ);
        return jdbc.query(sql, new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, i) -> new AmountPoint(rs.getDate("bucket").toLocalDate(), rs.getBigDecimal("amount")));
    }

    public List<StatusCount> statusDistribution() {
        return jdbc.query("SELECT status, COUNT(*) AS c FROM repair_orders GROUP BY status ORDER BY c DESC", Map.of(),
                (rs, i) -> new StatusCount(RepairStatus.valueOf(rs.getString("status")), rs.getLong("c")));
    }

    /** Linh kiện dùng nhiều nhất = Σ xuất − Σ hoàn trong khoảng thời gian. */
    public List<PartUsageStat> topParts(Instant start, Instant end, int limit) {
        return jdbc.query("""
                SELECT p.id, p.sku, p.name,
                       SUM(CASE WHEN t.type = 'EXPORT' THEN t.quantity ELSE -t.quantity END) AS used
                FROM inventory_transactions t JOIN parts p ON p.id = t.part_id
                WHERE t.type IN ('EXPORT', 'RETURN') AND t.created_at >= :start AND t.created_at < :end
                GROUP BY p.id, p.sku, p.name
                HAVING SUM(CASE WHEN t.type = 'EXPORT' THEN t.quantity ELSE -t.quantity END) > 0
                ORDER BY used DESC LIMIT :limit
                """, Map.of("start", ts(start), "end", ts(end), "limit", limit),
                (rs, i) -> new PartUsageStat(rs.getLong("id"), rs.getString("sku"), rs.getString("name"), rs.getLong("used")));
    }

    public List<LowStockPart> lowStockParts(int limit) {
        return jdbc.query("""
                SELECT id, sku, name, quantity_on_hand, min_stock_level FROM parts
                WHERE active AND quantity_on_hand <= min_stock_level
                ORDER BY quantity_on_hand ASC, name LIMIT :limit
                """, Map.of("limit", limit),
                (rs, i) -> new LowStockPart(rs.getLong("id"), rs.getString("sku"), rs.getString("name"),
                        rs.getInt("quantity_on_hand"), rs.getInt("min_stock_level")));
    }

    /** Hiệu suất KTV: số phiếu hoàn thành trong kỳ, số đang xử lý, thời gian trung bình tiếp nhận → hoàn thành (giờ). */
    public List<TechnicianStat> technicianPerformance(Instant start, Instant end) {
        return jdbc.query("""
                SELECT u.id, u.full_name,
                       COUNT(r.id) FILTER (WHERE r.completed_at >= :start AND r.completed_at < :end) AS completed,
                       COUNT(r.id) FILTER (WHERE r.status IN ('RECEIVED','INSPECTING','WAITING_CONFIRMATION','APPROVED','WAITING_FOR_PARTS','REPAIRING')) AS active,
                       AVG(EXTRACT(EPOCH FROM (r.completed_at - r.received_at)) / 3600.0)
                           FILTER (WHERE r.completed_at >= :start AND r.completed_at < :end) AS avg_hours
                FROM users u LEFT JOIN repair_orders r ON r.technician_id = u.id
                WHERE u.role = 'TECHNICIAN' AND u.status = 'ACTIVE'
                GROUP BY u.id, u.full_name
                ORDER BY completed DESC, u.full_name
                """, Map.of("start", ts(start), "end", ts(end)),
                (rs, i) -> new TechnicianStat(rs.getLong("id"), rs.getString("full_name"), rs.getLong("completed"),
                        rs.getLong("active"), rs.getObject("avg_hours") == null ? null
                        : Math.round(rs.getDouble("avg_hours") * 10) / 10.0));
    }

    private long count(String sql, Map<String, ?> params) {
        Long v = jdbc.queryForObject(sql, params, Long.class);
        return v == null ? 0 : v;
    }

    private static java.sql.Timestamp ts(Instant instant) {
        return java.sql.Timestamp.from(instant);
    }

    private static List<String> names(Collection<RepairStatus> statuses) {
        return statuses.stream().map(Enum::name).toList();
    }
}
