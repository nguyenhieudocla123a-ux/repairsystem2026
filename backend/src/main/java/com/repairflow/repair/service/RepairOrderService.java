package com.repairflow.repair.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.service.CustomerService;
import com.repairflow.device.entity.Device;
import com.repairflow.device.repository.DeviceRepository;
import com.repairflow.inventory.repository.InventoryTransactionRepository;
import com.repairflow.notification.event.DomainEvents.RepairAssigned;
import com.repairflow.notification.event.DomainEvents.RepairStatusChanged;
import com.repairflow.repair.dto.RepairOrderDtos.DiagnosisRequest;
import com.repairflow.repair.dto.RepairOrderDtos.ReceptionInfo;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairOrderDtos.UpdateRepairOrderRequest;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.entity.RepairRequest;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.entity.RepairStatusHistory;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairStatusHistoryRepository;
import com.repairflow.repair.service.RepairStatusPolicy.Channel;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Thay đổi dữ liệu phiếu sửa chữa. Mọi thay đổi trạng thái đi qua {@link #changeStatus} → luôn được
 * RepairStatusPolicy kiểm tra và luôn ghi lịch sử (repair_status_histories).
 */
@Service
@RequiredArgsConstructor
public class RepairOrderService {

    private final RepairOrderRepository repository;
    private final RepairStatusHistoryRepository historyRepository;
    private final RepairStatusPolicy policy;
    private final RepairAccessGuard accessGuard;
    private final RepairOrderQueryService queryService;
    private final CustomerService customerService;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final EntityManager entityManager;
    private final Clock clock;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final ApplicationEventPublisher events;

    /** Tiếp nhận tại quầy: tạo phiếu RECEIVED. */
    @Transactional
    public RepairOrderDetailResponse create(Long customerId, Long deviceId, ReceptionInfo info, AuthenticatedUser actor) {
        Customer customer = customerService.load(customerId);
        Device device = deviceRepository.findById(deviceId).orElseThrow(() -> BusinessException.notFound("Thiết bị", deviceId));
        if (!device.getCustomer().getId().equals(customer.getId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiết bị không thuộc khách hàng đã chọn");
        }
        return toDetail(open(customer, device, info, null, actor, "Tiếp nhận tại quầy"), actor);
    }

    /** Dùng bởi RepairRequestService khi STAFF tiếp nhận yêu cầu online. */
    @Transactional
    public RepairOrder openFromRequest(RepairRequest request, ReceptionInfo info, AuthenticatedUser actor) {
        return open(request.getCustomer(), request.getDevice(), info, request, actor,
                "Tiếp nhận từ yêu cầu online " + request.getCode());
    }

    @Transactional
    public RepairOrderDetailResponse update(Long id, UpdateRepairOrderRequest request, AuthenticatedUser actor) {
        RepairOrder order = loadForUpdate(id, actor, request.version());
        assertOpen(order);
        order.setReportedIssue(request.reportedIssue().trim());
        order.setDeviceCondition(trimToNull(request.deviceCondition()));
        order.setAccessories(trimToNull(request.accessories()));
        order.setPriority(request.priority());
        order.setExpectedReturnDate(request.expectedReturnDate());
        return toDetail(order, actor);
    }

    @Transactional
    public RepairOrderDetailResponse assign(Long id, Long technicianId, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(id, actor);
        assertOpen(order);
        User technician = loadActiveTechnician(technicianId);
        Long previous = order.getTechnician() == null ? null : order.getTechnician().getId();
        if (!Objects.equals(previous, technicianId)) {
            order.setTechnician(technician);
            events.publishEvent(new RepairAssigned(id, technicianId, actor.id()));
            auditService.record(actor.id(), "REPAIR_ASSIGNED", "REPAIR_ORDER", id,
                    previous == null ? Map.of("technicianId", technicianId)
                            : Map.of("technicianId", technicianId, "previousTechnicianId", previous));
        }
        return toDetail(order, actor);
    }

    /** KTV ghi chẩn đoán / phương án khắc phục. */
    @Transactional
    public RepairOrderDetailResponse updateDiagnosis(Long id, DiagnosisRequest request, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(id, actor);
        assertOpen(order);
        boolean assigned = order.getTechnician() != null && order.getTechnician().getId().equals(actor.id());
        if (actor.role() != Role.ADMIN && !(actor.role() == Role.TECHNICIAN && assigned)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Chỉ kỹ thuật viên được giao mới ghi chẩn đoán");
        }
        order.setDiagnosis(trimToNull(request.diagnosis()));
        order.setSolution(trimToNull(request.solution()));
        return toDetail(order, actor);
    }

    /** Đổi trạng thái thủ công (POST /transitions). */
    @Transactional
    public RepairOrderDetailResponse transition(Long id, RepairStatus to, String note, Long version, AuthenticatedUser actor) {
        RepairOrder order = loadForUpdate(id, actor, version);
        changeStatus(order, to, actor, Channel.MANUAL, note);
        return toDetail(order, actor);
    }

    /** Khách hủy phiếu của mình (chỉ khi vừa tiếp nhận – kiểm tra trong policy). */
    @Transactional
    public RepairOrderDetailResponse cancelByCustomer(Long id, String reason, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(id, actor);
        changeStatus(order, RepairStatus.CANCELLED, actor, Channel.MANUAL, reason);
        return toDetail(order, actor);
    }

    /**
     * Điểm duy nhất đổi trạng thái phiếu – các module khác (báo giá, bàn giao) cũng gọi qua đây với Channel tương ứng.
     */
    @Transactional
    public void changeStatus(RepairOrder order, RepairStatus to, AuthenticatedUser actor, Channel channel, String note) {
        policy.assertCanTransition(order, to, actor, channel, note);
        if (to == RepairStatus.CANCELLED && order.getId() != null
                && inventoryTransactionRepository.usageOfOrder(order.getId()).stream()
                        .anyMatch(u -> u.quantityUsed() != null && u.quantityUsed() > 0)) {
            throw BusinessException.conflict("Phiếu còn linh kiện đã xuất – cần hoàn kho trước khi hủy phiếu");
        }
        RepairStatus from = order.getStatus();
        order.setStatus(to);
        switch (to) {
            case COMPLETED -> order.setCompletedAt(clock.instant());
            case DELIVERED -> order.setDeliveredAt(clock.instant());
            case CANCELLED -> order.setCancelReason(note.trim());
            default -> {
                // không có cột thời điểm riêng
            }
        }
        historyRepository.save(new RepairStatusHistory(order, from, to, userRef(actor), trimToNull(note)));
        // Một sự kiện duy nhất cho mọi lần đổi trạng thái → thông báo + xóa cache dashboard (sau commit)
        events.publishEvent(new RepairStatusChanged(order.getId(), from, to, actor.id()));
    }

    /** Phiếu sửa chữa bảo hành (từ yêu cầu bảo hành được chấp nhận). */
    @Transactional
    public RepairOrder openWarrantyRepair(Customer customer, Device device, ReceptionInfo info, AuthenticatedUser actor,
                                          String historyNote) {
        RepairOrder order = open(customer, device, info, null, actor, historyNote);
        order.setWarrantyRepair(true);
        return order;
    }

    private RepairOrder open(Customer customer, Device device, ReceptionInfo info, RepairRequest request,
                             AuthenticatedUser actor, String historyNote) {
        RepairOrder order = new RepairOrder(codeGenerator.next(CodeType.REPAIR_ORDER), customer, device, userRef(actor),
                info.reportedIssue().trim());
        order.setRepairRequest(request);
        order.setDeviceCondition(trimToNull(info.deviceCondition()));
        order.setAccessories(trimToNull(info.accessories()));
        order.setPriority(info.priority() == null ? RepairPriority.NORMAL : info.priority());
        order.setExpectedReturnDate(info.expectedReturnDate());
        if (info.technicianId() != null) {
            order.setTechnician(loadActiveTechnician(info.technicianId()));
        }
        repository.save(order);
        historyRepository.save(new RepairStatusHistory(order, null, RepairStatus.RECEIVED, userRef(actor), historyNote));
        if (order.getTechnician() != null) {
            events.publishEvent(new RepairAssigned(order.getId(), order.getTechnician().getId(), actor.id()));
        }
        return order;
    }

    /**
     * Optimistic locking theo version client gửi lên: nếu người khác đã sửa phiếu sau khi client tải về
     * thì từ chối (409) thay vì ghi đè âm thầm.
     */
    private RepairOrder loadForUpdate(Long id, AuthenticatedUser actor, Long clientVersion) {
        RepairOrder order = accessGuard.loadVisible(id, actor);
        if (clientVersion != null && !clientVersion.equals(order.getVersion())) {
            throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Phiếu đã được người khác cập nhật, vui lòng tải lại trước khi thao tác");
        }
        return order;
    }

    private User loadActiveTechnician(Long technicianId) {
        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> BusinessException.notFound("Kỹ thuật viên", technicianId));
        if (technician.getRole() != Role.TECHNICIAN || !technician.isActive()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Người được chọn không phải kỹ thuật viên đang hoạt động");
        }
        return technician;
    }

    private void assertOpen(RepairOrder order) {
        if (policy.isTerminal(order.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION, "Phiếu đã kết thúc, không thể chỉnh sửa");
        }
    }

    private RepairOrderDetailResponse toDetail(RepairOrder order, AuthenticatedUser actor) {
        repository.flush(); // cập nhật version / updatedAt trước khi trả về client (client dùng version cho lần sửa sau)
        return queryService.toDetail(order, actor);
    }

    private User userRef(AuthenticatedUser actor) {
        return entityManager.getReference(User.class, actor.id());
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
