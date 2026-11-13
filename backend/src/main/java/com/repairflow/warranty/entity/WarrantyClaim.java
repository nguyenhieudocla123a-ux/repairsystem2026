package com.repairflow.warranty.entity;

import com.repairflow.common.audit.BaseEntity;
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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "warranty_claims")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WarrantyClaim extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warranty_id", nullable = false, updatable = false)
    private Warranty warranty;

    /** Dòng (linh kiện) khách báo lỗi – kiểm tra theo hạn của chính dòng này. null = yêu cầu cũ trước V9. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_item_id")
    private WarrantyItem warrantyItem;

    @Column(name = "issue_description", nullable = false, columnDefinition = "text")
    private String issueDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WarrantyClaimStatus status = WarrantyClaimStatus.SUBMITTED;

    @Column(name = "resolution_note", columnDefinition = "text")
    private String resolutionNote;

    /** Phiếu sửa chữa bảo hành được tạo khi claim được chấp nhận. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_order_id", unique = true)
    private RepairOrder repairOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private User handledBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Version
    private Long version;

    public WarrantyClaim(String code, Warranty warranty, String issueDescription, User createdBy) {
        this.code = code;
        this.warranty = warranty;
        this.issueDescription = issueDescription;
        this.createdBy = createdBy;
    }
}
