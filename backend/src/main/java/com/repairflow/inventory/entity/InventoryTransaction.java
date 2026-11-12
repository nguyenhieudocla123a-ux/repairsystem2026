package com.repairflow.inventory.entity;

import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.user.entity.User;
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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** Một biến động tồn kho. Bất biến sau khi ghi (sổ kho). */
@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false, updatable = false)
    private Part part;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private InventoryTransactionType type;

    @Column(nullable = false, updatable = false)
    private int quantity;

    @Column(name = "balance_after", nullable = false, updatable = false)
    private int balanceAfter;

    @Column(name = "unit_cost", precision = 15, scale = 2, updatable = false)
    private BigDecimal unitCost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_order_id", updatable = false)
    private RepairOrder repairOrder;

    @Column(name = "supplier_name", updatable = false)
    private String supplierName;

    @Column(columnDefinition = "text", updatable = false)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public InventoryTransaction(Part part, InventoryTransactionType type, int quantity, User createdBy) {
        this.part = part;
        this.type = type;
        this.quantity = quantity;
        this.balanceAfter = part.getQuantityOnHand();
        this.createdBy = createdBy;
    }
}
