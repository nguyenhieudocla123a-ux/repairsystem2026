package com.repairflow.repair.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.repair.dto.RepairOrderDtos.AssignTechnicianRequest;
import com.repairflow.repair.dto.RepairOrderDtos.CreateRepairOrderRequest;
import com.repairflow.repair.dto.RepairOrderDtos.DeliverRequest;
import com.repairflow.repair.dto.RepairOrderDtos.DiagnosisRequest;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderSummaryResponse;
import com.repairflow.repair.dto.RepairOrderDtos.StatusHistoryResponse;
import com.repairflow.repair.dto.RepairOrderDtos.TransitionRequest;
import com.repairflow.repair.dto.RepairOrderDtos.UpdateRepairOrderRequest;
import com.repairflow.repair.entity.RepairPriority;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.service.DeliveryService;
import com.repairflow.repair.service.RepairOrderQueryService.SearchFilter;
import com.repairflow.repair.service.RepairOrderQueryService;
import com.repairflow.repair.service.RepairOrderService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Repair Orders", description = "Phiếu sửa chữa – tiếp nhận, phân công, chẩn đoán, chuyển trạng thái")
@RestController
@RequestMapping("/api/v1/repair-orders")
@RequiredArgsConstructor
public class RepairOrderController {

    private final RepairOrderService service;
    private final RepairOrderQueryService queryService;
    private final DeliveryService deliveryService;

    @Operation(summary = "Danh sách phiếu (KTV tự động chỉ thấy phiếu được giao)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping
    public PageResponse<RepairOrderSummaryResponse> search(
            @RequestParam(required = false) List<RepairStatus> status,
            @RequestParam(required = false) Long technicianId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) RepairPriority priority,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal AuthenticatedUser user,
            Pageable pageable) {
        return queryService.search(new SearchFilter(status, technicianId, customerId, priority, q, from, to), user, pageable);
    }

    @Operation(summary = "Tìm nhanh theo mã phiếu")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/lookup")
    public RepairOrderSummaryResponse lookup(@RequestParam String code, @AuthenticationPrincipal AuthenticatedUser user) {
        return queryService.lookup(code, user);
    }

    @Operation(summary = "Chi tiết phiếu (kèm allowedTransitions cho người dùng hiện tại)")
    @GetMapping("/{id}")
    public RepairOrderDetailResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return queryService.get(id, user);
    }

    @GetMapping("/{id}/history")
    public List<StatusHistoryResponse> history(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return queryService.history(id, user);
    }

    @Operation(summary = "Tiếp nhận thiết bị tại quầy – tạo phiếu RECEIVED")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping
    public ResponseEntity<RepairOrderDetailResponse> create(@Valid @RequestBody CreateRepairOrderRequest request,
                                                            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request.customerId(), request.deviceId(), request.reception(), user));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PutMapping("/{id}")
    public RepairOrderDetailResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRepairOrderRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser user) {
        return service.update(id, request, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PatchMapping("/{id}/assign")
    public RepairOrderDetailResponse assign(@PathVariable Long id, @Valid @RequestBody AssignTechnicianRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser user) {
        return service.assign(id, request.technicianId(), user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @PatchMapping("/{id}/diagnosis")
    public RepairOrderDetailResponse diagnosis(@PathVariable Long id, @Valid @RequestBody DiagnosisRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return service.updateDiagnosis(id, request, user);
    }

    @Operation(summary = "Chuyển trạng thái thủ công: INSPECTING, REPAIRING, WAITING_FOR_PARTS, COMPLETED, CANCELLED")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @PostMapping("/{id}/transitions")
    public RepairOrderDetailResponse transition(@PathVariable Long id, @Valid @RequestBody TransitionRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser user) {
        return service.transition(id, request.toStatus(), request.note(), request.version(), user);
    }

    @Operation(summary = "Bàn giao máy (COMPLETED → DELIVERED kèm thanh toán + bảo hành; REJECTED → DELIVERED trả máy không sửa)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/{id}/deliver")
    public RepairOrderDetailResponse deliver(@PathVariable Long id,
                                             @Valid @RequestBody DeliverRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser user) {
        return deliveryService.deliver(id, request, user);
    }
}
