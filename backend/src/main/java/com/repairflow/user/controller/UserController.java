package com.repairflow.user.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.dto.TechnicianOption;
import com.repairflow.user.dto.UserAdminDtos.AdminResetPasswordRequest;
import com.repairflow.user.dto.UserAdminDtos.CreateUserRequest;
import com.repairflow.user.dto.UserAdminDtos.UpdateUserRequest;
import com.repairflow.user.dto.UserAdminDtos.UpdateUserStatusRequest;
import com.repairflow.user.dto.UserResponse;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.UserStatus;
import com.repairflow.user.service.UserService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Users", description = "Quản trị tài khoản (ADMIN)")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Danh sách tài khoản – lọc theo role (nhiều giá trị: role=STAFF,TECHNICIAN), status, q")
    @GetMapping
    public PageResponse<UserResponse> search(@RequestParam(required = false) List<Role> role,
                                             @RequestParam(required = false) UserStatus status,
                                             @RequestParam(required = false) String q,
                                             Pageable pageable) {
        return userService.search(role, status, q, pageable);
    }

    @Operation(summary = "KTV đang hoạt động + số việc đang xử lý (dùng khi phân công)")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/technicians")
    public List<TechnicianOption> technicians() {
        return userService.activeTechnicians();
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @Operation(summary = "Tạo tài khoản nội bộ (ADMIN/STAFF/TECHNICIAN)")
    @PostMapping
    public ResponseEntity<UserResponse> create(@AuthenticationPrincipal AuthenticatedUser actor,
                                               @Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(actor.id(), request));
    }

    @PutMapping("/{id}")
    public UserResponse update(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id,
                               @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(actor.id(), id, request);
    }

    @Operation(summary = "Khóa / mở khóa tài khoản (khóa → đăng xuất mọi thiết bị)")
    @PatchMapping("/{id}/status")
    public UserResponse updateStatus(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id,
                                     @Valid @RequestBody UpdateUserStatusRequest request) {
        return userService.updateStatus(actor.id(), id, request.status());
    }

    @Operation(summary = "Đặt lại mật khẩu cho người dùng")
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id,
                                              @Valid @RequestBody AdminResetPasswordRequest request) {
        userService.resetPassword(actor.id(), id, request.newPassword());
        return ResponseEntity.noContent().build();
    }
}
