package com.repairflow.inventory.repository;

import com.repairflow.inventory.entity.InventoryTransaction;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryTransactionRepository
        extends JpaRepository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {

    @Override
    @EntityGraph(attributePaths = {"part", "repairOrder", "createdBy"})
    Page<InventoryTransaction> findAll(Specification<InventoryTransaction> spec, Pageable pageable);

    /** Số lượng linh kiện đang dùng cho phiếu theo từng linh kiện: Σ EXPORT − Σ RETURN. */
    @Query("""
            SELECT new com.repairflow.inventory.repository.PartUsage(
                t.part.id, t.part.sku, t.part.name, t.part.unit,
                SUM(CASE WHEN t.type = com.repairflow.inventory.entity.InventoryTransactionType.EXPORT THEN t.quantity ELSE -t.quantity END))
            FROM InventoryTransaction t
            WHERE t.repairOrder.id = :orderId
              AND t.type IN (com.repairflow.inventory.entity.InventoryTransactionType.EXPORT,
                             com.repairflow.inventory.entity.InventoryTransactionType.RETURN)
            GROUP BY t.part.id, t.part.sku, t.part.name, t.part.unit
            ORDER BY t.part.name
            """)
    List<PartUsage> usageOfOrder(@Param("orderId") Long orderId);
}
