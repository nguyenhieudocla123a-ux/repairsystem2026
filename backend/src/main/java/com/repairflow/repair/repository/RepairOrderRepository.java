package com.repairflow.repair.repository;

import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepairOrderRepository extends JpaRepository<RepairOrder, Long>, JpaSpecificationExecutor<RepairOrder> {

    /** Danh sách cần tên khách, thiết bị, KTV → nạp bằng JOIN trong 1 câu SQL thay vì N+1 truy vấn. */
    @Override
    @EntityGraph(attributePaths = {"customer", "device", "technician"})
    Page<RepairOrder> findAll(Specification<RepairOrder> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "customer.user", "device", "technician", "createdBy", "repairRequest"})
    Optional<RepairOrder> findWithDetailsById(Long id);

    Optional<RepairOrder> findByCodeIgnoreCase(String code);

    java.util.List<RepairOrder> findByRepairRequestIdIn(java.util.Collection<Long> repairRequestIds);

    long countByCustomerId(Long customerId);

    long countByDeviceId(Long deviceId);

    long countByTechnicianIdAndStatus(Long technicianId, RepairStatus status);

    @Query("SELECT COALESCE(SUM(r.finalAmount), 0) FROM RepairOrder r "
            + "WHERE r.customer.id = :customerId AND r.status = com.repairflow.repair.entity.RepairStatus.DELIVERED")
    BigDecimal sumDeliveredAmountByCustomer(@Param("customerId") Long customerId);
}
