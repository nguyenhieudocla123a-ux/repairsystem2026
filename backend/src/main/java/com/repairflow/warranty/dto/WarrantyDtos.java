package com.repairflow.warranty.dto;

import com.repairflow.device.dto.DeviceDtos.DeviceSummary;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.warranty.entity.Warranty;
import com.repairflow.warranty.entity.WarrantyClaim;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import com.repairflow.warranty.entity.WarrantyStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** DTO bảo hành – docs/api-specification.md §10. */
public final class WarrantyDtos {

    private WarrantyDtos() {
    }

    public record WarrantyResponse(Long id, String code, Long repairOrderId, String repairOrderCode, Long customerId,
                                   String customerName, DeviceSummary device, LocalDate startDate, LocalDate endDate,
                                   int months, String terms, WarrantyStatus status, String voidReason, boolean valid,
                                   long daysRemaining, Instant createdAt) {

        public static WarrantyResponse from(Warranty w, LocalDate today) {
            boolean valid = w.isValidOn(today);
            return new WarrantyResponse(w.getId(), w.getCode(), w.getRepairOrder().getId(), w.getRepairOrder().getCode(),
                    w.getCustomer().getId(), w.getCustomer().getFullName(), DeviceSummary.from(w.getDevice()),
                    w.getStartDate(), w.getEndDate(), w.getMonths(), w.getTerms(), w.getStatus(), w.getVoidReason(),
                    valid, valid ? ChronoUnit.DAYS.between(today, w.getEndDate()) : 0, w.getCreatedAt());
        }
    }

    public record WarrantyDetailResponse(WarrantyResponse warranty, List<WarrantyClaimResponse> claims, boolean canClaim) {
    }

    /** Tra cứu công khai: KHÔNG có thông tin cá nhân, serial bị che bớt. */
    public record PublicWarrantyCheckResponse(String warrantyCode, String deviceModel, String serialMasked,
                                              LocalDate startDate, LocalDate endDate, boolean valid, long daysRemaining) {

        public static PublicWarrantyCheckResponse from(WarrantyResponse w) {
            String model = w.device().model() != null ? w.device().model() : w.device().name();
            return new PublicWarrantyCheckResponse(w.code(), model, mask(w.device().serialNumber()), w.startDate(),
                    w.endDate(), w.valid(), w.daysRemaining());
        }

        static String mask(String serial) {
            if (serial == null || serial.length() <= 6) {
                return serial == null ? null : "*".repeat(serial.length());
            }
            return serial.substring(0, 4) + "*".repeat(serial.length() - 7) + serial.substring(serial.length() - 3);
        }
    }

    public record WarrantyClaimResponse(Long id, String code, Long warrantyId, String warrantyCode, String customerName,
                                        String deviceName, String issueDescription, WarrantyClaimStatus status,
                                        String resolutionNote, Long repairOrderId, String repairOrderCode,
                                        String createdByName, String handledByName, Instant createdAt,
                                        Instant resolvedAt) {

        public static WarrantyClaimResponse from(WarrantyClaim c) {
            Warranty w = c.getWarranty();
            return new WarrantyClaimResponse(c.getId(), c.getCode(), w.getId(), w.getCode(), w.getCustomer().getFullName(),
                    w.getDevice().getName(), c.getIssueDescription(), c.getStatus(), c.getResolutionNote(),
                    c.getRepairOrder() == null ? null : c.getRepairOrder().getId(),
                    c.getRepairOrder() == null ? null : c.getRepairOrder().getCode(),
                    c.getCreatedBy().getFullName(), c.getHandledBy() == null ? null : c.getHandledBy().getFullName(),
                    c.getCreatedAt(), c.getResolvedAt());
        }
    }

    public record CreateClaimRequest(
            @NotBlank(message = "Vui lòng mô tả lỗi cần bảo hành") @Size(max = 2000) String issueDescription) {
    }

    public record AcceptClaimRequest(
            Long technicianId,
            @Size(max = 2000) String deviceCondition,
            RepairPriority priority,
            @Size(max = 2000) String note) {
    }

    public record ReasonRequest(@NotBlank(message = "Vui lòng nhập lý do") @Size(max = 2000) String reason) {
    }
}
