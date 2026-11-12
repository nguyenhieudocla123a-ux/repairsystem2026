package com.repairflow.repair.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.repair.dto.RepairOrderDtos.ReceptionInfo;
import com.repairflow.repair.dto.RepairOrderDtos.RepairOrderDetailResponse;
import com.repairflow.repair.dto.RepairRequestDtos.RejectRepairRequestRequest;
import com.repairflow.repair.dto.RepairRequestDtos.RepairRequestResponse;
import com.repairflow.repair.entity.RepairRequestStatus;
import com.repairflow.repair.service.RepairRequestService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

@Tag(name = "Repair Requests", description = "Yêu cầu sửa chữa online (STAFF xử lý)")
@RestController
@RequestMapping("/api/v1/repair-requests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class RepairRequestController {

    private final RepairRequestService service;

    @GetMapping
    public PageResponse<RepairRequestResponse> search(@RequestParam(required = false) RepairRequestStatus status,
                                                      @RequestParam(required = false) String q, Pageable pageable) {
        return service.search(status, q, null, pageable);
    }

    @Operation(summary = "Khách mang máy tới → chuyển yêu cầu thành phiếu sửa chữa")
    @PostMapping("/{id}/convert")
    public ResponseEntity<RepairOrderDetailResponse> convert(@PathVariable Long id, @Valid @RequestBody ReceptionInfo info,
                                                             @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.convert(id, info, user));
    }

    @PostMapping("/{id}/reject")
    public RepairRequestResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRepairRequestRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser user) {
        return service.reject(id, request.reason(), user);
    }
}
