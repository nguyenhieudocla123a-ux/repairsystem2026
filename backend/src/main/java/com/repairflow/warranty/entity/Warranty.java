package com.repairflow.warranty.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.customer.entity.Customer;
import com.repairflow.device.entity.Device;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "warranties")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Warranty extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_order_id", nullable = false, unique = true, updatable = false)
    private RepairOrder repairOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, updatable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false, updatable = false)
    private Device device;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private int months;

    @Column(columnDefinition = "text")
    private String terms;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WarrantyStatus status = WarrantyStatus.ACTIVE;

    @Column(name = "void_reason", columnDefinition = "text")
    private String voidReason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @Version
    private Long version;

    public Warranty(String code, RepairOrder repairOrder, LocalDate startDate, int months, User createdBy) {
        this.code = code;
        this.repairOrder = repairOrder;
        this.customer = repairOrder.getCustomer();
        this.device = repairOrder.getDevice();
        this.startDate = startDate;
        this.months = months;
        this.endDate = startDate.plusMonths(months);
        this.createdBy = createdBy;
    }

    /** Còn hiệu lực tại ngày {@code today}: chưa bị hủy và chưa quá ngày kết thúc. */
    public boolean isValidOn(LocalDate today) {
        return status == WarrantyStatus.ACTIVE && !today.isAfter(endDate);
    }
}
