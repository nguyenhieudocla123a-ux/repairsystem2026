package com.repairflow.inventory.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.config.CacheConfig;
import com.repairflow.inventory.dto.InventoryDtos.PartOption;
import com.repairflow.inventory.dto.InventoryDtos.PartRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartResponse;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.inventory.repository.PartCategoryRepository;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import com.repairflow.inventory.dto.InventoryDtos.ImportRequest;

/** Danh mục linh kiện. Tồn kho KHÔNG sửa trực tiếp ở đây – chỉ thay đổi qua InventoryService (luôn có sổ kho). */
@Service
@RequiredArgsConstructor
public class PartService {

    private static final Set<String> SORTABLE = Set.of("name", "sku", "quantityOnHand", "sellingPrice", "createdAt");

    private final PartRepository repository;
    private final PartCategoryRepository categoryRepository;
    private final InventoryService inventoryService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<PartResponse> search(String keyword, Long categoryId, DeviceType deviceType, Boolean lowStock,
                                             Boolean active, AuthenticatedUser user, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by("name"));
        boolean includeCost = canSeeCost(user);
        return PageResponse.of(repository.findAll(filter(keyword, categoryId, deviceType, lowStock, active), page),
                p -> PartResponse.from(p, includeCost));
    }

    @Transactional(readOnly = true)
    @Cacheable(CacheConfig.PART_OPTIONS)
    public List<PartOption> activeOptions() {
        return repository.findByActiveTrueOrderByNameAsc().stream().map(PartOption::from).toList();
    }

    @Transactional(readOnly = true)
    public PartResponse get(Long id, AuthenticatedUser user) {
        return PartResponse.from(repository.findWithCategoryById(id)
                .orElseThrow(() -> BusinessException.notFound("Linh kiện", id)), canSeeCost(user));
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse create(PartRequest request, AuthenticatedUser actor) {
        String sku = request.sku().trim().toUpperCase(Locale.ROOT);
        if (repository.existsBySkuIgnoreCase(sku)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Mã SKU " + sku + " đã tồn tại");
        }
        Part part = new Part(sku, request.name().trim());
        apply(part, request);
        repository.save(part);
        if (request.initialQuantity() != null && request.initialQuantity() > 0) {
            // Tồn đầu kỳ đi qua đúng luồng nhập kho → có dòng sổ kho, tồn kho luôn đối soát được (cùng transaction)
            return inventoryService.importStock(part.getId(), new ImportRequest(request.initialQuantity(),
                    request.costPrice(), request.supplierName(), "Tồn đầu kỳ khi tạo linh kiện"), actor);
        }
        return PartResponse.from(part, true);
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse update(Long id, PartRequest request) {
        Part part = load(id);
        if (request.version() == null || !request.version().equals(part.getVersion())) {
            throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Linh kiện đã được cập nhật (có thể do nhập/xuất kho), vui lòng tải lại");
        }
        String sku = request.sku().trim().toUpperCase(Locale.ROOT);
        if (repository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Mã SKU " + sku + " đã tồn tại");
        }
        part.setSku(sku);
        part.setName(request.name().trim());
        apply(part, request);
        repository.flush();
        return PartResponse.from(part, true);
    }

    /** Ngừng kinh doanh thay vì xóa: giữ nguyên lịch sử kho và báo giá cũ. */
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse setActive(Long actorId, Long id, boolean active) {
        Part part = load(id);
        if (part.isActive() != active) {
            part.setActive(active);
            auditService.record(actorId, active ? "PART_ACTIVATED" : "PART_DEACTIVATED", "PART", id, Map.of("sku", part.getSku()));
        }
        return PartResponse.from(part, true);
    }

    Part load(Long id) {
        return repository.findById(id).orElseThrow(() -> BusinessException.notFound("Linh kiện", id));
    }

    static boolean canSeeCost(AuthenticatedUser user) {
        return user.role() == Role.ADMIN || user.role() == Role.STAFF;
    }

    private void apply(Part part, PartRequest r) {
        PartCategory category = categoryRepository.findById(r.categoryId())
                .orElseThrow(() -> BusinessException.notFound("Nhóm linh kiện", r.categoryId()));
        if (!category.isActive() && (part.getCategory() == null || !category.getId().equals(part.getCategory().getId()))) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Nhóm \"" + category.getName() + "\" đã ngừng sử dụng");
        }
        if (!category.appliesTo(r.deviceType())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Nhóm \"" + category.getName() + "\" không dùng cho loại thiết bị đã chọn");
        }
        part.setCategory(category);
        part.setDeviceType(r.deviceType());
        part.setGrade(r.grade());
        part.setBrand(StringUtils.hasText(r.brand()) ? r.brand().trim() : null);
        part.setCompatibleModels(StringUtils.hasText(r.compatibleModels()) ? r.compatibleModels().trim() : null);
        part.setWarrantyMonths(r.warrantyMonths());
        part.setUnit(r.unit().trim());
        part.setCostPrice(r.costPrice());
        part.setSellingPrice(r.sellingPrice());
        part.setMinStockLevel(r.minStockLevel());
    }

    private static Specification<Part> filter(String keyword, Long categoryId, DeviceType deviceType, Boolean lowStock,
                                              Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("sku")), like)));
            }
            if (categoryId != null) {
                p.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (deviceType != null) {
                // Linh kiện đúng loại thiết bị hoặc dùng chung (device_type null)
                p.add(cb.or(cb.equal(root.get("deviceType"), deviceType), cb.isNull(root.get("deviceType"))));
            }
            if (Boolean.TRUE.equals(lowStock)) {
                p.add(cb.lessThanOrEqualTo(root.get("quantityOnHand"), root.<Integer>get("minStockLevel")));
            }
            if (active != null) {
                p.add(cb.equal(root.get("active"), active));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
