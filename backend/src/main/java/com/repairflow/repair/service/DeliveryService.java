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

/**
 * Bàn giao máy cho khách: chốt số tiền + phương thức thanh toán, phiếu → DELIVERED (kênh DELIVERY),
 * tạo phiếu bảo hành nếu máy đã được sửa xong. Tất cả trong một transaction.
 */
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

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

        int months = request.warrantyMonths() == null ? 0 : request.warrantyMonths();
        if (repaired && months > 0) {
            Warranty warranty = new Warranty(codeGenerator.next(CodeType.WARRANTY), order,
                    LocalDate.now(clock.withZone(SHOP_ZONE)), months, entityManager.getReference(User.class, actor.id()));
            warranty.setTerms(StringUtils.hasText(request.warrantyTerms()) ? request.warrantyTerms().trim() : null);
            warrantyRepository.save(warranty);
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
