package com.repairflow.quotation.dto;

import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationItem;
import com.repairflow.quotation.entity.QuotationItemType;
import com.repairflow.quotation.entity.QuotationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** DTO báo giá – docs/api-specification.md §8. */
public final class QuotationDtos {

    private QuotationDtos() {
    }

    public record QuotationItemRequest(
            @NotNull(message = "Vui lòng chọn loại dòng") QuotationItemType itemType,
            Long partId,
            @Size(max = 255, message = "Mô tả tối đa 255 ký tự") String description,
            @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 1, message = "Số lượng phải lớn hơn 0")
            @Max(value = 1000) Integer quantity,
            /** Bỏ trống với dòng PART → lấy giá bán hiện tại của linh kiện. */
            @DecimalMin(value = "0", message = "Đơn giá không được âm") @Digits(integer = 13, fraction = 2) BigDecimal unitPrice) {
    }

    public record QuotationRequest(
            @NotEmpty(message = "Báo giá phải có ít nhất 1 dòng") @Size(max = 50) List<@Valid QuotationItemRequest> items,
            @DecimalMin(value = "0", message = "Giảm giá không được âm") @Digits(integer = 13, fraction = 2) BigDecimal discount,
            @Size(max = 2000) String note,
            @FutureOrPresent(message = "Hạn báo giá không được ở quá khứ") LocalDate validUntil) {
    }

    /** Khách phản hồi; nhân viên phản hồi thay khách thì bắt buộc ghi chú (VD "Khách đồng ý qua điện thoại"). */
    public record RespondRequest(@Size(max = 2000) String note) {
    }

    public record QuotationItemResponse(Long id, QuotationItemType itemType, Long partId, String partSku,
                                        String description, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {

        public static QuotationItemResponse from(QuotationItem i) {
            return new QuotationItemResponse(i.getId(), i.getItemType(), i.getPart() == null ? null : i.getPart().getId(),
                    i.getPart() == null ? null : i.getPart().getSku(), i.getDescription(), i.getQuantity(),
                    i.getUnitPrice(), i.getLineTotal());
        }
    }

    public record QuotationResponse(Long id, Long repairOrderId, String repairOrderCode, int versionNo,
                                    QuotationStatus status, List<QuotationItemResponse> items, BigDecimal laborTotal,
                                    BigDecimal partsTotal, BigDecimal discount, BigDecimal totalAmount, String note,
                                    LocalDate validUntil, String customerResponseNote, String createdByName,
                                    String respondedByName, Instant sentAt, Instant respondedAt, Instant createdAt,
                                    Long version) {

        public static QuotationResponse from(Quotation q) {
            return new QuotationResponse(q.getId(), q.getRepairOrder().getId(), q.getRepairOrder().getCode(),
                    q.getVersionNo(), q.getStatus(), q.getItems().stream().map(QuotationItemResponse::from).toList(),
                    q.getLaborTotal(), q.getPartsTotal(), q.getDiscount(), q.getTotalAmount(), q.getNote(),
                    q.getValidUntil(), q.getCustomerResponseNote(), q.getCreatedBy().getFullName(),
                    q.getRespondedBy() == null ? null : q.getRespondedBy().getFullName(),
                    q.getSentAt(), q.getRespondedAt(), q.getCreatedAt(), q.getVersion());
        }
    }

    /** Dòng trong danh sách báo giá toàn hệ thống (không kèm chi tiết dòng). */
    public record QuotationSummary(Long id, Long repairOrderId, String repairOrderCode, String customerName,
                                  int versionNo, QuotationStatus status, BigDecimal totalAmount, Instant sentAt,
                                  Instant respondedAt, Instant createdAt) {

        public static QuotationSummary from(Quotation q) {
            return new QuotationSummary(q.getId(), q.getRepairOrder().getId(), q.getRepairOrder().getCode(),
                    q.getRepairOrder().getCustomer().getFullName(), q.getVersionNo(), q.getStatus(), q.getTotalAmount(),
                    q.getSentAt(), q.getRespondedAt(), q.getCreatedAt());
        }
    }
}
