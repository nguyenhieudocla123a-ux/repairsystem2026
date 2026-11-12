package com.repairflow.inventory.repository;

import com.repairflow.inventory.entity.Part;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartRepository extends JpaRepository<Part, Long>, JpaSpecificationExecutor<Part> {

    /**
     * SELECT ... FOR UPDATE: khóa dòng linh kiện tới hết transaction. Transaction khác muốn xuất cùng linh kiện
     * phải chờ → đọc được tồn kho đã cập nhật → không bao giờ xuất vượt tồn (docs/database-erd.md §6).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Part p WHERE p.id = :id")
    Optional<Part> findForUpdate(@Param("id") Long id);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    List<Part> findByActiveTrueOrderByNameAsc();

    @Query("SELECT p FROM Part p WHERE p.active = true AND p.quantityOnHand <= p.minStockLevel ORDER BY p.quantityOnHand ASC")
    List<Part> findLowStock();

    @Query("SELECT DISTINCT p.category FROM Part p WHERE p.category IS NOT NULL ORDER BY p.category")
    List<String> findCategories();
}
