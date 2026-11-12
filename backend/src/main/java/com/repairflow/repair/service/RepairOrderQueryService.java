package com.repairflow.repair.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.dto.CustomerDtos.CustomerBrief;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.device.dto.DeviceDtos.DeviceSummary;
import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.repository.QuotationRepository;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.dto.RepairOrderDtos.StatusHistoryResponse;
import com.repairflow.repair.dto.RepairOrderDtos.UserBrief;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairStatusHistoryRepository;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import com.repairflow.warranty.entity.Warranty;
import com.repairflow.warranty.repository.WarrantyRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Đọc dữ liệu phiếu sửa chữa (tách khỏi phần ghi để mỗi class gọn và một trách nhiệm). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RepairOrderQueryService {

    private static final Set<String> SORTABLE = Set.of("receivedAt", "updatedAt", "expectedReturnDate", "priority", "code");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "receivedAt");
    /** Múi giờ cửa hàng – lọc "từ ngày / đến ngày" theo giờ Việt Nam. */
    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<RepairStatus> PARTS_STATUSES =
            java.util.EnumSet.of(RepairStatus.APPROVED, RepairStatus.REPAIRING, RepairStatus.WAITING_FOR_PARTS);

    private final RepairOrderRepository repository;
    private final RepairStatusHistoryRepository historyRepository;
    private final RepairAccessGuard accessGuard;
    private final RepairStatusPolicy policy;
    private final CurrentCustomerResolver currentCustomer;
    private final QuotationRepository quotationRepository;
    private final WarrantyRepository warrantyRepository;

    public record SearchFilter(Collection<RepairStatus> statuses, Long technicianId, Long customerId,
                               RepairPriority priority, String keyword, LocalDate from, LocalDate to) {
    }

    /** TECHNICIAN luôn bị ép lọc theo chính mình – không thể xem phiếu người khác bằng cách đổi tham số. */
    public PageResponse<RepairOrderSummaryResponse> search(SearchFilter filter, AuthenticatedUser user, Pageable pageable) {
        Long technicianId = user.role() == Role.TECHNICIAN ? user.id() : filter.technicianId();
        SearchFilter effective = new SearchFilter(filter.statuses(), technicianId, filter.customerId(),
                filter.priority(), filter.keyword(), filter.from(), filter.to());
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, DEFAULT_SORT);
        return PageResponse.of(repository.findAll(toSpec(effective), page), RepairOrderSummaryResponse::from);
    }

    public PageResponse<RepairOrderSummaryResponse> searchMine(Collection<RepairStatus> statuses, AuthenticatedUser user,
                                                               Pageable pageable) {
        Long customerId = currentCustomer.require(user).getId();
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, DEFAULT_SORT);
        SearchFilter filter = new SearchFilter(statuses, null, customerId, null, null, null, null);
        return PageResponse.of(repository.findAll(toSpec(filter), page), RepairOrderSummaryResponse::from);
    }

    public PageResponse<RepairOrderSummaryResponse> historyOfCustomer(Long customerId, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, DEFAULT_SORT);
        SearchFilter filter = new SearchFilter(null, null, customerId, null, null, null, null);
        return PageResponse.of(repository.findAll(toSpec(filter), page), RepairOrderSummaryResponse::from);
    }

    public List<RepairOrderSummaryResponse> historyOfDevice(Long deviceId) {
        Specification<RepairOrder> spec = (root, q, cb) -> cb.equal(root.get("device").get("id"), deviceId);
        return repository.findAll(spec, PageRequest.of(0, 100, DEFAULT_SORT)).map(RepairOrderSummaryResponse::from).getContent();
    }

    public RepairOrderDetailResponse get(Long id, AuthenticatedUser user) {
        return toDetail(accessGuard.loadVisible(id, user), user);
    }

    public List<StatusHistoryResponse> history(Long id, AuthenticatedUser user) {
        accessGuard.loadVisible(id, user);
        List<StatusHistoryResponse> entries = historyRepository.findByRepairOrderIdOrderByChangedAtAscIdAsc(id).stream()
                .map(StatusHistoryResponse::from).toList();
        if (user.role() != Role.CUSTOMER) {
            return entries;
        }
        // Khách chỉ cần biết vai trò thực hiện, không cần tên nhân viên nội bộ (ẩn ở API, không chỉ ẩn ở giao diện)
        return entries.stream()
                .map(h -> new StatusHistoryResponse(h.id(), h.fromStatus(), h.toStatus(), null, h.changedByRole(),
                        h.note(), h.changedAt()))
                .toList();
    }

    /** Ô tìm nhanh mã phiếu trên header. */
    public RepairOrderSummaryResponse lookup(String code, AuthenticatedUser user) {
        RepairOrder order = repository.findByCodeIgnoreCase(code.trim())
                .filter(o -> accessGuard.canView(o, user))
                .orElseThrow(() -> BusinessException.notFound("Phiếu sửa chữa", code));
        return RepairOrderSummaryResponse.from(order);
    }

    RepairOrderDetailResponse toDetail(RepairOrder o, AuthenticatedUser user) {
        boolean open = !policy.isTerminal(o.getStatus());
        boolean backOffice = user.role() == Role.ADMIN || user.role() == Role.STAFF;
        boolean assignedTech = user.role() == Role.TECHNICIAN && o.getTechnician() != null
                && o.getTechnician().getId().equals(user.id());
        RepairStatus s = o.getStatus();
        BigDecimal approvedTotal = quotationRepository
                .findFirstByRepairOrderIdAndStatusOrderByVersionNoDesc(o.getId(), QuotationStatus.APPROVED)
                .map(Quotation::getTotalAmount).orElse(null);
        Warranty warranty = warrantyRepository.findByRepairOrderId(o.getId()).orElse(null);
        return new RepairOrderDetailResponse(
                o.getId(), o.getCode(), o.getStatus(), o.getPriority(),
                CustomerBrief.from(o.getCustomer()), DeviceSummary.from(o.getDevice()),
                UserBrief.from(o.getTechnician()), UserBrief.from(o.getCreatedBy()),
                o.getReportedIssue(), o.getDeviceCondition(), o.getAccessories(), o.getDiagnosis(), o.getSolution(),
                o.isWarrantyRepair(), o.getExpectedReturnDate(),
                o.getFinalAmount(), o.getPaymentMethod(), o.getCancelReason(),
                o.getReceivedAt(), o.getCompletedAt(), o.getDeliveredAt(), o.getUpdatedAt(),
                o.getRepairRequest() == null ? null : o.getRepairRequest().getId(),
                policy.allowedManualTransitions(o, user),
                open && backOffice,
                open && backOffice,
                open && (assignedTech || user.role() == Role.ADMIN),
                backOffice && policy.isEdgeAllowed(s, RepairStatus.WAITING_CONFIRMATION),
                backOffice && (s == RepairStatus.COMPLETED || s == RepairStatus.REJECTED),
                (assignedTech || user.role() == Role.ADMIN) && PARTS_STATUSES.contains(s),
                approvedTotal,
                warranty == null ? null : warranty.getId(),
                warranty == null ? null : warranty.getCode(),
                o.getVersion());
    }

    private static Specification<RepairOrder> toSpec(SearchFilter f) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (f.statuses() != null && !f.statuses().isEmpty()) {
                p.add(root.get("status").in(f.statuses()));
            }
            if (f.technicianId() != null) {
                p.add(cb.equal(root.get("technician").get("id"), f.technicianId()));
            }
            if (f.customerId() != null) {
                p.add(cb.equal(root.get("customer").get("id"), f.customerId()));
            }
            if (f.priority() != null) {
                p.add(cb.equal(root.get("priority"), f.priority()));
            }
            if (f.from() != null) {
                Instant start = f.from().atStartOfDay(SHOP_ZONE).toInstant();
                p.add(cb.greaterThanOrEqualTo(root.get("receivedAt"), start));
            }
            if (f.to() != null) {
                Instant end = f.to().plusDays(1).atStartOfDay(SHOP_ZONE).toInstant();
                p.add(cb.lessThan(root.get("receivedAt"), end));
            }
            if (StringUtils.hasText(f.keyword())) {
                String like = "%" + f.keyword().trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("customer").get("fullName")), like),
                        cb.like(root.get("customer").get("phone"), like),
                        cb.like(cb.lower(root.get("device").get("name")), like),
                        cb.like(cb.lower(root.get("device").get("serialNumber")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
