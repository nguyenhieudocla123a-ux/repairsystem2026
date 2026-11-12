package com.repairflow.common.audit;

import com.repairflow.user.entity.User;
import jakarta.persistence.EntityManager;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Ghi nhật ký thao tác quản trị trong cùng transaction với thao tác (rollback thì nhật ký cũng rollback). */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;
    private final EntityManager entityManager;

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Long actorId, String action, String entityType, Long entityId, Map<String, Object> details) {
        User actor = actorId == null ? null : entityManager.getReference(User.class, actorId);
        repository.save(new AuditLog(actor, action, entityType, entityId, details));
    }
}
