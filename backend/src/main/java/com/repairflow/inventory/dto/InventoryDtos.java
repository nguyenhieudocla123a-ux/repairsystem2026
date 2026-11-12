package com.repairflow.inventory.dto;

import com.repairflow.inventory.entity.InventoryTransaction;
import com.repairflow.inventory.entity.InventoryTransactionType;
import com.repairflow.inventory.entity.Part;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

/** DTO kho linh kiện – docs/api-specification.md §9. */
public final class InventoryDtos {

    private InventoryDtos() {
    }

    public record PartRequest(
            @NotBlank(message = "Vui lòng nhập mã SKU") @Size(max = 50)
            @Pattern(regexp = "^[A-Za-z0-9\\-_.]+$", message = "SKU chỉ gồm chữ, số và - _ .") String sku,
            @NotBlank(message = "Vui lòng nhập tên linh kiện") @Size(max = 200) String name,
            @Size(max = 100) String category,
            @NotBlank(message = "Vui lòng nhập đơn vị") @Size(max = 20) String unit,
            @NotNull(message = "Vui lòng nhập giá nhập") @DecimalMin(value = "0", message = "Giá không được âm")
            @Digits(integer = 13, fraction = 2) BigDecimal costPrice,
            @NotNull(message = "Vui lòng nhập giá bán") @DecimalMin(value = "0", message = "Giá không được âm")
            @Digits(integer = 13, fraction = 2) BigDecimal sellingPrice,
            @NotNull @Min(value = 0, message = "Tồn tối thiểu không được âm") @Max(100000) Integer minStockLevel,
            /** Bắt buộc khi sửa (optimistic locking), bỏ qua khi tạo. */
            Long version) {
    }

    /**
     * costPrice chỉ trả cho ADMIN/STAFF; KTV nhận null (thông tin giá vốn là nội bộ kinh doanh).
     */
    public record PartResponse(Long id, String sku, String name, String category, String unit, BigDecimal costPrice,
                               BigDecimal sellingPrice, int quantityOnHand, int minStockLevel, boolean lowStock,
                               boolean active, Long version) {

        public static PartResponse from(Part p, boolean includeCost) {
            return new PartResponse(p.getId(), p.getSku(), p.getName(), p.getCategory(), p.getUnit(),
                    includeCost ? p.getCostPrice() : null, p.getSellingPrice(), p.getQuantityOnHand(),
                    p.getMinStockLevel(), p.isLowStock(), p.isActive(), p.getVersion());
        }
    }

    /** Danh sách gọn cho ô chọn linh kiện. */
    public record PartOption(Long id, String sku, String name, String unit, BigDecimal sellingPrice, int quantityOnHand) {

        public static PartOption from(Part p) {
            return new PartOption(p.getId(), p.getSku(), p.getName(), p.getUnit(), p.getSellingPrice(), p.getQuantityOnHand());
        }
    }

    public record ImportRequest(
            @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 1, message = "Số lượng phải lớn hơn 0")
            @Max(value = 100000) Integer quantity,
            @DecimalMin(value = "0", message = "Giá nhập không được âm") @Digits(integer = 13, fraction = 2) BigDecimal unitCost,
            @Size(max = 150) String supplierName,
            @Size(max = 2000) String note) {
    }

    public record AdjustRequest(
            @NotNull(message = "Vui lòng nhập số lượng thực tế") @Min(value = 0, message = "Tồn kho không được âm")
            @Max(value = 1000000) Integer newQuantity,
            @NotBlank(message = "Vui lòng nhập lý do điều chỉnh") @Size(max = 2000) String note) {
    }

    public record PartMovementRequest(
            @NotNull(message = "Vui lòng chọn linh kiện") Long partId,
            @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 1, message = "Số lượng phải lớn hơn 0")
            @Max(value = 1000) Integer quantity,
            @Size(max = 2000) String note) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record TransactionResponse(Long id, Long partId, String partSku, String partName,
                                      InventoryTransactionType type, int quantity, int balanceAfter, BigDecimal unitCost,
                                      Long repairOrderId, String repairOrderCode, String supplierName, String note,
                                      String createdByName, Instant createdAt) {

        public static TransactionResponse from(InventoryTransaction t, boolean includeCost) {
            return new TransactionResponse(t.getId(), t.getPart().getId(), t.getPart().getSku(), t.getPart().getName(),
                    t.getType(), t.getQuantity(), t.getBalanceAfter(), includeCost ? t.getUnitCost() : null,
                    t.getRepairOrder() == null ? null : t.getRepairOrder().getId(),
                    t.getRepairOrder() == null ? null : t.getRepairOrder().getCode(),
                    t.getSupplierName(), t.getNote(), t.getCreatedBy().getFullName(), t.getCreatedAt());
        }
    }

    public record PartUsageResponse(Long partId, String partSku, String partName, String unit, long quantityUsed) {
    }
}
