package com.repairflow.inventory.controller;

import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.dto.InventoryDtos.PartCategoryRequest;
import com.repairflow.inventory.dto.InventoryDtos.PartCategoryResponse;
import com.repairflow.inventory.service.PartCategoryService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Part categories", description = "Nhóm linh kiện + bảo hành mặc định theo nhóm")
@RestController
@RequestMapping("/api/v1/part-categories")
@RequiredArgsConstructor
public class PartCategoryController {

    private final PartCategoryService service;

    @Operation(summary = "Danh mục nhóm linh kiện (kể cả nhóm đã ngừng – để hiển thị linh kiện cũ); "
            + "deviceType: số linh kiện / tồn chỉ tính linh kiện của loại thiết bị đó và linh kiện dùng chung")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @GetMapping
    public List<PartCategoryResponse> list(@RequestParam(required = false) DeviceType deviceType) {
        return service.list(deviceType);
    }

    @Operation(summary = "Thêm nhóm linh kiện")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<PartCategoryResponse> create(@Valid @RequestBody PartCategoryRequest request,
                                                       @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(user.id(), request));
    }

    @Operation(summary = "Sửa nhóm: tên, loại thiết bị, bảo hành mặc định, phạm vi, điều kiện từ chối")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public PartCategoryResponse update(@PathVariable Long id, @Valid @RequestBody PartCategoryRequest request,
                                       @AuthenticationPrincipal AuthenticatedUser user) {
        return service.update(user.id(), id, request);
    }
}
