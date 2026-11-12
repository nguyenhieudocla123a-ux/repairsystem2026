package com.repairflow.repair.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.device.entity.Device;
import com.repairflow.device.service.DeviceService;
import com.repairflow.repair.dto.RepairOrderDtos.ReceptionInfo;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairRequestDtos.CreateRepairRequestRequest;
import com.repairflow.repair.dto.RepairRequestDtos.RepairRequestResponse;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairRequest;
import com.repairflow.repair.entity.RepairRequestStatus;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairRequestRepository;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Yêu cầu sửa chữa online: khách gửi trước, STAFF tiếp nhận khi khách mang máy tới (chuyển thành phiếu)
 * hoặc từ chối.
 */
@Service
@RequiredArgsConstructor
public class RepairRequestService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "expectedDropOffDate");

    private final RepairRequestRepository repository;
    private final RepairOrderRepository orderRepository;
    private final RepairOrderService orderService;
    private final RepairOrderQueryService orderQueryService;
    private final DeviceService deviceService;
    private final CurrentCustomerResolver currentCustomer;
    private final CodeGenerator codeGenerator;
    private final EntityManager entityManager;

    @Transactional
    public RepairRequestResponse create(CreateRepairRequestRequest request, AuthenticatedUser user) {
        Customer customer = currentCustomer.require(user);
        Device device = deviceService.loadVisible(request.deviceId(), user); // chỉ thiết bị của chính khách
        RepairRequest entity = new RepairRequest(codeGenerator.next(CodeType.REPAIR_REQUEST), customer, device,
                request.issueDescription().trim());
        entity.setExpectedDropOffDate(request.expectedDropOffDate());
        return RepairRequestResponse.from(repository.save(entity), null, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<RepairRequestResponse> searchMine(AuthenticatedUser user, Pageable pageable) {
        Long customerId = currentCustomer.require(user).getId();
        return search(null, null, customerId, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<RepairRequestResponse> search(RepairRequestStatus status, String keyword, Long customerId,
                                                      Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<RepairRequest> result = repository.findAll(filter(status, keyword, customerId), page);
        // Một truy vấn lấy phiếu tương ứng cho cả trang (tránh N+1)
        List<Long> ids = result.getContent().stream().map(RepairRequest::getId).toList();
        Map<Long, RepairOrder> orders = ids.isEmpty() ? Map.of()
                : orderRepository.findByRepairRequestIdIn(ids).stream()
                        .collect(Collectors.toMap(o -> o.getRepairRequest().getId(), Function.identity()));
        return PageResponse.of(result, r -> {
            RepairOrder o = orders.get(r.getId());
            return RepairRequestResponse.from(r, o == null ? null : o.getId(), o == null ? null : o.getCode());
        });
    }

    @Transactional
    public RepairRequestResponse cancelMine(Long id, AuthenticatedUser user) {
        RepairRequest request = loadPending(id);
        if (!request.getCustomer().getId().equals(currentCustomer.require(user).getId())) {
            throw BusinessException.notFound("Yêu cầu sửa chữa", id);
        }
        request.setStatus(RepairRequestStatus.CANCELLED);
        return RepairRequestResponse.from(request, null, null);
    }

    @Transactional
    public RepairRequestResponse reject(Long id, String reason, AuthenticatedUser actor) {
        RepairRequest request = loadPending(id);
        request.setStatus(RepairRequestStatus.REJECTED);
        request.setRejectReason(reason.trim());
        request.setHandledBy(entityManager.getReference(User.class, actor.id()));
        return RepairRequestResponse.from(request, null, null);
    }

    /** Khách mang máy tới → tạo phiếu sửa chữa từ yêu cầu. */
    @Transactional
    public RepairOrderDetailResponse convert(Long id, ReceptionInfo info, AuthenticatedUser actor) {
        RepairRequest request = loadPending(id);
        RepairOrder order = orderService.openFromRequest(request, info, actor);
        request.setStatus(RepairRequestStatus.CONVERTED);
        request.setHandledBy(entityManager.getReference(User.class, actor.id()));
        orderRepository.flush();
        return orderQueryService.toDetail(order, actor);
    }

    private RepairRequest loadPending(Long id) {
        RepairRequest request = repository.findById(id).orElseThrow(() -> BusinessException.notFound("Yêu cầu sửa chữa", id));
        if (request.getStatus() != RepairRequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Yêu cầu đã được xử lý (" + request.getStatus() + ")");
        }
        return request;
    }

    private static Specification<RepairRequest> filter(RepairRequestStatus status, String keyword, Long customerId) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (customerId != null) {
                p.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("customer").get("fullName")), like),
                        cb.like(root.get("customer").get("phone"), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
