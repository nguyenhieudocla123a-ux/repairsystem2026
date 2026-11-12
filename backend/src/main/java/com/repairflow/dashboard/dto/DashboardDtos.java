package com.repairflow.dashboard.dto;

import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.entity.RepairStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** DTO dashboard & báo cáo – docs/api-specification.md §12. */
public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record AmountPoint(LocalDate date, BigDecimal amount) {
    }

    public record StatusCount(RepairStatus status, long count) {
    }

    public record PartUsageStat(Long partId, String sku, String partName, long quantity) {
    }

    public record LowStockPart(Long id, String sku, String name, int quantityOnHand, int minStockLevel) {
    }

    public record TechnicianStat(Long technicianId, String fullName, long completedCount, long activeCount,
                                 Double avgHoursToComplete) {
    }

    /** Được cache Redis (TD-17) → record thuần, serialize/deserialize bằng Jackson có kiểu cố định. */
    public record AdminDashboardResponse(LocalDate from, LocalDate to, long totalOrders, long inProgressOrders,
                                         long completedOrders, BigDecimal revenue, List<AmountPoint> revenueSeries,
                                         List<StatusCount> statusDistribution, List<PartUsageStat> topParts,
                                         List<LowStockPart> lowStockParts) {
    }

    public record StaffDashboardResponse(long newOrders, long pendingRequests, long waitingConfirmation,
                                         long readyForDelivery, long openWarrantyClaims,
                                         List<RepairOrderSummaryResponse> todo) {
    }

    public record TechnicianDashboardResponse(long assigned, long inProgress, long completedThisMonth,
                                              List<RepairOrderSummaryResponse> priorityTasks) {
    }

    public record CustomerDashboardResponse(long deviceCount, long activeOrders, long pendingQuotations,
                                            long activeWarranties, List<RepairOrderSummaryResponse> activeOrderList) {
    }
}
