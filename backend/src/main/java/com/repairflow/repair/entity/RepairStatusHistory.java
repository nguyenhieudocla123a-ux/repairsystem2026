package com.repairflow.repair.entity;

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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/** Một lần chuyển trạng thái phiếu (audit history, hiển thị dạng timeline). Bất biến. */
@Entity
@Table(name = "repair_status_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RepairStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_order_id", nullable = false, updatable = false)
    private RepairOrder repairOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", updatable = false)
    private RepairStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, updatable = false)
    private RepairStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false, updatable = false)
    private User changedBy;

    @Column(columnDefinition = "text", updatable = false)
    private String note;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    public RepairStatusHistory(RepairOrder repairOrder, RepairStatus fromStatus, RepairStatus toStatus,
                               User changedBy, String note) {
        this.repairOrder = repairOrder;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedBy = changedBy;
        this.note = note;
    }
}
