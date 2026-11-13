package com.repairflow.warranty.entity;

import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
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
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một dòng bảo hành: một linh kiện đã thay hoặc công sửa chữa, có hạn riêng.
 * Mô tả / loại linh kiện / số tháng / điều kiện từ chối được LƯU CỐ ĐỊNH lúc cấp – chỉnh danh mục sau này
 * không làm thay đổi bảo hành đã cấp cho khách.
 */
@Entity
@Table(name = "warranty_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WarrantyItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warranty_id", nullable = false, updatable = false)
    private Warranty warranty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", updatable = false)
    private Part part;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", updatable = false)
    private PartCategory category;

    @Column(nullable = false, updatable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "part_grade", updatable = false)
    private PartGrade partGrade;

    @Column(nullable = false, updatable = false)
    private int quantity;

    @Column(nullable = false, updatable = false)
    private int months;

    @Column(name = "end_date", nullable = false, updatable = false)
    private LocalDate endDate;

    @Column(columnDefinition = "text", updatable = false)
    private String exclusions;

    public WarrantyItem(Warranty warranty, Part part, PartCategory category, String description, PartGrade partGrade,
                        int quantity, int months, String exclusions) {
        this.warranty = warranty;
        this.part = part;
        this.category = category;
        this.description = description;
        this.partGrade = partGrade;
        this.quantity = quantity;
        this.months = months;
        this.endDate = warranty.getStartDate().plusMonths(months);
        this.exclusions = exclusions;
    }

    /** Còn bảo hành: phiếu chưa bị hủy và dòng này chưa quá hạn. */
    public boolean isValidOn(LocalDate today) {
        return warranty.getStatus() == WarrantyStatus.ACTIVE && !today.isAfter(endDate);
    }
}
