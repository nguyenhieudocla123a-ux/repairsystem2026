package com.repairflow.notification.event;

import com.repairflow.repair.entity.RepairStatus;

/**
 * Sự kiện nghiệp vụ phát ra từ các service (ApplicationEventPublisher). Module thông báo lắng nghe SAU KHI
 * transaction commit (TD-15) → nghiệp vụ không phụ thuộc vào thông báo, và không báo thay đổi đã bị rollback.
 * Chỉ mang id (không mang entity) để listener tự đọc dữ liệu đã commit trong transaction mới của nó.
 */
public final class DomainEvents {

    private DomainEvents() {
    }

    /** Phát từ điểm duy nhất RepairOrderService.changeStatus – phủ mọi lần đổi trạng thái phiếu. */
    public record RepairStatusChanged(Long repairOrderId, RepairStatus from, RepairStatus to, Long actorId) {
    }

    public record RepairAssigned(Long repairOrderId, Long technicianId, Long actorId) {
    }

    public record RepairRequestCreated(Long repairRequestId, Long actorId) {
    }

    public record LowStock(Long partId, Long actorId) {
    }

    public record WarrantyClaimCreated(Long warrantyClaimId, Long actorId) {
    }
}
