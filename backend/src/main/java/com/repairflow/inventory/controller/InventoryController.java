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
import com.repairflow.device.entity.DeviceType;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.CacheControl;
import java.time.Duration;
import com.repairflow.inventory.service.PartImageService;
import com.repairflow.inventory.entity.PartImage;
import com.repairflow.inventory.dto.InventoryDtos.LedgerSummary;

@Tag(name = "Inventory", description = "Linh kiện, nhập/xuất/hoàn kho, sổ kho")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InventoryController {

    private final PartService partService;
    private final InventoryService inventoryService;
    private final PartImageService partImageService;

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts")
    public PageResponse<PartResponse> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Long categoryId,
                                             @RequestParam(required = false) DeviceType deviceType,
                                             @RequestParam(required = false) Boolean lowStock,
                                             @RequestParam(required = false) Boolean active,
                                             @AuthenticationPrincipal AuthenticatedUser user, Pageable pageable) {
        return partService.search(q, categoryId, deviceType, lowStock, active, user, pageable);
    }

    @Operation(summary = "Danh sách gọn linh kiện đang kinh doanh (cho ô chọn)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts/options")
    public List<PartOption> options() {
        return partService.activeOptions();
    }

    @Operation(summary = "Tải ảnh linh kiện (multipart 'file', ≤ 2 MB, JPEG/PNG/WebP)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PutMapping(path = "/parts/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PartResponse uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return partImageService.upload(id, file);
    }

    @Operation(summary = "Xoá ảnh linh kiện (quay về ảnh mặc định của nhóm)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @DeleteMapping("/parts/{id}/image")
    public PartResponse deleteImage(@PathVariable Long id) {
        return partImageService.delete(id);
    }

    @Operation(summary = "Xem ảnh linh kiện – mọi người đã đăng nhập (khách xem trong báo giá). Cache 7 ngày, client gắn ?v=imageUpdatedAt")
    @GetMapping("/parts/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable Long id) {
        PartImage img = partImageService.get(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .eTag("\"" + img.getUpdatedAt().toEpochMilli() + "\"")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(img.getData());
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping("/parts/{id}")
    public PartResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        return partService.get(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @PostMapping("/parts")
    public ResponseEntity<PartResponse> create(@Valid @RequestBody PartRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partService.create(request, user));
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

    @Operation(summary = "Tổng hợp sổ kho: số lượng + giá trị nhập/xuất/hoàn/điều chỉnh và giá trị tồn")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/inventory/summary")
    public LedgerSummary summary(
            @RequestParam(required = false) Long partId,
            @RequestParam(required = false) InventoryTransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return inventoryService.summary(partId, type, from, to);
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
