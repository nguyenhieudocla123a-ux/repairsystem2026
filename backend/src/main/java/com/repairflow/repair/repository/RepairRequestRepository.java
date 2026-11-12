package com.repairflow.repair.repository;

import com.repairflow.repair.entity.RepairRequest;
import com.repairflow.repair.entity.RepairRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RepairRequestRepository extends JpaRepository<RepairRequest, Long>, JpaSpecificationExecutor<RepairRequest> {

    @Override
    @EntityGraph(attributePaths = {"customer", "device"})
    Page<RepairRequest> findAll(Specification<RepairRequest> spec, Pageable pageable);

    long countByCustomerId(Long customerId);

    long countByDeviceId(Long deviceId);

    long countByStatus(RepairRequestStatus status);
}
