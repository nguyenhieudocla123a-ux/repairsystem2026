package com.repairflow.repair.service;

import static com.repairflow.repair.entity.RepairStatus.APPROVED;
import static com.repairflow.repair.entity.RepairStatus.CANCELLED;
import static com.repairflow.repair.entity.RepairStatus.COMPLETED;
import static com.repairflow.repair.entity.RepairStatus.DELIVERED;
import static com.repairflow.repair.entity.RepairStatus.INSPECTING;
import static com.repairflow.repair.entity.RepairStatus.RECEIVED;
import static com.repairflow.repair.entity.RepairStatus.REJECTED;
import static com.repairflow.repair.entity.RepairStatus.REPAIRING;
import static com.repairflow.repair.entity.RepairStatus.WAITING_CONFIRMATION;
import static com.repairflow.repair.entity.RepairStatus.WAITING_FOR_PARTS;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Máy trạng thái phiếu sửa chữa (docs/requirements.md §3.5) – NGUỒN SỰ THẬT DUY NHẤT về luật chuyển trạng thái.
 * <p>
 * Ba câu hỏi cho mỗi lần chuyển:
 * <ol>
 *   <li><b>Đồ thị</b>: từ trạng thái A có cạnh tới B không? ({@link #TRANSITIONS})</li>
 *   <li><b>Kênh</b>: thao tác nào được phép gây ra chuyển đổi đó? Một số trạng thái chỉ đạt được qua nghiệp vụ riêng
 *       (gửi báo giá → WAITING_CONFIRMATION, khách phản hồi → APPROVED/REJECTED, bàn giao → DELIVERED) để không ai
 *       "nhảy cóc" bằng API đổi trạng thái thủ công.</li>
 *   <li><b>Người thực hiện</b>: vai trò / quan hệ với phiếu (KTV được giao, khách chủ phiếu).</li>
 * </ol>
 * Class thuần Java, không truy cập DB → unit test được toàn bộ ma trận.
 */
@Component
public class RepairStatusPolicy {

    /** Cách một chuyển đổi được kích hoạt. */
    public enum Channel {
        /** API POST /repair-orders/{id}/transitions */
        MANUAL,
        /** Nghiệp vụ báo giá: gửi, khách đồng ý / từ chối */
        QUOTATION,
        /** Nghiệp vụ bàn giao + thanh toán */
        DELIVERY
    }

    static final Map<RepairStatus, Set<RepairStatus>> TRANSITIONS = new EnumMap<>(RepairStatus.class);

    static {
        TRANSITIONS.put(RECEIVED, EnumSet.of(INSPECTING, CANCELLED));
        TRANSITIONS.put(INSPECTING, EnumSet.of(WAITING_CONFIRMATION, CANCELLED));
        TRANSITIONS.put(WAITING_CONFIRMATION, EnumSet.of(APPROVED, REJECTED, CANCELLED));
        TRANSITIONS.put(REJECTED, EnumSet.of(WAITING_CONFIRMATION, DELIVERED));
        TRANSITIONS.put(APPROVED, EnumSet.of(REPAIRING, WAITING_FOR_PARTS));
        TRANSITIONS.put(WAITING_FOR_PARTS, EnumSet.of(REPAIRING, CANCELLED));
        TRANSITIONS.put(REPAIRING, EnumSet.of(WAITING_FOR_PARTS, WAITING_CONFIRMATION, COMPLETED));
        TRANSITIONS.put(COMPLETED, EnumSet.of(DELIVERED));
        TRANSITIONS.put(DELIVERED, EnumSet.noneOf(RepairStatus.class));
        TRANSITIONS.put(CANCELLED, EnumSet.noneOf(RepairStatus.class));
    }

    /** Trạng thái đích thuộc kênh nào. */
    private static final Map<RepairStatus, Channel> CHANNEL_OF_TARGET = new EnumMap<>(RepairStatus.class);

    static {
        for (RepairStatus s : EnumSet.of(INSPECTING, REPAIRING, WAITING_FOR_PARTS, COMPLETED, CANCELLED)) {
            CHANNEL_OF_TARGET.put(s, Channel.MANUAL);
        }
        for (RepairStatus s : EnumSet.of(WAITING_CONFIRMATION, APPROVED, REJECTED)) {
            CHANNEL_OF_TARGET.put(s, Channel.QUOTATION);
        }
        CHANNEL_OF_TARGET.put(DELIVERED, Channel.DELIVERY);
    }

    private static final Set<RepairStatus> TERMINAL = EnumSet.of(DELIVERED, CANCELLED);

    public boolean isTerminal(RepairStatus status) {
        return TERMINAL.contains(status);
    }

    public boolean isEdgeAllowed(RepairStatus from, RepairStatus to) {
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    /**
     * Kiểm tra đầy đủ một chuyển đổi; ném lỗi nghiệp vụ nếu không hợp lệ.
     *
     * @throws BusinessException INVALID_STATUS_TRANSITION (409) nếu sai đồ thị/kênh/điều kiện,
     *                           ACCESS_DENIED (403) nếu người thực hiện không có quyền
     */
    public void assertCanTransition(RepairOrder order, RepairStatus to, AuthenticatedUser actor, Channel channel,
                                    String note) {
        RepairStatus from = order.getStatus();
        if (!isEdgeAllowed(from, to)) {
            throw invalid("Không thể chuyển phiếu từ " + from + " sang " + to + ". Hợp lệ: " + describe(from));
        }
        if (CHANNEL_OF_TARGET.get(to) != channel) {
            throw invalid(switch (CHANNEL_OF_TARGET.get(to)) {
                case QUOTATION -> "Trạng thái " + to + " chỉ đạt được qua nghiệp vụ báo giá";
                case DELIVERY -> "Trạng thái " + to + " chỉ đạt được qua nghiệp vụ bàn giao";
                case MANUAL -> "Trạng thái " + to + " phải đổi qua API chuyển trạng thái";
            });
        }
        if (!isActorAllowed(order, to, actor)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền chuyển phiếu sang " + to);
        }
        assertPreconditions(order, to, note);
    }

    /** Các trạng thái mà người dùng có thể chuyển thủ công lúc này – Frontend dùng để hiển thị nút (TD-07). */
    public Set<RepairStatus> allowedManualTransitions(RepairOrder order, AuthenticatedUser actor) {
        return TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).stream()
                .filter(to -> CHANNEL_OF_TARGET.get(to) == Channel.MANUAL)
                .filter(to -> isActorAllowed(order, to, actor))
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(RepairStatus.class)));
    }

    private boolean isActorAllowed(RepairOrder order, RepairStatus to, AuthenticatedUser actor) {
        Role role = actor.role();
        return switch (to) {
            // Việc kỹ thuật: chỉ KTV được giao (hoặc ADMIN xử lý thay)
            case INSPECTING, REPAIRING, WAITING_FOR_PARTS, COMPLETED -> role == Role.ADMIN || isAssignedTechnician(order, actor);
            // Gửi báo giá, bàn giao: nhân viên quầy
            case WAITING_CONFIRMATION, DELIVERED -> role == Role.ADMIN || role == Role.STAFF;
            // Đồng ý / từ chối báo giá: khách chủ phiếu, hoặc nhân viên thay mặt
            case APPROVED, REJECTED -> role == Role.ADMIN || role == Role.STAFF
                    || CurrentCustomerResolver.owns(actor, order.getCustomer());
            // Hủy: nhân viên; khách chỉ hủy được khi phiếu vừa tiếp nhận
            case CANCELLED -> role == Role.ADMIN || role == Role.STAFF
                    || (order.getStatus() == RECEIVED && CurrentCustomerResolver.owns(actor, order.getCustomer()));
            case RECEIVED -> false;
        };
    }

    private void assertPreconditions(RepairOrder order, RepairStatus to, String note) {
        if (to == INSPECTING && order.getTechnician() == null) {
            throw invalid("Phiếu chưa được phân công kỹ thuật viên");
        }
        if (to == COMPLETED && !StringUtils.hasText(order.getSolution())) {
            throw invalid("Cần ghi phương án khắc phục trước khi hoàn thành");
        }
        if (to == CANCELLED && !StringUtils.hasText(note)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng nhập lý do hủy phiếu");
        }
    }

    private static boolean isAssignedTechnician(RepairOrder order, AuthenticatedUser actor) {
        return actor.role() == Role.TECHNICIAN && order.getTechnician() != null
                && order.getTechnician().getId().equals(actor.id());
    }

    private static String describe(RepairStatus from) {
        Set<RepairStatus> next = TRANSITIONS.getOrDefault(from, Set.of());
        return next.isEmpty() ? "(trạng thái kết thúc)" : Arrays.toString(next.toArray());
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION, message);
    }
}
