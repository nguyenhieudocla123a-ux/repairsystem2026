package com.repairflow.notification.controller;

import com.repairflow.common.web.PageResponse;
import com.repairflow.notification.service.NotificationService;
import com.repairflow.notification.service.NotificationService.NotificationResponse;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Notifications", description = "Thông báo của người dùng hiện tại (realtime qua STOMP /user/queue/notifications)")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;

    @GetMapping
    public PageResponse<NotificationResponse> list(@AuthenticationPrincipal AuthenticatedUser user,
                                                   @RequestParam(defaultValue = "false") boolean unreadOnly,
                                                   Pageable pageable) {
        return service.list(user.id(), unreadOnly, pageable);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("count", service.unreadCount(user.id()));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return service.markRead(user.id(), id);
    }

    @Operation(summary = "Đánh dấu đã đọc tất cả")
    @PatchMapping("/read-all")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("updated", service.markAllRead(user.id()));
    }
}
