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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Yêu cầu sửa chữa khách gửi online, được STAFF chuyển thành phiếu khi khách mang máy tới. */
@Entity
@Table(name = "repair_requests")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RepairRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "issue_description", nullable = false, columnDefinition = "text")
    private String issueDescription;

    @Column(name = "expected_drop_off_date")
    private LocalDate expectedDropOffDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepairRequestStatus status = RepairRequestStatus.PENDING;

    @Column(name = "reject_reason", columnDefinition = "text")
    private String rejectReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private User handledBy;

    @Version
    private Long version;

    public RepairRequest(String code, Customer customer, Device device, String issueDescription) {
        this.code = code;
        this.customer = customer;
        this.device = device;
        this.issueDescription = issueDescription;
    }
}
