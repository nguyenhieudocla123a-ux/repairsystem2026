package com.repairflow.dashboard.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.config.CacheConfig;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.dashboard.dto.DashboardDtos.AdminDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.AmountPoint;
import com.repairflow.dashboard.dto.DashboardDtos.CustomerDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.PartUsageStat;
import com.repairflow.dashboard.dto.DashboardDtos.StaffDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.TechnicianDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.TechnicianStat;
import com.repairflow.dashboard.repository.DashboardQueries;
import com.repairflow.device.repository.DeviceRepository;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.repository.QuotationRepository;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.entity.RepairRequestStatus;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.repository.RepairRequestRepository;
import com.repairflow.repair.service.RepairOrderQueryService;
import com.repairflow.repair.service.RepairOrderQueryService.SearchFilter;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import com.repairflow.warranty.repository.WarrantyClaimRepository;
import com.repairflow.warranty.repository.WarrantyRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Số liệu tổng quan theo vai trò (docs/requirements.md §3.9) + báo cáo ADMIN.
 * Dashboard ADMIN (nặng nhất) được cache Redis 60s, bị xóa ngay khi có sự kiện nghiệp vụ (NotificationEventListener).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<RepairStatus> IN_PROGRESS = EnumSet.of(RepairStatus.INSPECTING, RepairStatus.WAITING_CONFIRMATION,
            RepairStatus.APPROVED, RepairStatus.WAITING_FOR_PARTS, RepairStatus.REPAIRING);
    private static final Set<RepairStatus> OPEN = EnumSet.of(RepairStatus.RECEIVED, RepairStatus.INSPECTING,
            RepairStatus.WAITING_CONFIRMATION, RepairStatus.APPROVED, RepairStatus.REJECTED, RepairStatus.WAITING_FOR_PARTS,
            RepairStatus.REPAIRING, RepairStatus.COMPLETED);
    private static final Map<RepairPriority, Integer> PRIORITY_RANK =
            Map.of(RepairPriority.URGENT, 0, RepairPriority.HIGH, 1, RepairPriority.NORMAL, 2, RepairPriority.LOW, 3);
    private static final long MAX_RANGE_DAYS = 366;

    private final DashboardQueries queries;
    private final RepairOrderQueryService repairOrderQueryService;
    private final RepairRequestRepository repairRequestRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;
    private final WarrantyRepository warrantyRepository;
    private final QuotationRepository quotationRepository;
    private final DeviceRepository deviceRepository;
    private final CurrentCustomerResolver currentCustomer;
    private final Clock clock;

    @Cacheable(cacheNames = CacheConfig.ADMIN_DASHBOARD, key = "#from.toString() + ':' + #to.toString()")
    public AdminDashboardResponse admin(LocalDate from, LocalDate to) {
        validateRange(from, to);
        Instant start = startOf(from);
        Instant end = startOf(to.plusDays(1));
        return new AdminDashboardResponse(from, to,
                queries.countReceivedBetween(start, end),
                queries.countByStatuses(IN_PROGRESS),
                queries.countCompletedBetween(start, end),
                queries.revenueBetween(start, end),
                queries.revenueSeries(from, to, false),
                queries.statusDistribution(),
                queries.topParts(start, end, 5),
                queries.lowStockParts(10));
    }

    public StaffDashboardResponse staff(AuthenticatedUser user) {
        // "Việc cần làm hôm nay": phiếu vừa tiếp nhận + phiếu sửa xong chờ bàn giao
        List<RepairOrderSummaryResponse> todo = repairOrderQueryService.search(
                new SearchFilter(List.of(RepairStatus.RECEIVED, RepairStatus.COMPLETED), null, null, null, null, null, null),
                user, PageRequest.of(0, 8, Sort.by("receivedAt"))).content();
        return new StaffDashboardResponse(
                queries.countByStatuses(Set.of(RepairStatus.RECEIVED)),
                repairRequestRepository.countByStatus(RepairRequestStatus.PENDING),
                queries.countByStatuses(Set.of(RepairStatus.WAITING_CONFIRMATION)),
                queries.countByStatuses(Set.of(RepairStatus.COMPLETED)),
                warrantyClaimRepository.countByStatus(WarrantyClaimStatus.SUBMITTED),
                todo);
    }

    public TechnicianDashboardResponse technician(AuthenticatedUser user) {
        Instant monthStart = LocalDate.now(clock.withZone(SHOP_ZONE)).withDayOfMonth(1).atStartOfDay(SHOP_ZONE).toInstant();
        List<RepairOrderSummaryResponse> active = repairOrderQueryService.search(
                new SearchFilter(List.of(RepairStatus.RECEIVED, RepairStatus.INSPECTING, RepairStatus.APPROVED,
                        RepairStatus.WAITING_FOR_PARTS, RepairStatus.REPAIRING), null, null, null, null, null, null),
                user, PageRequest.of(0, 50)).content();
        List<RepairOrderSummaryResponse> priority = active.stream()
                .sorted(Comparator.comparing((RepairOrderSummaryResponse r) -> PRIORITY_RANK.get(r.priority()))
                        .thenComparing(r -> r.expectedReturnDate() == null ? LocalDate.MAX : r.expectedReturnDate()))
                .limit(5).toList();
        return new TechnicianDashboardResponse(
                queries.countByTechnicianAndStatuses(user.id(), Set.of(RepairStatus.RECEIVED)),
                queries.countByTechnicianAndStatuses(user.id(), IN_PROGRESS),
                queries.countCompletedByTechnicianSince(user.id(), monthStart),
                priority);
    }

    public CustomerDashboardResponse customer(AuthenticatedUser user) {
        Long customerId = currentCustomer.require(user).getId();
        List<RepairOrderSummaryResponse> active = repairOrderQueryService.searchMine(OPEN, user, PageRequest.of(0, 5)).content();
        long pendingQuotes = quotationRepository.count((root, q, cb) -> cb.and(
                cb.equal(root.get("repairOrder").get("customer").get("id"), customerId),
                cb.equal(root.get("status"), QuotationStatus.SENT)));
        return new CustomerDashboardResponse(
                deviceRepository.countByCustomerId(customerId),
                queries.countByCustomerAndStatuses(customerId, OPEN),
                pendingQuotes,
                warrantyRepository.countActiveOfCustomer(customerId, LocalDate.now(clock.withZone(SHOP_ZONE))),
                active);
    }

    // ---------- Báo cáo (ADMIN) ----------

    public List<AmountPoint> revenueReport(LocalDate from, LocalDate to, boolean monthly) {
        validateRange(from, to);
        return queries.revenueSeries(from, to, monthly);
    }

    public List<PartUsageStat> partsUsageReport(LocalDate from, LocalDate to, int limit) {
        validateRange(from, to);
        return queries.topParts(startOf(from), startOf(to.plusDays(1)), Math.min(Math.max(limit, 1), 50));
    }

    public List<TechnicianStat> technicianReport(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return queries.technicianPerformance(startOf(from), startOf(to.plusDays(1)));
    }

    public LocalDate defaultFrom() {
        return LocalDate.now(clock.withZone(SHOP_ZONE)).minusDays(29);
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(SHOP_ZONE));
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Khoảng thời gian tối đa 1 năm");
        }
    }

    private static Instant startOf(LocalDate date) {
        return date.atStartOfDay(SHOP_ZONE).toInstant();
    }
}
