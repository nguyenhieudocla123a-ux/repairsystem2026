package com.repairflow.warranty.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.notification.event.DomainEvents.WarrantyClaimCreated;
import com.repairflow.repair.dto.RepairOrderDtos.ReceptionInfo;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.service.RepairOrderService;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.security.RequestRateLimiter;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.warranty.dto.WarrantyDtos.AcceptClaimRequest;
import com.repairflow.warranty.dto.WarrantyDtos.PublicWarrantyCheckResponse;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyClaimResponse;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyDetailResponse;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyResponse;
import com.repairflow.warranty.entity.Warranty;
import com.repairflow.warranty.entity.WarrantyClaim;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import com.repairflow.warranty.entity.WarrantyStatus;
import com.repairflow.warranty.repository.WarrantyClaimRepository;
import com.repairflow.warranty.repository.WarrantyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Bảo hành: tra cứu (nội bộ / khách / công khai), hủy bảo hành, yêu cầu bảo hành.
 * Chấp nhận yêu cầu → tạo phiếu sửa chữa bảo hành; yêu cầu tự RESOLVED khi phiếu đó được bàn giao.
 */
@Service
@RequiredArgsConstructor
public class WarrantyService {

    private static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> SORTABLE = Set.of("endDate", "startDate", "createdAt");
    private static final Set<WarrantyClaimStatus> OPEN_CLAIMS = EnumSet.of(WarrantyClaimStatus.SUBMITTED, WarrantyClaimStatus.ACCEPTED);
    /** Tra cứu công khai: tối đa 10 lần / phút / IP – chống dò quét serial. */
    private static final int PUBLIC_LIMIT = 10;

    private final WarrantyRepository warrantyRepository;
    private final WarrantyClaimRepository claimRepository;
    private final RepairOrderService repairOrderService;
    private final CurrentCustomerResolver currentCustomer;
    private final RequestRateLimiter rateLimiter;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final ApplicationEventPublisher events;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PageResponse<WarrantyResponse> search(String keyword, Boolean validOnly, Pageable pageable) {
        LocalDate today = today();
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Warranty> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("repairOrder").get("code")), like),
                        cb.like(cb.lower(root.get("customer").get("fullName")), like),
                        cb.like(root.get("customer").get("phone"), like),
                        cb.like(cb.lower(root.get("device").get("serialNumber")), like)));
            }
            if (Boolean.TRUE.equals(validOnly)) {
                p.add(cb.equal(root.get("status"), WarrantyStatus.ACTIVE));
                p.add(cb.greaterThanOrEqualTo(root.get("endDate"), today));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(warrantyRepository.findAll(spec, page), w -> WarrantyResponse.from(w, today));
    }

    /** Tra cứu đầy đủ theo mã BH / mã phiếu / serial. CUSTOMER chỉ thấy bảo hành của mình. */
    @Transactional(readOnly = true)
    public List<WarrantyResponse> lookup(String keyword, AuthenticatedUser user) {
        LocalDate today = today();
        return warrantyRepository.lookup(keyword.trim()).stream()
                .filter(w -> user.role() != Role.CUSTOMER || CurrentCustomerResolver.owns(user, w.getCustomer()))
                .map(w -> WarrantyResponse.from(w, today)).toList();
    }

    /** Công khai, không cần đăng nhập: chỉ trả thông tin tối thiểu của bảo hành mới nhất. */
    @Transactional(readOnly = true)
    public PublicWarrantyCheckResponse publicCheck(String keyword, String clientIp) {
        rateLimiter.check("warranty:" + clientIp, PUBLIC_LIMIT, Duration.ofMinutes(1));
        if (!StringUtils.hasText(keyword) || keyword.trim().length() < 4) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Vui lòng nhập mã bảo hành, mã phiếu hoặc serial (≥ 4 ký tự)");
        }
        LocalDate today = today();
        return warrantyRepository.lookup(keyword.trim()).stream().findFirst()
                .map(w -> PublicWarrantyCheckResponse.from(WarrantyResponse.from(w, today)))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy thông tin bảo hành"));
    }

    @Transactional(readOnly = true)
    public List<WarrantyResponse> mine(AuthenticatedUser user) {
        LocalDate today = today();
        return warrantyRepository.findByCustomerIdOrderByEndDateDesc(currentCustomer.require(user).getId()).stream()
                .map(w -> WarrantyResponse.from(w, today)).toList();
    }

    @Transactional(readOnly = true)
    public WarrantyDetailResponse get(Long id, AuthenticatedUser user) {
        Warranty w = loadVisible(id, user);
        List<WarrantyClaimResponse> claims = claimRepository.findByWarrantyIdOrderByCreatedAtDesc(id).stream()
                .map(WarrantyClaimResponse::from).toList();
        boolean canClaim = w.isValidOn(today()) && !claimRepository.existsByWarrantyIdAndStatusIn(id, OPEN_CLAIMS);
        return new WarrantyDetailResponse(WarrantyResponse.from(w, today()), claims, canClaim);
    }

    @Transactional
    public WarrantyResponse voidWarranty(Long id, String reason, AuthenticatedUser actor) {
        Warranty w = loadVisible(id, actor);
        if (w.getStatus() == WarrantyStatus.VOID) {
            throw BusinessException.conflict("Bảo hành đã bị hủy trước đó");
        }
        w.setStatus(WarrantyStatus.VOID);
        w.setVoidReason(reason.trim());
        auditService.record(actor.id(), "WARRANTY_VOIDED", "WARRANTY", id, Map.of("reason", reason.trim()));
        return WarrantyResponse.from(w, today());
    }

    /** STAFF tiếp nhận tại quầy, hoặc khách gửi online cho bảo hành của mình. */
    @Transactional
    public WarrantyClaimResponse createClaim(Long warrantyId, String issue, AuthenticatedUser actor) {
        Warranty w = loadVisible(warrantyId, actor);
        if (!w.isValidOn(today())) {
            throw BusinessException.conflict(w.getStatus() == WarrantyStatus.VOID
                    ? "Bảo hành đã bị hủy: " + w.getVoidReason()
                    : "Bảo hành đã hết hạn ngày " + w.getEndDate());
        }
        if (claimRepository.existsByWarrantyIdAndStatusIn(warrantyId, OPEN_CLAIMS)) {
            throw BusinessException.conflict("Bảo hành này đang có một yêu cầu chưa xử lý xong");
        }
        WarrantyClaim claim = claimRepository.save(new WarrantyClaim(codeGenerator.next(CodeType.WARRANTY_CLAIM), w,
                issue.trim(), entityManager.getReference(User.class, actor.id())));
        events.publishEvent(new WarrantyClaimCreated(claim.getId(), actor.id()));
        return WarrantyClaimResponse.from(claim);
    }

    @Transactional(readOnly = true)
    public PageResponse<WarrantyClaimResponse> claims(List<WarrantyClaimStatus> statuses, Pageable pageable) {
        List<WarrantyClaimStatus> filter = statuses == null || statuses.isEmpty() ? List.of(WarrantyClaimStatus.values()) : statuses;
        return PageResponse.of(claimRepository.findByStatusInOrderByCreatedAtDesc(filter, pageable), WarrantyClaimResponse::from);
    }

    /** Chấp nhận → tạo phiếu sửa chữa bảo hành (đi lại toàn bộ workflow, báo giá có thể 0đ). */
    @Transactional
    public WarrantyClaimResponse accept(Long claimId, AcceptClaimRequest request, AuthenticatedUser actor) {
        WarrantyClaim claim = loadSubmitted(claimId);
        Warranty w = claim.getWarranty();
        if (!w.isValidOn(today())) {
            throw BusinessException.conflict("Bảo hành đã hết hạn hoặc bị hủy, không thể chấp nhận");
        }
        ReceptionInfo info = new ReceptionInfo("[Bảo hành " + w.getCode() + "] " + claim.getIssueDescription(),
                request.deviceCondition(), null, request.priority() == null ? RepairPriority.HIGH : request.priority(),
                null, request.technicianId());
        RepairOrder order = repairOrderService.openWarrantyRepair(w.getCustomer(), w.getDevice(), info, actor,
                "Phiếu bảo hành từ yêu cầu " + claim.getCode());
        claim.setStatus(WarrantyClaimStatus.ACCEPTED);
        claim.setRepairOrder(order);
        claim.setHandledBy(entityManager.getReference(User.class, actor.id()));
        claim.setResolutionNote(StringUtils.hasText(request.note()) ? request.note().trim() : null);
        claimRepository.flush();
        return WarrantyClaimResponse.from(claim);
    }

    @Transactional
    public WarrantyClaimResponse reject(Long claimId, String reason, AuthenticatedUser actor) {
        WarrantyClaim claim = loadSubmitted(claimId);
        claim.setStatus(WarrantyClaimStatus.REJECTED);
        claim.setResolutionNote(reason.trim());
        claim.setHandledBy(entityManager.getReference(User.class, actor.id()));
        claim.setResolvedAt(clock.instant());
        return WarrantyClaimResponse.from(claim);
    }

    private WarrantyClaim loadSubmitted(Long claimId) {
        WarrantyClaim claim = claimRepository.findWithDetailsById(claimId)
                .orElseThrow(() -> BusinessException.notFound("Yêu cầu bảo hành", claimId));
        if (claim.getStatus() != WarrantyClaimStatus.SUBMITTED) {
            throw BusinessException.conflict("Yêu cầu đã được xử lý (" + claim.getStatus() + ")");
        }
        return claim;
    }

    private Warranty loadVisible(Long id, AuthenticatedUser user) {
        Warranty w = warrantyRepository.findWithDetailsById(id).orElseThrow(() -> BusinessException.notFound("Bảo hành", id));
        if (user.role() == Role.CUSTOMER && !CurrentCustomerResolver.owns(user, w.getCustomer())) {
            throw BusinessException.notFound("Bảo hành", id);
        }
        if (user.role() == Role.TECHNICIAN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Kỹ thuật viên không quản lý bảo hành");
        }
        return w;
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(SHOP_ZONE));
    }
}
