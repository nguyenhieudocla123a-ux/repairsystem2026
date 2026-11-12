package com.repairflow.warranty.repository;

import com.repairflow.warranty.entity.Warranty;
import java.time.LocalDate;
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

public interface WarrantyRepository extends JpaRepository<Warranty, Long>, JpaSpecificationExecutor<Warranty> {

    Optional<Warranty> findByRepairOrderId(Long repairOrderId);

    @Override
    @EntityGraph(attributePaths = {"repairOrder", "customer", "device"})
    Page<Warranty> findAll(Specification<Warranty> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"repairOrder", "customer", "customer.user", "device"})
    Optional<Warranty> findWithDetailsById(Long id);

    /** Tra cứu theo mã bảo hành, mã phiếu sửa chữa hoặc serial/IMEI (không phân biệt hoa thường). */
    @EntityGraph(attributePaths = {"repairOrder", "customer", "customer.user", "device"})
    @Query("""
            SELECT w FROM Warranty w
            WHERE UPPER(w.code) = UPPER(:keyword)
               OR UPPER(w.repairOrder.code) = UPPER(:keyword)
               OR UPPER(w.device.serialNumber) = UPPER(:keyword)
            ORDER BY w.endDate DESC
            """)
    List<Warranty> lookup(@Param("keyword") String keyword);

    @EntityGraph(attributePaths = {"repairOrder", "device"})
    List<Warranty> findByCustomerIdOrderByEndDateDesc(Long customerId);

    @Query("SELECT COUNT(w) FROM Warranty w WHERE w.customer.id = :customerId "
            + "AND w.status = com.repairflow.warranty.entity.WarrantyStatus.ACTIVE AND w.endDate >= :today")
    long countActiveOfCustomer(@Param("customerId") Long customerId, @Param("today") LocalDate today);
}
