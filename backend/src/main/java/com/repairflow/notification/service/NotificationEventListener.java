package com.repairflow.notification.service;

import com.repairflow.config.CacheConfig;
import com.repairflow.notification.event.DomainEvents.LowStock;
import com.repairflow.notification.event.DomainEvents.RepairAssigned;
import com.repairflow.notification.event.DomainEvents.RepairRequestCreated;
import com.repairflow.notification.event.DomainEvents.RepairStatusChanged;
import com.repairflow.notification.event.DomainEvents.WarrantyClaimCreated;
import com.repairflow.notification.service.NotificationComposer.Message;
import com.repairflow.notification.service.NotificationService.Delivered;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Nhận sự kiện nghiệp vụ SAU KHI transaction commit (TD-15):
 * <ol>
 *   <li>Xóa cache dashboard (số liệu vừa thay đổi) – Redis cache invalidation chủ động.</li>
 *   <li>Soạn thông báo (ai nhận gì) → lưu DB trong transaction mới.</li>
 *   <li>Đẩy realtime qua STOMP tới /user/{id}/queue/notifications.</li>
 * </ol>
 * Lỗi ở đây chỉ ghi log: nghiệp vụ đã commit thành công thì không được báo lỗi cho người dùng vì thông báo.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    public static final String USER_QUEUE = "/queue/notifications";

    private final NotificationComposer composer;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messaging;
    private final CacheManager cacheManager;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(RepairStatusChanged event) {
        handle(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(RepairAssigned event) {
        handle(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(RepairRequestCreated event) {
        handle(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(LowStock event) {
        handle(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(WarrantyClaimCreated event) {
        handle(event);
    }

    private void handle(Object event) {
        evictDashboards();
        try {
            for (Message m : composer.compose(event)) {
                List<Delivered> delivered = notificationService.createFor(m.recipients(), m.type(), m.title(), m.body(),
                        m.referenceType(), m.referenceId());
                delivered.forEach(this::push);
            }
        } catch (RuntimeException e) {
            log.error("Không tạo được thông báo cho sự kiện {}", event, e);
        }
    }

    private void push(Delivered d) {
        try {
            messaging.convertAndSendToUser(String.valueOf(d.userId()), USER_QUEUE, d.notification());
        } catch (RuntimeException e) {
            log.warn("Không đẩy được thông báo realtime tới user {}: {}", d.userId(), e.getMessage());
        }
    }

    private void evictDashboards() {
        try {
            Cache cache = cacheManager.getCache(CacheConfig.ADMIN_DASHBOARD);
            if (cache != null) {
                cache.clear();
            }
        } catch (RuntimeException e) {
            log.warn("Không xóa được cache dashboard: {}", e.getMessage());
        }
    }
}
