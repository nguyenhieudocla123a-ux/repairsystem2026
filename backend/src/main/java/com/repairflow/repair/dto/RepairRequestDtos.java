package com.repairflow.repair.dto;

import com.repairflow.device.dto.DeviceDtos.DeviceSummary;
import com.repairflow.repair.entity.RepairRequest;
import com.repairflow.repair.entity.RepairRequestStatus;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

/** DTO yêu cầu sửa chữa online – docs/api-specification.md §6. */
public final class RepairRequestDtos {

    private RepairRequestDtos() {
    }

    public record CreateRepairRequestRequest(
            @NotNull(message = "Vui lòng chọn thiết bị") Long deviceId,
            @NotBlank(message = "Vui lòng mô tả lỗi") @Size(max = 2000, message = "Tối đa 2000 ký tự") String issueDescription,
            @FutureOrPresent(message = "Ngày mang máy tới không được ở quá khứ") LocalDate expectedDropOffDate) {
    }

    public record RejectRepairRequestRequest(
            @NotBlank(message = "Vui lòng nhập lý do") @Size(max = 2000) String reason) {
    }

    public record RepairRequestResponse(Long id, String code, Long customerId, String customerName, String customerPhone,
                                        DeviceSummary device, String issueDescription, LocalDate expectedDropOffDate,
                                        RepairRequestStatus status, Long repairOrderId, String repairOrderCode,
                                        String rejectReason, Instant createdAt) {

        public static RepairRequestResponse from(RepairRequest r, Long orderId, String orderCode) {
            return new RepairRequestResponse(r.getId(), r.getCode(), r.getCustomer().getId(),
                    r.getCustomer().getFullName(), r.getCustomer().getPhone(), DeviceSummary.from(r.getDevice()),
                    r.getIssueDescription(), r.getExpectedDropOffDate(), r.getStatus(), orderId, orderCode,
                    r.getRejectReason(), r.getCreatedAt());
        }
    }
}
