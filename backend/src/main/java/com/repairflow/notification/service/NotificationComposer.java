package com.repairflow.notification.service;

import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.notification.entity.NotificationType;
import com.repairflow.notification.event.DomainEvents.LowStock;
import com.repairflow.notification.event.DomainEvents.RepairAssigned;
import com.repairflow.notification.event.DomainEvents.RepairRequestCreated;
import com.repairflow.notification.event.DomainEvents.RepairStatusChanged;
import com.repairflow.notification.event.DomainEvents.WarrantyClaimCreated;
import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.repository.QuotationRepository;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairRequest;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairRequestRepository;
import com.repairflow.user.entity.Role;
import com.repairflow.user.repository.UserRepository;
import com.repairflow.warranty.entity.WarrantyClaim;
import com.repairflow.warranty.repository.WarrantyClaimRepository;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quyết định "ai nhận thông báo gì" cho từng sự kiện (docs/requirements.md §3.10).
 * Chạy trong transaction chỉ-đọc riêng, sau khi nghiệp vụ đã commit → đọc đúng dữ liệu cuối cùng.
 * Người gây ra sự kiện không nhận thông báo về hành động của chính mình.
 */
@Component
@RequiredArgsConstructor
public class NotificationComposer {

    private static final Map<RepairStatus, String> STATUS_LABELS = new EnumMap<>(RepairStatus.class);

    static {
        STATUS_LABELS.put(RepairStatus.RECEIVED, "Đã tiếp nhận");
        STATUS_LABELS.put(RepairStatus.INSPECTING, "Đang kiểm tra");
        STATUS_LABELS.put(RepairStatus.WAITING_CONFIRMATION, "Chờ khách xác nhận");
        STATUS_LABELS.put(RepairStatus.APPROVED, "Đã duyệt báo giá");
        STATUS_LABELS.put(RepairStatus.REJECTED, "Khách từ chối báo giá");
        STATUS_LABELS.put(RepairStatus.WAITING_FOR_PARTS, "Chờ linh kiện");
        STATUS_LABELS.put(RepairStatus.REPAIRING, "Đang sửa");
        STATUS_LABELS.put(RepairStatus.COMPLETED, "Sửa xong");
        STATUS_LABELS.put(RepairStatus.DELIVERED, "Đã bàn giao");
        STATUS_LABELS.put(RepairStatus.CANCELLED, "Đã hủy");
    }

    private final RepairOrderRepository repairOrderRepository;
    private final RepairRequestRepository repairRequestRepository;
    private final QuotationRepository quotationRepository;
    private final PartRepository partRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;
    private final UserRepository userRepository;

    /** Một thông báo cần gửi tới một nhóm người nhận. */
    public record Message(Set<Long> recipients, NotificationType type, String title, String body,
                          String referenceType, Long referenceId) {
    }

    @Transactional(readOnly = true)
    public List<Message> compose(Object event) {
        // Java 17: pattern matching cho instanceof (switch theo kiểu chỉ chính thức từ Java 21)
        if (event instanceof RepairStatusChanged e) {
            return statusChanged(e);
        }
        if (event instanceof RepairAssigned e) {
            return assigned(e);
        }
        if (event instanceof RepairRequestCreated e) {
            return requestCreated(e);
        }
        if (event instanceof LowStock e) {
            return lowStock(e);
        }
        if (event instanceof WarrantyClaimCreated e) {
            return claimCreated(e);
        }
        return List.of();
    }

    private List<Message> statusChanged(RepairStatusChanged e) {
        RepairOrder o = repairOrderRepository.findWithDetailsById(e.repairOrderId()).orElse(null);
        if (o == null) {
            return List.of();
        }
        Long customerUser = o.getCustomer().getUser() == null ? null : o.getCustomer().getUser().getId();
        Long technician = o.getTechnician() == null ? null : o.getTechnician().getId();
        Long receiver = o.getCreatedBy().getId();
        String ref = "Phiếu " + o.getCode() + " (" + o.getDevice().getName() + ")";
        List<Message> out = new ArrayList<>();
        switch (e.to()) {
            case WAITING_CONFIRMATION -> {
                BigDecimal total = quotationRepository
                        .findFirstByRepairOrderIdAndStatusOrderByVersionNoDesc(o.getId(), QuotationStatus.SENT)
                        .map(Quotation::getTotalAmount).orElse(null);
                out.add(msg(e.actorId(), NotificationType.QUOTATION_SENT, "Bạn có báo giá mới",
                        ref + " có báo giá" + (total == null ? "" : " " + money(total)) + " chờ bạn xác nhận",
                        o.getId(), customerUser));
            }
            case APPROVED, REJECTED -> {
                boolean ok = e.to() == RepairStatus.APPROVED;
                out.add(msg(e.actorId(), ok ? NotificationType.QUOTATION_APPROVED : NotificationType.QUOTATION_REJECTED,
                        ok ? "Khách đồng ý báo giá" : "Khách từ chối báo giá",
                        ref + (ok ? ": khách đã đồng ý, có thể bắt đầu sửa" : ": khách đã từ chối báo giá"),
                        o.getId(), technician, receiver));
            }
            case COMPLETED -> {
                out.add(msg(e.actorId(), NotificationType.REPAIR_COMPLETED, "Thiết bị đã sửa xong",
                        ref + " đã sửa xong, mời bạn đến nhận máy", o.getId(), customerUser));
                out.add(msg(e.actorId(), NotificationType.REPAIR_COMPLETED, "Phiếu chờ bàn giao",
                        ref + " đã sửa xong, chờ bàn giao cho khách", o.getId(), receiver));
            }
            default -> out.add(msg(e.actorId(), NotificationType.REPAIR_STATUS_CHANGED, "Cập nhật sửa chữa",
                    ref + " chuyển sang trạng thái \"" + STATUS_LABELS.get(e.to()) + "\"", o.getId(), customerUser));
        }
        return out.stream().filter(m -> !m.recipients().isEmpty()).toList();
    }

    private List<Message> assigned(RepairAssigned e) {
        return repairOrderRepository.findWithDetailsById(e.repairOrderId())
                .map(o -> msg(e.actorId(), NotificationType.REPAIR_ASSIGNED, "Bạn được giao phiếu mới",
                        "Phiếu " + o.getCode() + " – " + o.getDevice().getName() + ": " + o.getReportedIssue(),
                        o.getId(), e.technicianId()))
                .filter(m -> !m.recipients().isEmpty())
                .map(List::of).orElse(List.of());
    }

    private List<Message> requestCreated(RepairRequestCreated e) {
        RepairRequest r = repairRequestRepository.findById(e.repairRequestId()).orElse(null);
        if (r == null) {
            return List.of();
        }
        Message m = new Message(staff(e.actorId(), Role.STAFF), NotificationType.REPAIR_REQUEST_CREATED,
                "Yêu cầu sửa chữa online mới",
                r.getCustomer().getFullName() + " gửi yêu cầu " + r.getCode() + ": " + r.getIssueDescription(),
                "REPAIR_REQUEST", r.getId());
        return m.recipients().isEmpty() ? List.of() : List.of(m);
    }

    private List<Message> lowStock(LowStock e) {
        Part p = partRepository.findById(e.partId()).orElse(null);
        if (p == null) {
            return List.of();
        }
        Message m = new Message(staff(e.actorId(), Role.ADMIN, Role.STAFF), NotificationType.LOW_STOCK, "Linh kiện sắp hết",
                p.getSku() + " – " + p.getName() + " chỉ còn " + p.getQuantityOnHand() + " " + p.getUnit()
                        + " (tối thiểu " + p.getMinStockLevel() + ")", "PART", p.getId());
        return m.recipients().isEmpty() ? List.of() : List.of(m);
    }

    private List<Message> claimCreated(WarrantyClaimCreated e) {
        WarrantyClaim c = warrantyClaimRepository.findById(e.warrantyClaimId()).orElse(null);
        if (c == null) {
            return List.of();
        }
        Message m = new Message(staff(e.actorId(), Role.STAFF), NotificationType.WARRANTY_CLAIM_CREATED,
                "Yêu cầu bảo hành mới", "Yêu cầu " + c.getCode() + " cho bảo hành " + c.getWarranty().getCode()
                        + ": " + c.getIssueDescription(), "WARRANTY_CLAIM", c.getId());
        return m.recipients().isEmpty() ? List.of() : List.of(m);
    }

    private Set<Long> staff(Long actorId, Role... roles) {
        Set<Long> ids = new LinkedHashSet<>(userRepository.findActiveIdsByRoles(List.of(roles)));
        ids.remove(actorId);
        return ids;
    }

    private static Message msg(Long actorId, NotificationType type, String title, String body, Long orderId, Long... users) {
        Set<Long> recipients = new LinkedHashSet<>();
        Stream.of(users).filter(Objects::nonNull).filter(u -> !u.equals(actorId)).forEach(recipients::add);
        return new Message(recipients, type, title, body, "REPAIR_ORDER", orderId);
    }

    private static String money(BigDecimal value) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(value) + "₫";
    }
}
