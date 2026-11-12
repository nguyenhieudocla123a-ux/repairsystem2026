package com.repairflow.device.repository;

import com.repairflow.device.entity.Device;
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

public interface DeviceRepository extends JpaRepository<Device, Long>, JpaSpecificationExecutor<Device> {

    /** Nạp sẵn customer trong cùng câu SQL → tránh N+1 khi map danh sách sang DTO. */
    @Override
    @EntityGraph(attributePaths = "customer")
    Page<Device> findAll(Specification<Device> spec, Pageable pageable);

    List<Device> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    long countByCustomerId(Long customerId);

    /** Serial duy nhất không phân biệt hoa thường (khớp unique index upper(serial_number) ở DB). */
    @Query("SELECT d FROM Device d WHERE UPPER(d.serialNumber) = UPPER(:serial)")
    Optional<Device> findBySerialIgnoreCase(@Param("serial") String serial);
}
