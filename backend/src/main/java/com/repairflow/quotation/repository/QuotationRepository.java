package com.repairflow.quotation.repository;

import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuotationRepository extends JpaRepository<Quotation, Long>, JpaSpecificationExecutor<Quotation> {

    @Override
    @EntityGraph(attributePaths = {"repairOrder", "repairOrder.customer", "createdBy"})
    Page<Quotation> findAll(Specification<Quotation> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"items", "createdBy", "respondedBy"})
    List<Quotation> findByRepairOrderIdOrderByVersionNoDesc(Long repairOrderId);

    @EntityGraph(attributePaths = {"items", "items.part", "repairOrder", "repairOrder.customer", "repairOrder.customer.user",
            "repairOrder.technician", "createdBy", "respondedBy"})
    Optional<Quotation> findWithDetailsById(Long id);

    @Query("SELECT COALESCE(MAX(q.versionNo), 0) FROM Quotation q WHERE q.repairOrder.id = :orderId")
    int maxVersion(@Param("orderId") Long orderId);

    List<Quotation> findByRepairOrderIdAndStatusIn(Long repairOrderId, Collection<QuotationStatus> statuses);

    /** Báo giá đã duyệt mới nhất – số tiền mặc định khi bàn giao. */
    Optional<Quotation> findFirstByRepairOrderIdAndStatusOrderByVersionNoDesc(Long repairOrderId, QuotationStatus status);

    boolean existsByRepairOrderIdAndStatus(Long repairOrderId, QuotationStatus status);
}
