package com.repairflow.inventory.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.device.entity.DeviceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "parts")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Part extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private PartCategory category;

    /** null = dùng chung nhiều loại thiết bị */
    @Enumerated(EnumType.STRING)
    @Column(name = "device_type")
    private DeviceType deviceType;

    @Enumerated(EnumType.STRING)
    private PartGrade grade;

    private String brand;

    @Column(name = "compatible_models")
    private String compatibleModels;

    /** Lần cập nhật ảnh gần nhất; null = chưa có ảnh thật (frontend dùng ảnh mặc định của nhóm). */
    @Column(name = "image_updated_at")
    private Instant imageUpdatedAt;

    /** Bảo hành riêng của linh kiện; null = theo nhóm. */
    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(nullable = false)
    private String unit = "cái";

    @Column(name = "cost_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "selling_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal sellingPrice = BigDecimal.ZERO;

    /** Không có setter công khai: tồn kho chỉ thay đổi qua increase/decrease để luôn đi kèm giao dịch kho. */
    @Setter(AccessLevel.NONE)
    @Column(name = "quantity_on_hand", nullable = false)
    private int quantityOnHand;

    @Column(name = "min_stock_level", nullable = false)
    private int minStockLevel;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    private Long version;

    public Part(String sku, String name) {
        this.sku = sku;
        this.name = name;
    }

    public void increaseStock(int quantity) {
        if (quantity <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Số lượng phải lớn hơn 0");
        }
        this.quantityOnHand += quantity;
    }

    public void decreaseStock(int quantity) {
        if (quantity <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Số lượng phải lớn hơn 0");
        }
        if (quantity > quantityOnHand) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_STOCK,
                    "Linh kiện " + sku + " chỉ còn " + quantityOnHand + ", không đủ để xuất " + quantity);
        }
        this.quantityOnHand -= quantity;
    }

    /** Số tháng bảo hành áp dụng: riêng của linh kiện → mặc định của nhóm → 0 (chưa phân nhóm). */
    public int effectiveWarrantyMonths() {
        if (warrantyMonths != null) {
            return warrantyMonths;
        }
        return category == null ? 0 : category.getDefaultWarrantyMonths();
    }

    public boolean isLowStock() {
        return quantityOnHand <= minStockLevel;
    }
}
