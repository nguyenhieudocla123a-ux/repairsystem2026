package com.repairflow.repair.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.repair.dto.RepairOrderDtos.CancelRequest;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.dto.RepairRequestDtos.CreateRepairRequestRequest;
import com.repairflow.repair.dto.RepairRequestDtos.RepairRequestResponse;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.service.RepairOrderQueryService;
import com.repairflow.repair.service.RepairOrderService;
import com.repairflow.repair.service.RepairRequestService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Cổng khách hàng: phiếu và yêu cầu sửa chữa của chính mình. Chi tiết phiếu dùng chung GET /repair-orders/{id}. */
@Tag(name = "My Repairs", description = "Khách hàng theo dõi sửa chữa của mình")
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class MyRepairController {

    private final RepairOrderQueryService orderQueryService;
    private final RepairOrderService orderService;
    private final RepairRequestService requestService;

    @GetMapping("/repair-orders")
    public PageResponse<RepairOrderSummaryResponse> myOrders(@RequestParam(required = false) List<RepairStatus> status,
                                                             @AuthenticationPrincipal AuthenticatedUser user,
                                                             Pageable pageable) {
        return orderQueryService.searchMine(status, user, pageable);
    }

    @Operation(summary = "Khách hủy phiếu khi máy vừa được tiếp nhận")
    @PostMapping("/repair-orders/{id}/cancel")
    public RepairOrderDetailResponse cancelOrder(@PathVariable Long id, @Valid @RequestBody CancelRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser user) {
        return orderService.cancelByCustomer(id, request.reason(), user);
    }

    @GetMapping("/repair-requests")
    public PageResponse<RepairRequestResponse> myRequests(@AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return requestService.searchMine(user, pageable);
    }

    @Operation(summary = "Gửi yêu cầu sửa chữa online")
    @PostMapping("/repair-requests")
    public ResponseEntity<RepairRequestResponse> createRequest(@Valid @RequestBody CreateRepairRequestRequest request,
                                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.create(request, user));
    }

    @PostMapping("/repair-requests/{id}/cancel")
    public RepairRequestResponse cancelRequest(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return requestService.cancelMine(id, user);
    }
}
