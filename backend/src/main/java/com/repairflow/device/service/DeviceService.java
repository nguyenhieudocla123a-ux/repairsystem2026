package com.repairflow.device.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.PageRequests;
import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.customer.service.CustomerService;
import com.repairflow.device.dto.DeviceDtos.DeviceRequest;
import com.repairflow.device.dto.DeviceDtos.DeviceResponse;
import com.repairflow.device.entity.Device;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.device.repository.DeviceRepository;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.repair.repository.RepairRequestRepository;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
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
 * Thiết bị của khách hàng. STAFF/ADMIN thao tác mọi thiết bị; CUSTOMER chỉ thiết bị của mình
 * (truy cập thiết bị người khác → 404, không tiết lộ sự tồn tại – TD-18).
 */
@Service
@RequiredArgsConstructor
public class DeviceService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "name");

    private final DeviceRepository deviceRepository;
    private final CustomerService customerService;
    private final CurrentCustomerResolver currentCustomer;
    private final RepairOrderRepository repairOrderRepository;
    private final RepairRequestRepository repairRequestRepository;

    @Transactional(readOnly = true)
    public PageResponse<DeviceResponse> search(Long customerId, DeviceType type, String keyword, Pageable pageable) {
        Pageable page = PageRequests.withAllowedSort(pageable, SORTABLE, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(deviceRepository.findAll(filter(customerId, type, keyword), page), DeviceResponse::from);
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> listOfCustomer(Long customerId) {
        return deviceRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream().map(DeviceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> listMine(AuthenticatedUser user) {
        return listOfCustomer(currentCustomer.require(user).getId());
    }

    @Transactional(readOnly = true)
    public DeviceResponse get(Long id, AuthenticatedUser user) {
        return DeviceResponse.from(loadVisible(id, user));
    }

    @Transactional
    public DeviceResponse create(DeviceRequest request, AuthenticatedUser user) {
        Customer owner;
        if (user.role() == Role.CUSTOMER) {
            owner = currentCustomer.require(user);
        } else {
            if (request.customerId() == null) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng chọn khách hàng");
            }
            owner = customerService.load(request.customerId());
        }
        String serial = normalizeSerial(request.serialNumber());
        assertSerialUnique(serial, null);
        Device device = new Device(owner, request.name().trim(), request.deviceType());
        apply(device, request, serial);
        return DeviceResponse.from(deviceRepository.save(device));
    }

    @Transactional
    public DeviceResponse update(Long id, DeviceRequest request, AuthenticatedUser user) {
        Device device = loadVisible(id, user);
        String serial = normalizeSerial(request.serialNumber());
        assertSerialUnique(serial, id);
        device.setName(request.name().trim());
        device.setDeviceType(request.deviceType());
        apply(device, request, serial);
        return DeviceResponse.from(device);
    }

    @Transactional
    public void delete(Long id) {
        Device device = deviceRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Thiết bị", id));
        if (repairOrderRepository.countByDeviceId(id) > 0 || repairRequestRepository.countByDeviceId(id) > 0) {
            throw BusinessException.conflict("Không thể xóa thiết bị đã có lịch sử sửa chữa");
        }
        deviceRepository.delete(device);
    }

    /** Thiết bị mà người dùng được phép xem; CUSTOMER xem thiết bị người khác → 404. */
    public Device loadVisible(Long id, AuthenticatedUser user) {
        Device device = deviceRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Thiết bị", id));
        if (user.role() == Role.CUSTOMER && !CurrentCustomerResolver.owns(user, device.getCustomer())) {
            throw BusinessException.notFound("Thiết bị", id);
        }
        return device;
    }

    private void apply(Device device, DeviceRequest request, String serial) {
        device.setBrand(trimToNull(request.brand()));
        device.setModel(trimToNull(request.model()));
        device.setSerialNumber(serial);
        device.setColor(trimToNull(request.color()));
        device.setNote(trimToNull(request.note()));
    }

    private void assertSerialUnique(String serial, Long excludeId) {
        if (serial == null) {
            return;
        }
        deviceRepository.findBySerialIgnoreCase(serial)
                .filter(existing -> !existing.getId().equals(excludeId))
                .ifPresent(existing -> {
                    throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE,
                            "Serial/IMEI " + serial + " đã được đăng ký cho thiết bị khác");
                });
    }

    private static Specification<Device> filter(Long customerId, DeviceType type, String keyword) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("deviceType"), type));
            }
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("model")), like),
                        cb.like(cb.lower(root.get("brand")), like),
                        cb.like(cb.lower(root.get("serialNumber")), like),
                        cb.like(cb.lower(root.get("customer").get("fullName")), like)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Serial lưu chữ in hoa, bỏ khoảng trắng thừa → so khớp & tra cứu bảo hành nhất quán. */
    static String normalizeSerial(String serial) {
        return StringUtils.hasText(serial) ? serial.trim().toUpperCase(Locale.ROOT) : null;
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
