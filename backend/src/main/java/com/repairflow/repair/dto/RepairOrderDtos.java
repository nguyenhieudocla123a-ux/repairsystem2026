package com.repairflow.repair.dto;

import com.repairflow.customer.dto.CustomerDtos.CustomerBrief;
import com.repairflow.device.dto.DeviceDtos.DeviceSummary;
import com.repairflow.repair.entity.PaymentMethod;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.entity.RepairStatusHistory;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

/** DTO phiếu sửa chữa – docs/api-specification.md §7. */
public final class RepairOrderDtos {

    private RepairOrderDtos() {
    }

    /** Thông tin tiếp nhận dùng chung cho tạo phiếu tại quầy và chuyển yêu cầu online thành phiếu. */
    public record ReceptionInfo(
            @NotBlank(message = "Vui lòng mô tả lỗi khách báo") @Size(max = 2000) String reportedIssue,
            @Size(max = 2000, message = "Tối đa 2000 ký tự") String deviceCondition,
            @Size(max = 255, message = "Tối đa 255 ký tự") String accessories,
            RepairPriority priority,
            @FutureOrPresent(message = "Ngày hẹn trả không được ở quá khứ") LocalDate expectedReturnDate,
            Long technicianId) {
    }

    public record CreateRepairOrderRequest(
            @NotNull(message = "Vui lòng chọn khách hàng") Long customerId,
            @NotNull(message = "Vui lòng chọn thiết bị") Long deviceId,
            @NotBlank(message = "Vui lòng mô tả lỗi khách báo") @Size(max = 2000) String reportedIssue,
            @Size(max = 2000, message = "Tối đa 2000 ký tự") String deviceCondition,
            @Size(max = 255, message = "Tối đa 255 ký tự") String accessories,
            RepairPriority priority,
            @FutureOrPresent(message = "Ngày hẹn trả không được ở quá khứ") LocalDate expectedReturnDate,
            Long technicianId) {

        public ReceptionInfo reception() {
            return new ReceptionInfo(reportedIssue, deviceCondition, accessories, priority, expectedReturnDate, technicianId);
        }
    }

    /** Sửa thông tin tiếp nhận. version: optimistic locking phía client (người khác sửa trước → 409). */
    public record UpdateRepairOrderRequest(
            @NotBlank(message = "Vui lòng mô tả lỗi khách báo") @Size(max = 2000) String reportedIssue,
            @Size(max = 2000) String deviceCondition,
            @Size(max = 255) String accessories,
            @NotNull(message = "Vui lòng chọn độ ưu tiên") RepairPriority priority,
            LocalDate expectedReturnDate,
            @NotNull(message = "Thiếu version") Long version) {
    }

    public record AssignTechnicianRequest(@NotNull(message = "Vui lòng chọn kỹ thuật viên") Long technicianId) {
    }

    public record DiagnosisRequest(
            @Size(max = 4000, message = "Tối đa 4000 ký tự") String diagnosis,
            @Size(max = 4000, message = "Tối đa 4000 ký tự") String solution) {
    }

    public record TransitionRequest(
            @NotNull(message = "Vui lòng chọn trạng thái") RepairStatus toStatus,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String note,
            @NotNull(message = "Thiếu version") Long version) {
    }

    public record CancelRequest(@NotBlank(message = "Vui lòng nhập lý do hủy") @Size(max = 2000) String reason) {
    }

    public record UserBrief(Long id, String fullName) {

        public static UserBrief from(User u) {
            return u == null ? null : new UserBrief(u.getId(), u.getFullName());
        }
    }

    public record RepairOrderSummaryResponse(Long id, String code, RepairStatus status, RepairPriority priority,
                                             Long customerId, String customerName, String customerPhone,
                                             Long deviceId, String deviceName, Long technicianId, String technicianName,
                                             boolean warrantyRepair, LocalDate expectedReturnDate,
                                             Instant receivedAt, Instant updatedAt) {

        public static RepairOrderSummaryResponse from(RepairOrder o) {
            User tech = o.getTechnician();
            return new RepairOrderSummaryResponse(o.getId(), o.getCode(), o.getStatus(), o.getPriority(),
                    o.getCustomer().getId(), o.getCustomer().getFullName(), o.getCustomer().getPhone(),
                    o.getDevice().getId(), o.getDevice().getName(),
                    tech == null ? null : tech.getId(), tech == null ? null : tech.getFullName(),
                    o.isWarrantyRepair(), o.getExpectedReturnDate(), o.getReceivedAt(), o.getUpdatedAt());
        }
    }

    public record RepairOrderDetailResponse(
            Long id, String code, RepairStatus status, RepairPriority priority,
            CustomerBrief customer, DeviceSummary device, UserBrief technician, UserBrief createdBy,
            String reportedIssue, String deviceCondition, String accessories, String diagnosis, String solution,
            boolean warrantyRepair, LocalDate expectedReturnDate,
            BigDecimal finalAmount, PaymentMethod paymentMethod, String cancelReason,
            Instant receivedAt, Instant completedAt, Instant deliveredAt, Instant updatedAt,
            Long repairRequestId,
            /** Trạng thái người dùng hiện tại có thể chuyển thủ công (TD-07). */
            Set<RepairStatus> allowedTransitions,
            /** Có được sửa thông tin tiếp nhận / phân công / ghi chẩn đoán hay không. */
            boolean canEditReception, boolean canAssign, boolean canDiagnose,
            Long version) {
    }

    public record StatusHistoryResponse(Long id, RepairStatus fromStatus, RepairStatus toStatus, String changedByName,
                                        Role changedByRole, String note, Instant changedAt) {

        public static StatusHistoryResponse from(RepairStatusHistory h) {
            return new StatusHistoryResponse(h.getId(), h.getFromStatus(), h.getToStatus(),
                    h.getChangedBy().getFullName(), h.getChangedBy().getRole(), h.getNote(), h.getChangedAt());
        }
    }
}
