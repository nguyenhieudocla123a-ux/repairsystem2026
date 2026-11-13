package com.repairflow.inventory.repository;

import com.repairflow.inventory.entity.PartImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartImageRepository extends JpaRepository<PartImage, Long> {
}
