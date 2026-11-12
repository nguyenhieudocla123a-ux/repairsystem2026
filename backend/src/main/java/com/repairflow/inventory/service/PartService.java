package com.repairflow.inventory.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.inventory.dto.InventoryDtos.PartOption;
import com.repairflow.inventory.dto.InventoryDtos.PartRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartResponse;
import com.repairflow.inventory.entity.Part;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Danh mục linh kiện. Tồn kho KHÔNG sửa trực tiếp ở đây – chỉ thay đổi qua InventoryService (luôn có sổ kho). */
@Service
@RequiredArgsConstructor
public class PartService {

    private static final Set<String> SORTABLE = Set.of("name", "sku", "quantityOnHand", "sellingPrice", "createdAt");

    private final PartRepository repository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<PartResponse> search(String keyword, String category, Boolean lowStock, Boolean active,
                                             AuthenticatedUser user, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by("name"));
        boolean includeCost = canSeeCost(user);
        return PageResponse.of(repository.findAll(filter(keyword, category, lowStock, active), page),
                p -> PartResponse.from(p, includeCost));
    }

    @Transactional(readOnly = true)
    public List<PartOption> activeOptions() {
        return repository.findByActiveTrueOrderByNameAsc().stream().map(PartOption::from).toList();
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return repository.findCategories();
    }

    @Transactional(readOnly = true)
    public PartResponse get(Long id, AuthenticatedUser user) {
        return PartResponse.from(load(id), canSeeCost(user));
    }

    @Transactional
    public PartResponse create(PartRequest request) {
        String sku = request.sku().trim().toUpperCase(Locale.ROOT);
        if (repository.existsBySkuIgnoreCase(sku)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Mã SKU " + sku + " đã tồn tại");
        }
        Part part = new Part(sku, request.name().trim());
        apply(part, request);
        return PartResponse.from(repository.save(part), true);
    }

    @Transactional
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
        part.setCategory(StringUtils.hasText(r.category()) ? r.category().trim() : null);
        part.setUnit(r.unit().trim());
        part.setCostPrice(r.costPrice());
        part.setSellingPrice(r.sellingPrice());
        part.setMinStockLevel(r.minStockLevel());
    }

    private static Specification<Part> filter(String keyword, String category, Boolean lowStock, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("sku")), like)));
            }
            if (StringUtils.hasText(category)) {
                p.add(cb.equal(root.get("category"), category));
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
