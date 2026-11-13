package com.repairflow.quotation.entity;

import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartGrade;
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
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quotation_items")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuotationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quotation_id", nullable = false, updatable = false)
    private Quotation quotation;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private QuotationItemType itemType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id")
    private Part part;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineTotal;

    /** Loại linh kiện + số tháng bảo hành tại thời điểm báo giá – điều khách đã đồng ý khi duyệt. */
    @Enumerated(EnumType.STRING)
    @Column(name = "part_grade")
    private PartGrade partGrade;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    public QuotationItem(Quotation quotation, QuotationItemType itemType, Part part, String description,
                         int quantity, BigDecimal unitPrice) {
        this.quotation = quotation;
        this.itemType = itemType;
        this.part = part;
        this.description = description;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        if (part != null) {
            this.partGrade = part.getGrade();
            this.warrantyMonths = part.effectiveWarrantyMonths();
        }
    }
}
