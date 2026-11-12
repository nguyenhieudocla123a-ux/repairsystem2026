package com.repairflow.customer.service;

import com.repairflow.common.audit.AuditService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.util.CodeGenerator;
import com.repairflow.common.util.CodeGenerator.CodeType;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.dto.CustomerDtos.ActivateAccountRequest;
import com.repairflow.customer.dto.CustomerDtos.CustomerDetailResponse;
import com.repairflow.customer.dto.CustomerDtos.CustomerRequest;
import com.repairflow.customer.dto.CustomerDtos.CustomerResponse;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.device.repository.DeviceRepository;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairRequestRepository;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Quản lý hồ sơ khách hàng (STAFF, ADMIN). */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "fullName", "code");

    private final CustomerRepository customerRepository;
    private final DeviceRepository deviceRepository;
    private final RepairOrderRepository repairOrderRepository;
    private final RepairRequestRepository repairRequestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> search(String keyword, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(customerRepository.findAll(matches(keyword), page), CustomerResponse::from);
    }

    @Transactional(readOnly = true)
    public CustomerDetailResponse get(Long id) {
        Customer c = load(id);
        return CustomerDetailResponse.of(c, deviceRepository.countByCustomerId(id),
                repairOrderRepository.countByCustomerId(id), repairOrderRepository.sumDeliveredAmountByCustomer(id));
    }

    @Transactional
    public CustomerResponse create(Long actorId, CustomerRequest request) {
        String email = normalizeEmail(request.email());
        assertUnique(request.phone(), email, null);
        Customer customer = new Customer(codeGenerator.next(CodeType.CUSTOMER), request.fullName().trim(), request.phone());
        apply(customer, request, email);
        customer.setCreatedBy(entityManager.getReference(User.class, actorId));
        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = load(id);
        String email = normalizeEmail(request.email());
        assertUnique(request.phone(), email, id);
        if (customer.getUser() != null && email == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Khách hàng đã có tài khoản phải có email");
        }
        customer.setFullName(request.fullName().trim());
        customer.setPhone(request.phone());
        apply(customer, request, email);
        // Giữ email/tên/SĐT tài khoản đăng nhập đồng bộ với hồ sơ
        if (customer.getUser() != null) {
            User user = customer.getUser();
            if (!user.getEmail().equals(email) && userRepository.existsByEmail(email)) {
                throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã được tài khoản khác sử dụng");
            }
            user.setEmail(email);
            user.setFullName(customer.getFullName());
            user.setPhone(customer.getPhone());
        }
        return CustomerResponse.from(customer);
    }

    /** Chỉ xóa được khách chưa phát sinh nghiệp vụ; thiết bị (chưa từng sửa) bị xóa kèm. */
    @Transactional
    public void delete(Long actorId, Long id) {
        Customer customer = load(id);
        if (repairOrderRepository.countByCustomerId(id) > 0 || repairRequestRepository.countByCustomerId(id) > 0) {
            throw BusinessException.conflict("Không thể xóa khách hàng đã có phiếu hoặc yêu cầu sửa chữa");
        }
        if (customer.getUser() != null) {
            throw BusinessException.conflict("Khách hàng đã có tài khoản đăng nhập, hãy khóa tài khoản thay vì xóa");
        }
        deviceRepository.deleteAll(deviceRepository.findByCustomerIdOrderByCreatedAtDesc(id));
        customerRepository.delete(customer);
        auditService.record(actorId, "CUSTOMER_DELETED", "CUSTOMER", id, Map.of("code", customer.getCode()));
    }

    /** STAFF tạo tài khoản cổng khách cho hồ sơ có sẵn (khách đã xác minh danh tính tại quầy). */
    @Transactional
    public CustomerResponse activateAccount(Long actorId, Long id, ActivateAccountRequest request) {
        Customer customer = load(id);
        if (customer.getUser() != null) {
            throw BusinessException.conflict("Khách hàng đã có tài khoản");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email) || customerRepository.existsByEmailAndIdNot(email, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã được sử dụng");
        }
        User user = userRepository.save(new User(email, passwordEncoder.encode(request.password()),
                customer.getFullName(), customer.getPhone(), Role.CUSTOMER));
        customer.setUser(user);
        customer.setEmail(email);
        auditService.record(actorId, "CUSTOMER_ACCOUNT_ACTIVATED", "CUSTOMER", id, Map.of("userId", user.getId()));
        return CustomerResponse.from(customer);
    }

    public Customer load(Long id) {
        return customerRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Khách hàng", id));
    }

    private void apply(Customer customer, CustomerRequest request, String email) {
        customer.setEmail(email);
        customer.setAddress(trimToNull(request.address()));
        customer.setNote(trimToNull(request.note()));
    }

    private void assertUnique(String phone, String email, Long excludeId) {
        boolean phoneTaken = excludeId == null ? customerRepository.existsByPhone(phone)
                : customerRepository.existsByPhoneAndIdNot(phone, excludeId);
        if (phoneTaken) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Số điện thoại đã thuộc về khách hàng khác");
        }
        if (email != null) {
            boolean emailTaken = excludeId == null ? customerRepository.existsByEmail(email)
                    : customerRepository.existsByEmailAndIdNot(email, excludeId);
            if (emailTaken) {
                throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Email đã thuộc về khách hàng khác");
            }
        }
    }

    /** Tìm theo mã, tên (không dấu cách hoa thường), SĐT, email. */
    private static Specification<Customer> matches(String keyword) {
        return (root, query, cb) -> {
            if (!StringUtils.hasText(keyword)) {
                return cb.conjunction();
            }
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("fullName")), like),
                    cb.like(cb.lower(root.get("code")), like),
                    cb.like(root.get("phone"), like),
                    cb.like(root.get("email"), like));
        };
    }

    static String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : null;
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
