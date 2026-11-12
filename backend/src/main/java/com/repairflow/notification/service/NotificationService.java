package com.repairflow.notification.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.web.PageResponse;
import com.repairflow.notification.entity.Notification;
import com.repairflow.notification.entity.NotificationType;
import com.repairflow.notification.repository.NotificationRepository;
import com.repairflow.user.entity.User;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Lưu & đọc thông báo của người dùng. Việc đẩy realtime do NotificationEventListener làm sau khi lưu xong. */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final EntityManager entityManager;
    private final Clock clock;

    public record NotificationResponse(Long id, NotificationType type, String title, String message,
                                       String referenceType, Long referenceId, boolean read, Instant createdAt) {

        public static NotificationResponse from(Notification n) {
            return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getReferenceType(),
                    n.getReferenceId(), n.isRead(), n.getCreatedAt());
        }
    }

    public record Delivered(Long userId, NotificationResponse notification) {
    }

    /**
     * Ghi thông báo cho nhiều người nhận trong một transaction RIÊNG (REQUIRES_NEW): được gọi từ listener
     * AFTER_COMMIT, lúc transaction nghiệp vụ đã kết thúc.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<Delivered> createFor(Collection<Long> userIds, NotificationType type, String title, String message,
                                     String referenceType, Long referenceId) {
        return userIds.stream().distinct().map(userId -> {
            Notification n = repository.save(new Notification(entityManager.getReference(User.class, userId), type,
                    title, message, referenceType, referenceId));
            repository.flush(); // lấy createdAt/id trước khi trả về để đẩy qua WebSocket
            return new Delivered(userId, NotificationResponse.from(n));
        }).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Long userId, boolean unreadOnly, Pageable pageable) {
        var page = unreadOnly
                ? repository.findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(userId, pageable)
                : repository.findByUserIdOrderByCreatedAtDescIdDesc(userId, pageable);
        return PageResponse.of(page, NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByUserIdAndReadAtIsNull(userId);
    }

    /** Chỉ đánh dấu được thông báo của chính mình (của người khác → 404). */
    @Transactional
    public NotificationResponse markRead(Long userId, Long id) {
        Notification n = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> BusinessException.notFound("Thông báo", id));
        if (n.getReadAt() == null) {
            n.setReadAt(clock.instant());
        }
        return NotificationResponse.from(n);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return repository.markAllRead(userId, clock.instant());
    }
}
