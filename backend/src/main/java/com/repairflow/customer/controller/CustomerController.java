package com.repairflow.customer.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.customer.dto.CustomerDtos.ActivateAccountRequest;
import com.repairflow.customer.dto.CustomerDtos.CustomerDetailResponse;
import com.repairflow.customer.dto.CustomerDtos.CustomerRequest;
import com.repairflow.customer.dto.CustomerDtos.CustomerResponse;
import com.repairflow.customer.service.CustomerService;
import com.repairflow.device.dto.DeviceDtos.DeviceResponse;
import com.repairflow.device.service.DeviceService;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.service.RepairOrderQueryService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
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

@Tag(name = "Customers", description = "Hồ sơ khách hàng (STAFF, ADMIN)")
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class CustomerController {

    private final CustomerService customerService;
    private final DeviceService deviceService;
    private final RepairOrderQueryService repairOrderQueryService;

    @Operation(summary = "Tìm khách hàng theo mã, tên, SĐT, email")
    @GetMapping
    public PageResponse<CustomerResponse> search(@RequestParam(required = false) String q, Pageable pageable) {
        return customerService.search(q, pageable);
    }

    @GetMapping("/{id}")
    public CustomerDetailResponse get(@PathVariable Long id) {
        return customerService.get(id);
    }

    @PostMapping
    public ResponseEntity<CustomerResponse> create(@AuthenticationPrincipal AuthenticatedUser actor,
                                                   @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(actor.id(), request));
    }

    @PutMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @Operation(summary = "Xóa khách hàng chưa có phiếu sửa chữa (409 nếu đã có)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id) {
        customerService.delete(actor.id(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/devices")
    public List<DeviceResponse> devices(@PathVariable Long id) {
        customerService.load(id);
        return deviceService.listOfCustomer(id);
    }

    @GetMapping("/{id}/repair-orders")
    public PageResponse<RepairOrderSummaryResponse> repairOrders(@PathVariable Long id, Pageable pageable) {
        customerService.load(id);
        return repairOrderQueryService.historyOfCustomer(id, pageable);
    }

    @Operation(summary = "Kích hoạt tài khoản cổng khách hàng cho hồ sơ có sẵn")
    @PostMapping("/{id}/account")
    public CustomerResponse activateAccount(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id,
                                            @Valid @RequestBody ActivateAccountRequest request) {
        return customerService.activateAccount(actor.id(), id, request);
    }
}
