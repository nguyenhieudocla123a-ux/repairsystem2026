package com.repairflow.inventory.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
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

    private String category;

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

    public boolean isLowStock() {
        return quantityOnHand <= minStockLevel;
    }
}
