package com.repairflow.quotation.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.user.entity.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một phiên bản báo giá của phiếu sửa chữa. Tổng tiền luôn được tính lại ở Backend từ các dòng. */
@Entity
@Table(name = "quotations")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quotation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_order_id", nullable = false, updatable = false)
    private RepairOrder repairOrder;

    @Column(name = "version_no", nullable = false, updatable = false)
    private int versionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuotationStatus status = QuotationStatus.DRAFT;

    @Column(name = "labor_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal laborTotal = BigDecimal.ZERO;

    @Column(name = "parts_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal partsTotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "customer_response_note", columnDefinition = "text")
    private String customerResponseNote;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by")
    private User respondedBy;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<QuotationItem> items = new ArrayList<>();

    public Quotation(RepairOrder repairOrder, int versionNo, User createdBy) {
        this.repairOrder = repairOrder;
        this.versionNo = versionNo;
        this.createdBy = createdBy;
    }
}
