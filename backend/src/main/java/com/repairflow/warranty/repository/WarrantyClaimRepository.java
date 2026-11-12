package com.repairflow.warranty.repository;

import com.repairflow.warranty.entity.WarrantyClaim;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, Long> {

    @EntityGraph(attributePaths = {"repairOrder", "createdBy", "handledBy"})
    List<WarrantyClaim> findByWarrantyIdOrderByCreatedAtDesc(Long warrantyId);

    boolean existsByWarrantyIdAndStatusIn(Long warrantyId, Collection<WarrantyClaimStatus> statuses);

    Optional<WarrantyClaim> findByRepairOrderId(Long repairOrderId);

    @EntityGraph(attributePaths = {"warranty", "warranty.customer", "warranty.customer.user", "warranty.device",
            "repairOrder", "createdBy", "handledBy"})
    Optional<WarrantyClaim> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"warranty", "warranty.customer", "warranty.device", "repairOrder", "createdBy", "handledBy"})
    Page<WarrantyClaim> findByStatusInOrderByCreatedAtDesc(Collection<WarrantyClaimStatus> statuses, Pageable pageable);

    long countByStatus(WarrantyClaimStatus status);
}
