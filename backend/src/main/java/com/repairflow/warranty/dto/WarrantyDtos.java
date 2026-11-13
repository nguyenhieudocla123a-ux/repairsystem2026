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
import com.repairflow.inventory.entity.PartGrade;
import com.repairflow.warranty.entity.WarrantyItem;

/** DTO bảo hành – docs/api-specification.md §10. */
public final class WarrantyDtos {

    private WarrantyDtos() {
    }

    /** endDate / months của cả phiếu = dòng có hạn dài nhất; items: hạn của từng linh kiện / dịch vụ. */
    public record WarrantyResponse(Long id, String code, Long repairOrderId, String repairOrderCode, Long customerId,
                                   String customerName, DeviceSummary device, LocalDate startDate, LocalDate endDate,
                                   int months, String terms, WarrantyStatus status, String voidReason, boolean valid,
                                   long daysRemaining, Instant createdAt, List<WarrantyItemResponse> items) {

        public static WarrantyResponse from(Warranty w, LocalDate today) {
            boolean valid = w.isValidOn(today);
            return new WarrantyResponse(w.getId(), w.getCode(), w.getRepairOrder().getId(), w.getRepairOrder().getCode(),
                    w.getCustomer().getId(), w.getCustomer().getFullName(), DeviceSummary.from(w.getDevice()),
                    w.getStartDate(), w.getEndDate(), w.getMonths(), w.getTerms(), w.getStatus(), w.getVoidReason(),
                    valid, valid ? ChronoUnit.DAYS.between(today, w.getEndDate()) : 0, w.getCreatedAt(),
                    w.getItems().stream().map(i -> WarrantyItemResponse.from(i, today)).toList());
        }
    }

    public record WarrantyItemResponse(Long id, String description, PartGrade partGrade, int quantity, int months,
                                       LocalDate endDate, boolean valid, long daysRemaining, String exclusions) {

        public static WarrantyItemResponse from(WarrantyItem i, LocalDate today) {
            boolean valid = i.isValidOn(today);
            return new WarrantyItemResponse(i.getId(), i.getDescription(), i.getPartGrade(), i.getQuantity(), i.getMonths(),
                    i.getEndDate(), valid, valid ? ChronoUnit.DAYS.between(today, i.getEndDate()) : 0, i.getExclusions());
        }
    }

    /** Dòng gợi ý khi bàn giao (từ báo giá đã duyệt) – nhân viên có thể chỉnh số tháng trước khi cấp. */
    public record WarrantyItemSuggestion(Long partId, String description, String categoryName, PartGrade partGrade,
                                         int quantity, int months, String exclusions) {
    }

    public record WarrantyDetailResponse(WarrantyResponse warranty, List<WarrantyClaimResponse> claims, boolean canClaim) {
    }

    /** Tra cứu công khai: KHÔNG có thông tin cá nhân, serial bị che bớt. */
    public record PublicWarrantyCheckResponse(String warrantyCode, String deviceModel, String serialMasked,
                                              LocalDate startDate, LocalDate endDate, boolean valid, long daysRemaining,
                                              List<PublicWarrantyItem> items) {

        public static PublicWarrantyCheckResponse from(WarrantyResponse w) {
            String model = w.device().model() != null ? w.device().model() : w.device().name();
            return new PublicWarrantyCheckResponse(w.code(), model, mask(w.device().serialNumber()), w.startDate(),
                    w.endDate(), w.valid(), w.daysRemaining(),
                    w.items().stream().map(i -> new PublicWarrantyItem(i.description(), i.endDate(), i.valid())).toList());
        }

        static String mask(String serial) {
            if (serial == null || serial.length() <= 6) {
                return serial == null ? null : "*".repeat(serial.length());
            }
            return serial.substring(0, 4) + "*".repeat(serial.length() - 7) + serial.substring(serial.length() - 3);
        }
    }

    public record PublicWarrantyItem(String description, LocalDate endDate, boolean valid) {
    }

    public record WarrantyClaimResponse(Long id, String code, Long warrantyId, String warrantyCode, String customerName,
                                        String deviceName, Long warrantyItemId, String warrantyItemDescription,
                                        String issueDescription, WarrantyClaimStatus status,
                                        String resolutionNote, Long repairOrderId, String repairOrderCode,
                                        String createdByName, String handledByName, Instant createdAt,
                                        Instant resolvedAt) {

        public static WarrantyClaimResponse from(WarrantyClaim c) {
            Warranty w = c.getWarranty();
            return new WarrantyClaimResponse(c.getId(), c.getCode(), w.getId(), w.getCode(), w.getCustomer().getFullName(),
                    w.getDevice().getName(), c.getWarrantyItem() == null ? null : c.getWarrantyItem().getId(),
                    c.getWarrantyItem() == null ? null : c.getWarrantyItem().getDescription(),
                    c.getIssueDescription(), c.getStatus(), c.getResolutionNote(),
                    c.getRepairOrder() == null ? null : c.getRepairOrder().getId(),
                    c.getRepairOrder() == null ? null : c.getRepairOrder().getCode(),
                    c.getCreatedBy().getFullName(), c.getHandledBy() == null ? null : c.getHandledBy().getFullName(),
                    c.getCreatedAt(), c.getResolvedAt());
        }
    }

    /** warrantyItemId: linh kiện / dịch vụ bị lỗi (bắt buộc khi phiếu có nhiều dòng). */
    public record CreateClaimRequest(
            Long warrantyItemId,
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
