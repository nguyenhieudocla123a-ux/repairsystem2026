package com.repairflow.warranty.repository;

import com.repairflow.warranty.entity.Warranty;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarrantyRepository extends JpaRepository<Warranty, Long> {

    Optional<Warranty> findByRepairOrderId(Long repairOrderId);
}
