package com.repairflow.inventory.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.inventory.dto.InventoryDtos.ActiveRequest;
import com.repairflow.inventory.dto.InventoryDtos.AdjustRequest;
import com.repairflow.inventory.dto.InventoryDtos.ImportRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartMovementRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartOption;
import com.repairflow.inventory.dto.InventoryDtos.PartRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartResponse;
import com.repairflow.inventory.dto.InventoryDtos.PartUsageResponse;
import com.repairflow.inventory.dto.InventoryDtos.TransactionResponse;
import com.repairflow.inventory.entity.InventoryTransactionType;
import com.repairflow.inventory.service.InventoryService;
import com.repairflow.inventory.service.PartService;
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

@Tag(name = "Inventory", description = "Linh kiện, nhập/xuất/hoàn kho, sổ kho")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InventoryController {

    private final PartService partService;
    private final InventoryService inventoryService;

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts")
    public PageResponse<PartResponse> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) String category,
                                             @RequestParam(required = false) Boolean lowStock,
                                             @RequestParam(required = false) Boolean active,
                                             @AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return partService.search(q, category, lowStock, active, user, pageable);
    }

    @Operation(summary = "Danh sách gọn linh kiện đang kinh doanh (cho ô chọn)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts/options")
    public List<PartOption> options() {
        return partService.activeOptions();
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts/categories")
    public List<String> categories() {
        return partService.categories();
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts/{id}")
    public PartResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return partService.get(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/parts")
    public ResponseEntity<PartResponse> create(@Valid @RequestBody PartRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partService.create(request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PutMapping("/parts/{id}")
    public PartResponse update(@PathVariable Long id, @Valid @RequestBody PartRequest request) {
        return partService.update(id, request);
    }

    @Operation(summary = "Ngừng / mở lại kinh doanh linh kiện")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/parts/{id}/active")
    public PartResponse setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest request,
                                  @AuthenticationPrincipal AuthenticatedUser user) {
        return partService.setActive(user.id(), id, request.active());
    }

    @Operation(summary = "Nhập kho")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/parts/{id}/import")
    public PartResponse importStock(@PathVariable Long id, @Valid @RequestBody ImportRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser user) {
        return inventoryService.importStock(id, request, user);
    }

    @Operation(summary = "Điều chỉnh kiểm kê (ADMIN)")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/parts/{id}/adjust")
    public PartResponse adjust(@PathVariable Long id, @Valid @RequestBody AdjustRequest request,
                               @AuthenticationPrincipal AuthenticatedUser user) {
        return inventoryService.adjust(id, request, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/inventory/transactions")
    public PageResponse<TransactionResponse> transactions(
            @RequestParam(required = false) Long partId,
            @RequestParam(required = false) InventoryTransactionType type,
            @RequestParam(required = false) Long repairOrderId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return inventoryService.transactions(partId, type, repairOrderId, from, to, user, pageable);
    }

    @Operation(summary = "Linh kiện đang dùng cho phiếu (Σ xuất − Σ hoàn)")
    @GetMapping("/repair-orders/{id}/parts")
    public List<PartUsageResponse> usage(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return inventoryService.usageVisible(id, user);
    }

    @Operation(summary = "Xuất linh kiện cho phiếu (KTV được giao / ADMIN) – 409 INSUFFICIENT_STOCK nếu thiếu")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @PostMapping("/repair-orders/{id}/parts")
    public List<PartUsageResponse> export(@PathVariable Long id, @Valid @RequestBody PartMovementRequest request,
                                          @AuthenticationPrincipal AuthenticatedUser user) {
        return inventoryService.exportForRepair(id, request, user);
    }

    @Operation(summary = "Hoàn linh kiện chưa dùng về kho")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @PostMapping("/repair-orders/{id}/parts/return")
    public List<PartUsageResponse> returnParts(@PathVariable Long id, @Valid @RequestBody PartMovementRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return inventoryService.returnFromRepair(id, request, user);
    }
}
