package com.repairflow.inventory.repository;

import com.repairflow.inventory.entity.PartCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartCategoryRepository extends JpaRepository<PartCategory, Long> {

    List<PartCategory> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByCode(String code);
}
