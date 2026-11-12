package com.repairflow.repair.repository;

import com.repairflow.repair.entity.RepairStatusHistory;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepairStatusHistoryRepository extends JpaRepository<RepairStatusHistory, Long> {

    @EntityGraph(attributePaths = "changedBy")
    List<RepairStatusHistory> findByRepairOrderIdOrderByChangedAtAscIdAsc(Long repairOrderId);
}
