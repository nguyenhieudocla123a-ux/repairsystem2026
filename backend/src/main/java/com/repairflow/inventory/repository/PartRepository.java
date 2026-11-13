package com.repairflow.inventory.repository;

import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.entity.Part;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
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

    @Override
    @EntityGraph(attributePaths = "category")
    Page<Part> findAll(Specification<Part> spec, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    @Query("SELECT p FROM Part p WHERE p.id = :id")
    Optional<Part> findWithCategoryById(@Param("id") Long id);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    @EntityGraph(attributePaths = "category")
    List<Part> findByActiveTrueOrderByNameAsc();

    @Query("SELECT p FROM Part p WHERE p.active = true AND p.quantityOnHand <= p.minStockLevel ORDER BY p.quantityOnHand ASC")
    List<Part> findLowStock();

    boolean existsByCategoryId(Long categoryId);

    /** Tồn + giá trị tồn (giá nhập gần nhất) của các linh kiện đang kinh doanh: [sumQuantity, sumValue]. */
    @Query("SELECT COALESCE(SUM(p.quantityOnHand), 0), COALESCE(SUM(p.quantityOnHand * p.costPrice), 0) FROM Part p "
            + "WHERE p.active = true")
    Object[] stockTotals();

    /**
     * Số linh kiện đang kinh doanh + tổng tồn theo nhóm: [categoryId, count, sumQuantity].
     * Có {@code deviceType}: chỉ tính linh kiện của loại thiết bị đó + linh kiện dùng chung (cùng quy tắc với tìm kiếm).
     */
    @Query("SELECT p.category.id, COUNT(p), COALESCE(SUM(p.quantityOnHand), 0) FROM Part p "
            + "WHERE p.active = true AND p.category IS NOT NULL "
            + "AND (:deviceType IS NULL OR p.deviceType = :deviceType OR p.deviceType IS NULL) GROUP BY p.category.id")
    List<Object[]> countActiveByCategory(@Param("deviceType") DeviceType deviceType);
}
