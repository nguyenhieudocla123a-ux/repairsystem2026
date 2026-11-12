package com.repairflow.device.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.device.dto.DeviceDtos.DeviceRequest;
import com.repairflow.device.dto.DeviceDtos.DeviceResponse;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.device.service.DeviceService;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.service.RepairOrderQueryService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Devices", description = "Thiết bị của khách hàng")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final RepairOrderQueryService repairOrderQueryService;

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/devices")
    public PageResponse<DeviceResponse> search(@RequestParam(required = false) Long customerId,
                                               @RequestParam(required = false) DeviceType type,
                                               @RequestParam(required = false) String q,
                                               Pageable pageable) {
        return deviceService.search(customerId, type, q, pageable);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @GetMapping("/devices/{id}")
    public DeviceResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return deviceService.get(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/devices")
    public ResponseEntity<DeviceResponse> create(@Valid @RequestBody DeviceRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(request, user));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @PutMapping("/devices/{id}")
    public DeviceResponse update(@PathVariable Long id, @Valid @RequestBody DeviceRequest request,
                                 @AuthenticationPrincipal AuthenticatedUser user) {
        return deviceService.update(id, request, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @DeleteMapping("/devices/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deviceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @GetMapping("/devices/{id}/repair-orders")
    public List<RepairOrderSummaryResponse> repairHistory(@PathVariable Long id,
                                                          @AuthenticationPrincipal AuthenticatedUser user) {
        deviceService.loadVisible(id, user); // kiểm tra quyền xem thiết bị
        return repairOrderQueryService.historyOfDevice(id);
    }

    // ----- Khách hàng tự quản lý thiết bị -----

    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/me/devices")
    public List<DeviceResponse> myDevices(@AuthenticationPrincipal AuthenticatedUser user) {
        return deviceService.listMine(user);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/me/devices")
    public ResponseEntity<DeviceResponse> addMyDevice(@Valid @RequestBody DeviceRequest request,
                                                      @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(request, user));
    }
}
