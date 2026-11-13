package com.repairflow.inventory.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.config.CacheConfig;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.dto.InventoryDtos.PartCategoryRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartCategoryResponse;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.inventory.repository.PartCategoryRepository;
import com.repairflow.inventory.repository.PartRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Danh mục nhóm linh kiện + bảo hành mặc định. Chỉnh số tháng ở đây chỉ ảnh hưởng báo giá / bảo hành cấp SAU đó
 * (báo giá và bảo hành đã cấp lưu cố định số tháng tại thời điểm cấp).
 */
@Service
@RequiredArgsConstructor
public class PartCategoryService {

    private final PartCategoryRepository repository;
    private final PartRepository partRepository;
    private final AuditService auditService;

    /** Danh mục + thống kê; {@code deviceType} khác null thì số liệu chỉ tính linh kiện của loại thiết bị đó (+ dùng chung). */
    @Transactional(readOnly = true)
    public List<PartCategoryResponse> list(DeviceType deviceType) {
        Map<Long, long[]> stats = new HashMap<>();
        for (Object[] row : partRepository.countActiveByCategory(deviceType)) {
            stats.put((Long) row[0], new long[] {((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        return repository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(c -> {
                    long[] s = stats.getOrDefault(c.getId(), new long[] {0, 0});
                    return PartCategoryResponse.from(c, s[0], s[1]);
                })
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartCategoryResponse create(Long actorId, PartCategoryRequest request) {
        if (!StringUtils.hasText(request.code())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng nhập mã nhóm (VD: SCREEN)");
        }
        String code = request.code().trim();
        if (repository.existsByCode(code)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Mã nhóm " + code + " đã tồn tại");
        }
        PartCategory category = new PartCategory(code, request.name().trim(), request.deviceTypes(),
                request.defaultWarrantyMonths());
        apply(category, request);
        repository.save(category);
        auditService.record(actorId, "PART_CATEGORY_CREATED", "PART_CATEGORY", category.getId(), Map.of("code", code));
        return PartCategoryResponse.from(category);
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartCategoryResponse update(Long actorId, Long id, PartCategoryRequest request) {
        PartCategory category = repository.findById(id).orElseThrow(() -> BusinessException.notFound("Nhóm linh kiện", id));
        if (request.version() == null || !request.version().equals(category.getVersion())) {
            throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION, "Nhóm đã được cập nhật, vui lòng tải lại");
        }
        int oldMonths = category.getDefaultWarrantyMonths();
        category.setName(request.name().trim());
        category.setDeviceTypes(request.deviceTypes());
        category.setDefaultWarrantyMonths(request.defaultWarrantyMonths());
        apply(category, request);
        repository.flush();
        if (oldMonths != request.defaultWarrantyMonths()) {
            auditService.record(actorId, "PART_CATEGORY_WARRANTY_CHANGED", "PART_CATEGORY", id,
                    Map.of("code", category.getCode(), "from", oldMonths, "to", request.defaultWarrantyMonths()));
        }
        return PartCategoryResponse.from(category);
    }

    private static void apply(PartCategory c, PartCategoryRequest r) {
        c.setWarrantyScope(StringUtils.hasText(r.warrantyScope()) ? r.warrantyScope().trim() : null);
        c.setExclusions(StringUtils.hasText(r.exclusions()) ? r.exclusions().trim() : null);
        if (r.sortOrder() != null) {
            c.setSortOrder(r.sortOrder());
        }
        if (r.active() != null) {
            c.setActive(r.active());
        }
    }
}
