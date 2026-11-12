package com.repairflow.warranty.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.warranty.dto.WarrantyDtos.AcceptClaimRequest;
import com.repairflow.warranty.dto.WarrantyDtos.CreateClaimRequest;
import com.repairflow.warranty.dto.WarrantyDtos.PublicWarrantyCheckResponse;
import com.repairflow.warranty.dto.WarrantyDtos.ReasonRequest;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyClaimResponse;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyDetailResponse;
import com.repairflow.warranty.dto.WarrantyDtos.WarrantyResponse;
import com.repairflow.warranty.entity.WarrantyClaimStatus;
import com.repairflow.warranty.service.WarrantyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Warranty", description = "Bảo hành, tra cứu, yêu cầu bảo hành")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WarrantyController {

    private final WarrantyService service;

    @Operation(summary = "Tra cứu công khai (không cần đăng nhập, 10 lần/phút/IP, không có thông tin cá nhân)")
    @GetMapping("/public/warranty-check")
    public PublicWarrantyCheckResponse publicCheck(@RequestParam String keyword, HttpServletRequest http) {
        return service.publicCheck(keyword, http.getRemoteAddr());
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/warranties")
    public PageResponse<WarrantyResponse> search(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) Boolean validOnly, Pageable pageable) {
        return service.search(q, validOnly, pageable);
    }

    @Operation(summary = "Tra cứu theo mã bảo hành / mã phiếu / serial (khách chỉ thấy của mình)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @GetMapping("/warranties/lookup")
    public List<WarrantyResponse> lookup(@RequestParam String keyword, @AuthenticationPrincipal AuthenticatedUser user) {
        return service.lookup(keyword, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @GetMapping("/warranties/{id}")
    public WarrantyDetailResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return service.get(id, user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/warranties/{id}/void")
    public WarrantyResponse voidWarranty(@PathVariable Long id, @Valid @RequestBody ReasonRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser user) {
        return service.voidWarranty(id, request.reason(), user);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/me/warranties")
    public List<WarrantyResponse> mine(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.mine(user);
    }

    @Operation(summary = "Tạo yêu cầu bảo hành – 409 nếu hết hạn / bị hủy / đang có yêu cầu mở")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER')")
    @PostMapping("/warranties/{id}/claims")
    public ResponseEntity<WarrantyClaimResponse> createClaim(@PathVariable Long id, @Valid @RequestBody CreateClaimRequest request,
                                                             @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createClaim(id, request.issueDescription(), user));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/warranty-claims")
    public PageResponse<WarrantyClaimResponse> claims(@RequestParam(required = false) List<WarrantyClaimStatus> status,
                                                      Pageable pageable) {
        return service.claims(status, pageable);
    }

    @Operation(summary = "Chấp nhận yêu cầu → tạo phiếu sửa chữa bảo hành")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/warranty-claims/{id}/accept")
    public WarrantyClaimResponse accept(@PathVariable Long id, @Valid @RequestBody AcceptClaimRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser user) {
        return service.accept(id, request, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/warranty-claims/{id}/reject")
    public WarrantyClaimResponse reject(@PathVariable Long id, @Valid @RequestBody ReasonRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser user) {
        return service.reject(id, request.reason(), user);
    }
}
