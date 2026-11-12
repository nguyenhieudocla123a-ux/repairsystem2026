package com.repairflow.quotation.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.quotation.dto.QuotationDtos.QuotationRequest;
import com.repairflow.quotation.dto.QuotationDtos.QuotationResponse;
import com.repairflow.quotation.dto.QuotationDtos.QuotationSummary;
import com.repairflow.quotation.dto.QuotationDtos.RespondRequest;
import com.repairflow.quotation.entity.QuotationStatus;
import com.repairflow.quotation.service.QuotationService;
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

@Tag(name = "Quotations", description = "Báo giá sửa chữa")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService service;

    @Operation(summary = "Các phiên bản báo giá của phiếu (khách không thấy bản nháp)")
    @GetMapping("/repair-orders/{orderId}/quotations")
    public List<QuotationResponse> ofOrder(@PathVariable Long orderId, @AuthenticationPrincipal AuthenticatedUser user) {
        return service.listOfOrder(orderId, user);
    }

    @Operation(summary = "Tạo báo giá nháp – phiếu phải ở INSPECTING / REPAIRING / REJECTED")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/repair-orders/{orderId}/quotations")
    public ResponseEntity<QuotationResponse> create(@PathVariable Long orderId, @Valid @RequestBody QuotationRequest request,
                                                    @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createDraft(orderId, request, user));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/quotations")
    public PageResponse<QuotationSummary> search(@RequestParam(required = false) QuotationStatus status,
                                                 @RequestParam(required = false) String q,
                                                 @AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return service.search(status, q, user, pageable);
    }

    @GetMapping("/quotations/{id}")
    public QuotationResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return service.get(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PutMapping("/quotations/{id}")
    public QuotationResponse update(@PathVariable Long id, @Valid @RequestBody QuotationRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        return service.updateDraft(id, request, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @DeleteMapping("/quotations/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        service.deleteDraft(id, user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Gửi báo giá cho khách → phiếu chuyển WAITING_CONFIRMATION")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/quotations/{id}/send")
    public QuotationResponse send(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return service.send(id, user);
    }

    @Operation(summary = "Đồng ý báo giá (khách chủ phiếu, hoặc nhân viên thay khách kèm ghi chú)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @PostMapping("/quotations/{id}/approve")
    public QuotationResponse approve(@PathVariable Long id, @Valid @RequestBody(required = false) RespondRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser user) {
        return service.approve(id, request == null ? null : request.note(), user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @PostMapping("/quotations/{id}/reject")
    public QuotationResponse reject(@PathVariable Long id, @Valid @RequestBody(required = false) RespondRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        return service.reject(id, request == null ? null : request.note(), user);
    }

    @Operation(summary = "Báo giá của tôi (khách hàng) – lọc status=SENT để xem báo giá chờ xác nhận")
    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/me/quotations")
    public PageResponse<QuotationSummary> mine(@RequestParam(required = false) QuotationStatus status,
                                               @AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return service.search(status, null, user, pageable);
    }
}
