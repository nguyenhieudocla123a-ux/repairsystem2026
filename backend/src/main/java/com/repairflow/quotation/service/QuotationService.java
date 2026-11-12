package com.repairflow.quotation.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.quotation.dto.QuotationDtos.QuotationItemRequest;
import com.repairflow.quotation.dto.QuotationDtos.QuotationRequest;
import com.repairflow.quotation.dto.QuotationDtos.QuotationResponse;
import com.repairflow.quotation.dto.QuotationDtos.QuotationSummary;
import com.repairflow.quotation.entity.Quotation;
import com.repairflow.quotation.entity.QuotationItem;
import com.repairflow.quotation.entity.QuotationItemType;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.repository.QuotationRepository;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.service.RepairAccessGuard;
import com.repairflow.repair.service.RepairOrderService;
import com.repairflow.repair.service.RepairStatusPolicy;
import com.repairflow.repair.service.RepairStatusPolicy.Channel;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Báo giá: DRAFT (nhân viên soạn) → SENT (phiếu sang WAITING_CONFIRMATION) → APPROVED / REJECTED (khách phản hồi).
 * Mỗi lần gửi báo giá mới, báo giá cũ đã gửi/bị từ chối chuyển SUPERSEDED → giữ đủ lịch sử các phiên bản.
 * Tổng tiền LUÔN tính lại ở Backend bằng BigDecimal, không tin số liệu client gửi lên.
 */
@Service
@RequiredArgsConstructor
public class QuotationService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "sentAt", "totalAmount");
    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final QuotationRepository repository;
    private final PartRepository partRepository;
    private final RepairAccessGuard accessGuard;
    private final RepairOrderService repairOrderService;
    private final RepairStatusPolicy policy;
    private final CurrentCustomerResolver currentCustomer;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<QuotationResponse> listOfOrder(Long orderId, AuthenticatedUser user) {
        accessGuard.loadVisible(orderId, user);
        return repository.findByRepairOrderIdOrderByVersionNoDesc(orderId).stream()
                .filter(q -> user.role() != Role.CUSTOMER || q.getStatus() != QuotationStatus.DRAFT) // khách không thấy bản nháp
                .map(QuotationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public QuotationResponse get(Long id, AuthenticatedUser user) {
        return QuotationResponse.from(loadVisible(id, user));
    }

    @Transactional(readOnly = true)
    public PageResponse<QuotationSummary> search(QuotationStatus status, String keyword, AuthenticatedUser user,
                                                 Pageable pageable) {
        Long customerId = user.role() == Role.CUSTOMER ? currentCustomer.require(user).getId() : null;
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Quotation> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (customerId != null) {
                p.add(cb.equal(root.get("repairOrder").get("customer").get("id"), customerId));
                p.add(cb.notEqual(root.get("status"), QuotationStatus.DRAFT));
            }
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("repairOrder").get("code")), like),
                        cb.like(cb.lower(root.get("repairOrder").get("customer").get("fullName")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(repository.findAll(spec, page), QuotationSummary::from);
    }

    @Transactional
    public QuotationResponse createDraft(Long orderId, QuotationRequest request, AuthenticatedUser actor) {
        RepairOrder order = accessGuard.loadVisible(orderId, actor);
        if (!policy.isEdgeAllowed(order.getStatus(), RepairStatus.WAITING_CONFIRMATION)) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Không thể lập báo giá khi phiếu đang ở trạng thái " + order.getStatus());
        }
        if (repository.existsByRepairOrderIdAndStatus(orderId, QuotationStatus.DRAFT)) {
            throw BusinessException.conflict("Phiếu đã có một báo giá nháp – hãy sửa báo giá đó");
        }
        Quotation quotation = new Quotation(order, repository.maxVersion(orderId) + 1, userRef(actor));
        apply(quotation, request);
        return QuotationResponse.from(repository.save(quotation));
    }

    @Transactional
    public QuotationResponse updateDraft(Long id, QuotationRequest request, AuthenticatedUser actor) {
        Quotation quotation = loadVisible(id, actor);
        assertDraft(quotation);
        apply(quotation, request);
        repository.flush();
        return QuotationResponse.from(quotation);
    }

    @Transactional
    public void deleteDraft(Long id, AuthenticatedUser actor) {
        Quotation quotation = loadVisible(id, actor);
        assertDraft(quotation);
        repository.delete(quotation);
    }

    /** Gửi cho khách: báo giá → SENT, phiếu → WAITING_CONFIRMATION (qua máy trạng thái, kênh QUOTATION). */
    @Transactional
    public QuotationResponse send(Long id, AuthenticatedUser actor) {
        Quotation quotation = loadVisible(id, actor);
        assertDraft(quotation);
        RepairOrder order = quotation.getRepairOrder();
        repairOrderService.changeStatus(order, RepairStatus.WAITING_CONFIRMATION, actor, Channel.QUOTATION,
                "Gửi báo giá v" + quotation.getVersionNo() + ": " + money(quotation.getTotalAmount()));

        repository.findByRepairOrderIdAndStatusIn(order.getId(), EnumSet.of(QuotationStatus.SENT, QuotationStatus.REJECTED))
                .forEach(old -> old.setStatus(QuotationStatus.SUPERSEDED));
        repository.flush(); // ghi SUPERSEDED trước → không vi phạm unique index "1 báo giá SENT / phiếu"

        quotation.setStatus(QuotationStatus.SENT);
        quotation.setSentAt(clock.instant());
        repository.flush();
        return QuotationResponse.from(quotation);
    }

    @Transactional
    public QuotationResponse approve(Long id, String note, AuthenticatedUser actor) {
        return respond(id, note, actor, true);
    }

    @Transactional
    public QuotationResponse reject(Long id, String note, AuthenticatedUser actor) {
        return respond(id, note, actor, false);
    }

    private QuotationResponse respond(Long id, String note, AuthenticatedUser actor, boolean approve) {
        Quotation quotation = loadVisible(id, actor);
        if (quotation.getStatus() != QuotationStatus.SENT) {
            throw BusinessException.conflict("Báo giá không còn chờ xác nhận (" + quotation.getStatus() + ")");
        }
        if (quotation.getValidUntil() != null && LocalDate.now(clock.withZone(SHOP_ZONE)).isAfter(quotation.getValidUntil())) {
            throw BusinessException.conflict("Báo giá đã hết hạn ngày " + quotation.getValidUntil() + ", vui lòng liên hệ cửa hàng");
        }
        boolean onBehalf = actor.role() != Role.CUSTOMER;
        if (onBehalf && !StringUtils.hasText(note)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Nhân viên xác nhận thay khách phải ghi chú cách khách xác nhận (VD: qua điện thoại)");
        }
        RepairStatus target = approve ? RepairStatus.APPROVED : RepairStatus.REJECTED;
        String historyNote = (approve ? "Khách đồng ý báo giá v" : "Khách từ chối báo giá v") + quotation.getVersionNo()
                + (onBehalf ? " (nhân viên xác nhận thay)" : "") + (StringUtils.hasText(note) ? ": " + note.trim() : "");
        repairOrderService.changeStatus(quotation.getRepairOrder(), target, actor, Channel.QUOTATION, historyNote);

        quotation.setStatus(approve ? QuotationStatus.APPROVED : QuotationStatus.REJECTED);
        quotation.setCustomerResponseNote(StringUtils.hasText(note) ? note.trim() : null);
        quotation.setRespondedBy(userRef(actor));
        quotation.setRespondedAt(clock.instant());
        repository.flush();
        return QuotationResponse.from(quotation);
    }

    /** Thay toàn bộ dòng báo giá + tính lại tổng. */
    private void apply(Quotation quotation, QuotationRequest request) {
        quotation.getItems().clear();
        BigDecimal labor = BigDecimal.ZERO;
        BigDecimal parts = BigDecimal.ZERO;
        for (QuotationItemRequest r : request.items()) {
            QuotationItem item = buildItem(quotation, r);
            quotation.getItems().add(item);
            if (item.getItemType() == QuotationItemType.LABOR) {
                labor = labor.add(item.getLineTotal());
            } else {
                parts = parts.add(item.getLineTotal());
            }
        }
        BigDecimal subtotal = labor.add(parts);
        BigDecimal discount = scale(request.discount() == null ? BigDecimal.ZERO : request.discount());
        if (discount.compareTo(subtotal) > 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Giảm giá không được lớn hơn tổng tiền " + money(subtotal));
        }
        quotation.setLaborTotal(scale(labor));
        quotation.setPartsTotal(scale(parts));
        quotation.setDiscount(discount);
        quotation.setTotalAmount(scale(subtotal.subtract(discount)));
        quotation.setNote(StringUtils.hasText(request.note()) ? request.note().trim() : null);
        quotation.setValidUntil(request.validUntil());
    }

    private QuotationItem buildItem(Quotation quotation, QuotationItemRequest r) {
        if (r.itemType() == QuotationItemType.PART) {
            if (r.partId() == null) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Dòng linh kiện phải chọn linh kiện");
            }
            Part part = partRepository.findById(r.partId()).orElseThrow(() -> BusinessException.notFound("Linh kiện", r.partId()));
            if (!part.isActive()) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Linh kiện " + part.getSku() + " đã ngừng kinh doanh");
            }
            String description = StringUtils.hasText(r.description()) ? r.description().trim() : part.getName();
            BigDecimal price = scale(r.unitPrice() != null ? r.unitPrice() : part.getSellingPrice());
            return new QuotationItem(quotation, QuotationItemType.PART, part, description, r.quantity(), price);
        }
        if (!StringUtils.hasText(r.description())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Dòng tiền công phải có mô tả");
        }
        if (r.unitPrice() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Dòng tiền công phải có đơn giá");
        }
        return new QuotationItem(quotation, QuotationItemType.LABOR, null, r.description().trim(), r.quantity(), scale(r.unitPrice()));
    }

    private Quotation loadVisible(Long id, AuthenticatedUser user) {
        Quotation quotation = repository.findWithDetailsById(id).orElseThrow(() -> BusinessException.notFound("Báo giá", id));
        if (!accessGuard.canView(quotation.getRepairOrder(), user)
                || (user.role() == Role.CUSTOMER && quotation.getStatus() == QuotationStatus.DRAFT)) {
            throw BusinessException.notFound("Báo giá", id);
        }
        return quotation;
    }

    private static void assertDraft(Quotation quotation) {
        if (quotation.getStatus() != QuotationStatus.DRAFT) {
            throw BusinessException.conflict("Chỉ sửa / gửi / xóa được báo giá nháp");
        }
    }

    private User userRef(AuthenticatedUser actor) {
        return entityManager.getReference(User.class, actor.id());
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    static String money(BigDecimal value) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(value) + "₫";
    }
}
