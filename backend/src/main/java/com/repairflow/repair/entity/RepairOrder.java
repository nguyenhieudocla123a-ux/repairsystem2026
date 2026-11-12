package com.repairflow.repair.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.customer.entity.Customer;
import com.repairflow.device.entity.Device;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Phiếu sửa chữa – thực thể trung tâm của hệ thống.
 * Trạng thái chỉ được đổi qua service (kiểm tra bởi RepairStatusPolicy), không set tùy ý từ controller.
 */
@Entity
@Table(name = "repair_orders")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RepairOrder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_request_id", unique = true, updatable = false)
    private RepairRequest repairRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, updatable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false, updatable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private User technician;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepairStatus status = RepairStatus.RECEIVED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepairPriority priority = RepairPriority.NORMAL;

    @Column(name = "reported_issue", nullable = false, columnDefinition = "text")
    private String reportedIssue;

    @Column(name = "device_condition", columnDefinition = "text")
    private String deviceCondition;

    private String accessories;

    @Column(columnDefinition = "text")
    private String diagnosis;

    @Column(columnDefinition = "text")
    private String solution;

    @Column(name = "is_warranty_repair", nullable = false)
    private boolean warrantyRepair;

    @Column(name = "expected_return_date")
    private LocalDate expectedReturnDate;

    @Column(name = "final_amount", precision = 15, scale = 2)
    private BigDecimal finalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "cancel_reason", columnDefinition = "text")
    private String cancelReason;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Version
    private Long version;

    public RepairOrder(String code, Customer customer, Device device, User createdBy, String reportedIssue) {
        this.code = code;
        this.customer = customer;
        this.device = device;
        this.createdBy = createdBy;
        this.reportedIssue = reportedIssue;
        this.receivedAt = Instant.now();
    }
}
