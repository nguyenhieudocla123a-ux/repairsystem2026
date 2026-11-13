package com.repairflow.repair.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.inventory.repository.InventoryTransactionRepository;
import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.repository.QuotationRepository;
import com.repairflow.repair.dto.RepairOrderDtos.DeliverRequest;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.service.RepairStatusPolicy.Channel;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.User;
import com.repairflow.warranty.entity.Warranty;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import com.repairflow.warranty.repository.WarrantyClaimRepository;
import com.repairflow.warranty.repository.WarrantyRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.quotation.entity.QuotationItemType;
import com.repairflow.repair.dto.RepairOrderDtos.WarrantyItemRequest;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyItemSuggestion;
import com.repairflow.warranty.entity.WarrantyItem;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bàn giao máy cho khách: chốt số tiền + phương thức thanh toán, phiếu → DELIVERED (kênh DELIVERY),
 * tạo phiếu bảo hành nếu máy đã được sửa xong. Tất cả trong một transaction.
 */
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final String LABOR_DESCRIPTION = "Công sửa chữa";

    private final RepairAccessGuard accessGuard;
    private final RepairOrderService repairOrderService;
    private final RepairOrderQueryService queryService;
    private final RepairOrderRepository repairOrderRepository;
    private final QuotationRepository quotationRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final WarrantyRepository warrantyRepository;
    private final CodeGenerator codeGenerator;
    private final EntityManager entityManager;
    private final Clock clock;
    private final WarrantyClaimRepository warrantyClaimRepository;

    @Transactional
    public RepairOrderDetailResponse deliver(Long orderId, DeliverRequest request, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(orderId, actor);
        if (order.getVersion() != null && request.version() != null && !request.version().equals(order.getVersion())) {
            throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION, "Phiếu đã được cập nhật, vui lòng tải lại");
        }
        boolean repaired = order.getStatus() == RepairStatus.COMPLETED;
        if (!repaired && hasPartsInUse(orderId)) {
            // Trả máy không sửa (khách từ chối báo giá) mà vẫn còn linh kiện đã xuất → phải hoàn kho trước
            throw BusinessException.conflict("Phiếu còn linh kiện đã xuất chưa hoàn kho – KTV cần hoàn kho trước khi trả máy");
        }

        BigDecimal amount = request.finalAmount() != null ? request.finalAmount()
                : repaired ? approvedTotal(orderId) : BigDecimal.ZERO;
        amount = amount.setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() > 0 && request.paymentMethod() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng chọn phương thức thanh toán");
        }

        // Máy trạng thái kiểm tra: chỉ COMPLETED/REJECTED → DELIVERED, chỉ STAFF/ADMIN, đúng kênh DELIVERY
        repairOrderService.changeStatus(order, RepairStatus.DELIVERED, actor, Channel.DELIVERY,
                StringUtils.hasText(request.note()) ? request.note() : repaired ? "Bàn giao máy đã sửa" : "Trả máy không sửa");
        order.setFinalAmount(amount);
        order.setPaymentMethod(amount.signum() > 0 ? request.paymentMethod() : null);

        if (repaired) {
            issueWarranty(order, request, actor);
        }
        if (order.isWarrantyRepair()) {
            // Phiếu bảo hành đã bàn giao → đóng yêu cầu bảo hành tương ứng
            warrantyClaimRepository.findByRepairOrderId(orderId)
                    .filter(c -> c.getStatus() == WarrantyClaimStatus.ACCEPTED)
                    .ifPresent(c -> {
                        c.setStatus(WarrantyClaimStatus.RESOLVED);
                        c.setResolvedAt(clock.instant());
                    });
        }
        repairOrderRepository.flush();
        return queryService.toDetail(order, actor);
    }

    /**
     * Gợi ý dòng bảo hành = các linh kiện trong báo giá ĐÃ DUYỆT, với loại linh kiện + số tháng đã báo cho khách
     * (lưu cố định trên dòng báo giá). Cùng một linh kiện nhiều dòng → gộp số lượng.
     */
    @Transactional(readOnly = true)
    public List<WarrantyItemSuggestion> warrantySuggestions(Long orderId, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(orderId, actor);
        return List.copyOf(suggestionsFor(order.getId()).values());
    }

    private Map<Long, WarrantyItemSuggestion> suggestionsFor(Long orderId) {
        Map<Long, WarrantyItemSuggestion> byPart = new LinkedHashMap<>();
        quotationRepository.findFirstByRepairOrderIdAndStatusOrderByVersionNoDesc(orderId, QuotationStatus.APPROVED)
                .ifPresent(q -> q.getItems().stream()
                        .filter(i -> i.getItemType() == QuotationItemType.PART && i.getPart() != null)
                        .forEach(i -> {
                            Part part = i.getPart();
                            PartCategory c = part.getCategory();
                            int months = i.getWarrantyMonths() != null ? i.getWarrantyMonths() : part.effectiveWarrantyMonths();
                            WarrantyItemSuggestion s = new WarrantyItemSuggestion(part.getId(), i.getDescription(),
                                    c == null ? null : c.getName(), i.getPartGrade() != null ? i.getPartGrade() : part.getGrade(),
                                    i.getQuantity(), months, c == null ? null : c.getExclusions());
                            byPart.merge(part.getId(), s, (a, b) -> new WarrantyItemSuggestion(a.partId(), a.description(),
                                    a.categoryName(), a.partGrade(), a.quantity() + b.quantity(), Math.max(a.months(), b.months()),
                                    a.exclusions()));
                        }));
        return byPart;
    }

    /**
     * Cấp bảo hành theo từng dòng. Không gửi warrantyItems → lấy toàn bộ gợi ý từ báo giá + dòng "Công sửa chữa"
     * nếu warrantyMonths > 0. Có gửi → dùng đúng danh sách nhân viên đã chỉnh (dòng linh kiện phải có trong báo giá
     * đã duyệt). Dòng 0 tháng bị bỏ qua; không còn dòng nào → không cấp bảo hành.
     */
    private void issueWarranty(RepairOrder order, DeliverRequest request, AuthenticatedUser actor) {
        Map<Long, WarrantyItemSuggestion> allowed = suggestionsFor(order.getId());
        List<WarrantyItemSuggestion> lines = new ArrayList<>();
        if (request.warrantyItems() == null) {
            lines.addAll(allowed.values());
            int laborMonths = request.warrantyMonths() == null ? 0 : request.warrantyMonths();
            lines.add(new WarrantyItemSuggestion(null, LABOR_DESCRIPTION, null, null, 1, laborMonths, null));
        } else {
            for (WarrantyItemRequest r : request.warrantyItems()) {
                WarrantyItemSuggestion base = r.partId() == null ? null : allowed.get(r.partId());
                if (r.partId() != null && base == null) {
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                            "Linh kiện #" + r.partId() + " không có trong báo giá đã duyệt, không thể bảo hành");
                }
                lines.add(new WarrantyItemSuggestion(r.partId(), r.description().trim(),
                        base == null ? null : base.categoryName(), base == null ? null : base.partGrade(),
                        r.quantity() == null ? (base == null ? 1 : base.quantity()) : r.quantity(), r.months(),
                        base == null ? null : base.exclusions()));
            }
        }
        lines.removeIf(l -> l.months() <= 0);
        if (lines.isEmpty()) {
            return;
        }
        int maxMonths = lines.stream().mapToInt(WarrantyItemSuggestion::months).max().orElseThrow();
        Warranty warranty = new Warranty(codeGenerator.next(CodeType.WARRANTY), order,
                LocalDate.now(clock.withZone(SHOP_ZONE)), maxMonths, entityManager.getReference(User.class, actor.id()));
        warranty.setTerms(StringUtils.hasText(request.warrantyTerms()) ? request.warrantyTerms().trim() : null);
        for (WarrantyItemSuggestion l : lines) {
            Part part = l.partId() == null ? null : entityManager.find(Part.class, l.partId());
            PartCategory category = part == null ? null : part.getCategory();
            warranty.addItem(new WarrantyItem(warranty, part, category, l.description(), l.partGrade(), l.quantity(),
                    l.months(), l.exclusions()));
        }
        warrantyRepository.save(warranty);
    }

    private BigDecimal approvedTotal(Long orderId) {
        return quotationRepository.findFirstByRepairOrderIdAndStatusOrderByVersionNoDesc(orderId, QuotationStatus.APPROVED)
                .map(Quotation::getTotalAmount)
                .orElse(BigDecimal.ZERO);
    }

    private boolean hasPartsInUse(Long orderId) {
        return inventoryTransactionRepository.usageOfOrder(orderId).stream()
                .anyMatch(u -> u.quantityUsed() != null && u.quantityUsed() > 0);
    }
}
