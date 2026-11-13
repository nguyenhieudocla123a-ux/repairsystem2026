package com.repairflow.inventory.dto;

import com.repairflow.inventory.entity.InventoryTransaction;
import com.repairflow.inventory.entity.InventoryTransactionType;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.inventory.entity.PartGrade;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

/** DTO kho linh kiện – docs/api-specification.md §9. */
public final class InventoryDtos {

    private InventoryDtos() {
    }

    public record PartRequest(
            @NotBlank(message = "Vui lòng nhập mã SKU") @Size(max = 50)
            @Pattern(regexp = "^[A-Za-z0-9\\-_.]+$", message = "SKU chỉ gồm chữ, số và - _ .") String sku,
            @NotBlank(message = "Vui lòng nhập tên linh kiện") @Size(max = 200) String name,
            @NotNull(message = "Vui lòng chọn nhóm linh kiện") Long categoryId,
            /** null = dùng chung nhiều loại thiết bị */
            DeviceType deviceType,
            @NotNull(message = "Vui lòng chọn loại linh kiện (chính hãng / zin / thay thế)") PartGrade grade,
            @Size(max = 100, message = "Thương hiệu tối đa 100 ký tự") String brand,
            @Size(max = 500, message = "Model tương thích tối đa 500 ký tự") String compatibleModels,
            /** null = theo bảo hành mặc định của nhóm */
            @Min(value = 0, message = "Bảo hành từ 0 đến 120 tháng") @Max(value = 120, message = "Bảo hành từ 0 đến 120 tháng")
            Integer warrantyMonths,
            @NotBlank(message = "Vui lòng nhập đơn vị") @Size(max = 20) String unit,
            @NotNull(message = "Vui lòng nhập giá nhập") @DecimalMin(value = "0", message = "Giá không được âm")
            @Digits(integer = 13, fraction = 2) BigDecimal costPrice,
            @NotNull(message = "Vui lòng nhập giá bán") @DecimalMin(value = "0", message = "Giá không được âm")
            @Digits(integer = 13, fraction = 2) BigDecimal sellingPrice,
            @NotNull @Min(value = 0, message = "Tồn tối thiểu không được âm") @Max(100000) Integer minStockLevel,
            /** Chỉ dùng khi TẠO: số lượng nhập ban đầu → ghi sổ kho "Nhập kho – tồn đầu kỳ" (giá = giá nhập). */
            @Min(value = 0, message = "Số lượng không được âm") @Max(value = 100000) Integer initialQuantity,
            /** Chỉ dùng khi TẠO cùng initialQuantity. */
            @Size(max = 150) String supplierName,
            /** Bắt buộc khi sửa (optimistic locking), bỏ qua khi tạo. */
            Long version) {
    }

    /**
     * costPrice chỉ trả cho ADMIN/STAFF; KTV nhận null (thông tin giá vốn là nội bộ kinh doanh).
     */
    public record PartResponse(Long id, String sku, String name, Long categoryId, String categoryCode,
                               String categoryName, DeviceType deviceType, PartGrade grade, String brand,
                               String compatibleModels, Integer warrantyMonths, int effectiveWarrantyMonths,
                               String unit, BigDecimal costPrice, BigDecimal sellingPrice, int quantityOnHand,
                               int minStockLevel, boolean lowStock, boolean active, Instant imageUpdatedAt,
                               Long version) {

        public static PartResponse from(Part p, boolean includeCost) {
            PartCategory c = p.getCategory();
            return new PartResponse(p.getId(), p.getSku(), p.getName(), c == null ? null : c.getId(),
                    c == null ? null : c.getCode(), c == null ? null : c.getName(), p.getDeviceType(), p.getGrade(),
                    p.getBrand(), p.getCompatibleModels(), p.getWarrantyMonths(), p.effectiveWarrantyMonths(),
                    p.getUnit(), includeCost ? p.getCostPrice() : null, p.getSellingPrice(), p.getQuantityOnHand(),
                    p.getMinStockLevel(), p.isLowStock(), p.isActive(), p.getImageUpdatedAt(), p.getVersion());
        }
    }

    /** Nhóm linh kiện + bảo hành mặc định (danh mục chuẩn – docs/parts-and-warranty-research.md). */
    /** partCount / stockQuantity: số linh kiện đang kinh doanh và tổng tồn kho của nhóm. */
    public record PartCategoryResponse(Long id, String code, String name, Set<DeviceType> deviceTypes,
                                       int defaultWarrantyMonths, String warrantyScope, String exclusions,
                                       int sortOrder, boolean active, Long version, long partCount,
                                       long stockQuantity) {

        public static PartCategoryResponse from(PartCategory c) {
            return from(c, 0, 0);
        }

        public static PartCategoryResponse from(PartCategory c, long partCount, long stockQuantity) {
            return new PartCategoryResponse(c.getId(), c.getCode(), c.getName(), c.getDeviceTypes(),
                    c.getDefaultWarrantyMonths(), c.getWarrantyScope(), c.getExclusions(), c.getSortOrder(),
                    c.isActive(), c.getVersion(), partCount, stockQuantity);
        }
    }

    /** ADMIN thêm/sửa nhóm. code chỉ dùng khi tạo mới (không đổi được – là khoá ổn định). */
    public record PartCategoryRequest(
            @Size(max = 30) @Pattern(regexp = "^[A-Z0-9_]*$", message = "Mã nhóm chỉ gồm chữ IN HOA, số và _") String code,
            @NotBlank(message = "Vui lòng nhập tên nhóm") @Size(max = 100) String name,
            @NotEmpty(message = "Chọn ít nhất một loại thiết bị") Set<DeviceType> deviceTypes,
            @NotNull(message = "Vui lòng nhập số tháng bảo hành")
            @Min(value = 0, message = "Bảo hành từ 0 đến 120 tháng") @Max(value = 120, message = "Bảo hành từ 0 đến 120 tháng")
            Integer defaultWarrantyMonths,
            @Size(max = 2000) String warrantyScope,
            @Size(max = 2000) String exclusions,
            @Min(0) @Max(10000) Integer sortOrder,
            Boolean active,
            Long version) {
    }

    /** Danh sách gọn cho ô chọn linh kiện. */
    public record PartOption(Long id, String sku, String name, String unit, BigDecimal sellingPrice, int quantityOnHand,
                             String categoryCode, String categoryName, DeviceType deviceType, PartGrade grade,
                             int warrantyMonths, Instant imageUpdatedAt) {

        public static PartOption from(Part p) {
            return new PartOption(p.getId(), p.getSku(), p.getName(), p.getUnit(), p.getSellingPrice(), p.getQuantityOnHand(),
                    p.getCategory() == null ? null : p.getCategory().getCode(),
                    p.getCategory() == null ? null : p.getCategory().getName(), p.getDeviceType(), p.getGrade(),
                    p.effectiveWarrantyMonths(), p.getImageUpdatedAt());
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

    public record TransactionResponse(Long id, Long partId, String partSku, String partName, String partUnit,
                                      String partCategoryCode, Instant partImageUpdatedAt,
                                      InventoryTransactionType type, int quantity, int balanceAfter, BigDecimal unitCost,
                                      Long repairOrderId, String repairOrderCode, String supplierName, String note,
                                      String createdByName, Instant createdAt) {

        public static TransactionResponse from(InventoryTransaction t, boolean includeCost) {
            Part p = t.getPart();
            return new TransactionResponse(t.getId(), p.getId(), p.getSku(), p.getName(), p.getUnit(),
                    p.getCategory() == null ? null : p.getCategory().getCode(), p.getImageUpdatedAt(),
                    t.getType(), t.getQuantity(), t.getBalanceAfter(), includeCost ? t.getUnitCost() : null,
                    t.getRepairOrder() == null ? null : t.getRepairOrder().getId(),
                    t.getRepairOrder() == null ? null : t.getRepairOrder().getCode(),
                    t.getSupplierName(), t.getNote(), t.getCreatedBy().getFullName(), t.getCreatedAt());
        }
    }

    /**
     * Tổng hợp sổ kho theo bộ lọc (linh kiện, loại, khoảng ngày): số lượng + giá trị (theo giá nhập ghi trên từng dòng).
     * stockQuantity / stockValue: tồn hiện tại (của linh kiện đang lọc hoặc toàn kho đang kinh doanh) × giá nhập gần nhất.
     */
    public record LedgerSummary(long importQuantity, BigDecimal importValue, long exportQuantity, BigDecimal exportValue,
                                long returnQuantity, BigDecimal returnValue, long adjustmentQuantity, long transactionCount,
                                long stockQuantity, BigDecimal stockValue) {
    }

    public record PartUsageResponse(Long partId, String partSku, String partName, String unit, long quantityUsed) {
    }
}
