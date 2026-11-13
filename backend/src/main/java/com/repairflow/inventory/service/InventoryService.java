package com.repairflow.inventory.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.config.CacheConfig;
import com.repairflow.inventory.dto.InventoryDtos.AdjustRequest;
import com.repairflow.inventory.dto.InventoryDtos.ImportRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartMovementRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartResponse;
import com.repairflow.inventory.dto.InventoryDtos.PartUsageResponse;
import com.repairflow.inventory.dto.InventoryDtos.TransactionResponse;
import com.repairflow.inventory.entity.InventoryTransaction;
import com.repairflow.inventory.entity.InventoryTransactionType;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.repository.InventoryTransactionRepository;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.notification.event.DomainEvents.LowStock;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.service.RepairAccessGuard;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import com.repairflow.inventory.dto.InventoryDtos.LedgerSummary;

/**
 * Mọi biến động tồn kho đi qua đây. Mỗi thao tác = (khóa dòng linh kiện) + (đổi tồn) + (ghi 1 dòng sổ kho)
 * trong CÙNG một transaction → tồn kho luôn đối soát được với sổ kho, và không bao giờ âm kể cả khi đồng thời.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    /** Chỉ xuất/hoàn linh kiện khi khách đã duyệt báo giá và phiếu đang được sửa. */
    private static final Set<RepairStatus> PARTS_ALLOWED = EnumSet.of(
            RepairStatus.APPROVED, RepairStatus.REPAIRING, RepairStatus.WAITING_FOR_PARTS);
    private static final Set<String> SORTABLE = Set.of("createdAt");
    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PartRepository partRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final RepairAccessGuard repairAccessGuard;
    private final AuditService auditService;
    private final EntityManager entityManager;
    private final ApplicationEventPublisher events;

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse importStock(Long partId, ImportRequest request, AuthenticatedUser actor) {
        Part part = lockPart(partId);
        part.increaseStock(request.quantity());
        if (request.unitCost() != null) {
            part.setCostPrice(request.unitCost()); // giá nhập gần nhất
        }
        InventoryTransaction tx = newTransaction(part, InventoryTransactionType.IMPORT, request.quantity(), actor, request.note());
        tx.setUnitCost(request.unitCost() != null ? request.unitCost() : part.getCostPrice());
        tx.setSupplierName(trimToNull(request.supplierName()));
        transactionRepository.save(tx);
        partRepository.flush();
        return PartResponse.from(part, true);
    }

    /** Kiểm kê: đặt tồn về số thực tế, ghi chênh lệch (có dấu) vào sổ kho. */
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse adjust(Long partId, AdjustRequest request, AuthenticatedUser actor) {
        Part part = lockPart(partId);
        int delta = request.newQuantity() - part.getQuantityOnHand();
        if (delta == 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Số lượng thực tế bằng tồn hiện tại, không cần điều chỉnh");
        }
        if (delta > 0) {
            part.increaseStock(delta);
        } else {
            part.decreaseStock(-delta);
        }
        transactionRepository.save(newTransaction(part, InventoryTransactionType.ADJUSTMENT, delta, actor, request.note()));
        auditService.record(actor.id(), "STOCK_ADJUSTED", "PART", partId,
                Map.of("delta", delta, "newQuantity", request.newQuantity()));
        partRepository.flush();
        return PartResponse.from(part, true);
    }

    /** KTV xuất linh kiện cho phiếu sửa chữa. Thiếu tồn → 409 INSUFFICIENT_STOCK. */
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public List<PartUsageResponse> exportForRepair(Long orderId, PartMovementRequest request, AuthenticatedUser actor) {
        RepairOrder order = loadOrderForParts(orderId, actor);
        Part part = lockPart(request.partId());
        if (!part.isActive()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Linh kiện " + part.getSku() + " đã ngừng sử dụng");
        }
        part.decreaseStock(request.quantity()); // ném INSUFFICIENT_STOCK nếu không đủ
        InventoryTransaction tx = newTransaction(part, InventoryTransactionType.EXPORT, request.quantity(), actor, request.note());
        tx.setRepairOrder(order); // gán TRƯỚC khi save: IDENTITY insert ngay, CHECK ở DB yêu cầu EXPORT có phiếu
        tx.setUnitCost(part.getCostPrice());
        transactionRepository.save(tx);
        if (part.isLowStock()) {
            events.publishEvent(new LowStock(part.getId(), actor.id())); // thông báo ADMIN/STAFF sau commit
        }
        transactionRepository.flush();
        return usage(order.getId());
    }

    /** Hoàn lại linh kiện chưa dùng – không vượt quá số đã xuất cho phiếu. */
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public List<PartUsageResponse> returnFromRepair(Long orderId, PartMovementRequest request, AuthenticatedUser actor) {
        RepairOrder order = loadOrderForParts(orderId, actor);
        long used = usage(orderId).stream().filter(u -> u.partId().equals(request.partId()))
                .mapToLong(PartUsageResponse::quantityUsed).sum();
        if (request.quantity() > used) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Chỉ có thể hoàn tối đa " + used + " – số đã xuất cho phiếu này");
        }
        Part part = lockPart(request.partId());
        part.increaseStock(request.quantity());
        InventoryTransaction tx = newTransaction(part, InventoryTransactionType.RETURN, request.quantity(), actor, request.note());
        tx.setRepairOrder(order);
        tx.setUnitCost(part.getCostPrice());
        transactionRepository.save(tx);
        transactionRepository.flush();
        return usage(order.getId());
    }

    @Transactional(readOnly = true)
    public List<PartUsageResponse> usageVisible(Long orderId, AuthenticatedUser user) {
        repairAccessGuard.loadVisible(orderId, user);
        return usage(orderId);
    }

    /** Linh kiện đang dùng (đã trừ phần hoàn) – bỏ dòng = 0. */
    @Transactional(readOnly = true)
    public List<PartUsageResponse> usage(Long orderId) {
        return transactionRepository.usageOfOrder(orderId).stream()
                .filter(u -> u.quantityUsed() != null && u.quantityUsed() > 0)
                .map(u -> new PartUsageResponse(u.partId(), u.sku(), u.name(), u.unit(), u.quantityUsed()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> transactions(Long partId, InventoryTransactionType type, Long repairOrderId,
                                                          LocalDate from, LocalDate to, AuthenticatedUser user,
                                                          Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean includeCost = PartService.canSeeCost(user);
        return PageResponse.of(transactionRepository.findAll(ledgerSpec(partId, type, repairOrderId, from, to), page),
                t -> TransactionResponse.from(t, includeCost));
    }

    /** Tổng hợp sổ kho theo cùng bộ lọc với danh sách (một truy vấn GROUP BY loại giao dịch). */
    @Transactional(readOnly = true)
    public LedgerSummary summary(Long partId, InventoryTransactionType type, LocalDate from, LocalDate to) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<InventoryTransaction> root = cq.from(InventoryTransaction.class);
        Expression<Integer> qty = root.get("quantity");
        Expression<BigDecimal> value = cb.prod(qty.as(BigDecimal.class), cb.coalesce(root.<BigDecimal>get("unitCost"), BigDecimal.ZERO));
        cq.multiselect(root.get("type"), cb.sum(qty), cb.sum(value), cb.count(root))
                .where(ledgerSpec(partId, type, null, from, to).toPredicate(root, cq, cb))
                .groupBy(root.get("type"));
        Map<InventoryTransactionType, Object[]> byType = new EnumMap<>(InventoryTransactionType.class);
        long count = 0;
        for (Object[] row : entityManager.createQuery(cq).getResultList()) {
            byType.put((InventoryTransactionType) row[0], row);
            count += ((Number) row[3]).longValue();
        }
        long stockQty;
        BigDecimal stockValue;
        if (partId != null) {
            Part part = partRepository.findById(partId).orElseThrow(() -> BusinessException.notFound("Linh kiện", partId));
            stockQty = part.getQuantityOnHand();
            stockValue = part.getCostPrice().multiply(BigDecimal.valueOf(part.getQuantityOnHand()));
        } else {
            Object[] totals = partRepository.stockTotals();
            Object[] row = totals.length == 1 && totals[0] instanceof Object[] nested ? nested : totals;
            stockQty = ((Number) row[0]).longValue();
            stockValue = toDecimal(row[1]);
        }
        return new LedgerSummary(sumQty(byType, InventoryTransactionType.IMPORT), sumValue(byType, InventoryTransactionType.IMPORT),
                sumQty(byType, InventoryTransactionType.EXPORT), sumValue(byType, InventoryTransactionType.EXPORT),
                sumQty(byType, InventoryTransactionType.RETURN), sumValue(byType, InventoryTransactionType.RETURN),
                sumQty(byType, InventoryTransactionType.ADJUSTMENT), count, stockQty, stockValue);
    }

    private static long sumQty(Map<InventoryTransactionType, Object[]> byType, InventoryTransactionType t) {
        Object[] row = byType.get(t);
        return row == null || row[1] == null ? 0 : ((Number) row[1]).longValue();
    }

    private static BigDecimal sumValue(Map<InventoryTransactionType, Object[]> byType, InventoryTransactionType t) {
        Object[] row = byType.get(t);
        return row == null ? BigDecimal.ZERO : toDecimal(row[2]);
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) {
            return BigDecimal.ZERO;
        }
        return (v instanceof BigDecimal d ? d : new BigDecimal(v.toString())).setScale(2, RoundingMode.HALF_UP);
    }

    private Specification<InventoryTransaction> ledgerSpec(Long partId, InventoryTransactionType type, Long repairOrderId,
                                                           LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (partId != null) {
                p.add(cb.equal(root.get("part").get("id"), partId));
            }
            if (type != null) {
                p.add(cb.equal(root.get("type"), type));
            }
            if (repairOrderId != null) {
                p.add(cb.equal(root.get("repairOrder").get("id"), repairOrderId));
            }
            if (from != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay(SHOP_ZONE).toInstant()));
            }
            if (to != null) {
                Instant end = to.plusDays(1).atStartOfDay(SHOP_ZONE).toInstant();
                p.add(cb.lessThan(root.get("createdAt"), end));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    private RepairOrder loadOrderForParts(Long orderId, AuthenticatedUser actor) {
        RepairOrder order = repairAccessGuard.loadVisible(orderId, actor);
        boolean assigned = order.getTechnician() != null && order.getTechnician().getId().equals(actor.id());
        if (actor.role() != Role.ADMIN && !(actor.role() == Role.TECHNICIAN && assigned)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Chỉ kỹ thuật viên được giao mới xuất/hoàn linh kiện");
        }
        if (!PARTS_ALLOWED.contains(order.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Chỉ xuất/hoàn linh kiện khi khách đã duyệt báo giá và phiếu đang sửa (hiện tại: " + order.getStatus() + ")");
        }
        return order;
    }

    private Part lockPart(Long partId) {
        return partRepository.findForUpdate(partId).orElseThrow(() -> BusinessException.notFound("Linh kiện", partId));
    }

    /**
     * Tạo dòng sổ kho SAU khi đã đổi tồn → balanceAfter chính là tồn mới. Chưa save: caller gán đủ thông tin
     * (phiếu sửa chữa, giá...) rồi mới save – vì khóa IDENTITY khiến Hibernate INSERT ngay khi save.
     */
    private InventoryTransaction newTransaction(Part part, InventoryTransactionType type, int quantity,
                                                AuthenticatedUser actor, String note) {
        InventoryTransaction tx = new InventoryTransaction(part, type, quantity, entityManager.getReference(User.class, actor.id()));
        tx.setNote(trimToNull(note));
        return tx;
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
