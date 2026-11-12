package com.repairflow.repair.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.customer.service.CurrentCustomerResolver;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.repository.RepairOrderRepository;
import com.repairflow.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Phân quyền theo tài nguyên (resource-based) cho phiếu sửa chữa:
 * ADMIN/STAFF xem mọi phiếu; TECHNICIAN chỉ phiếu được giao; CUSTOMER chỉ phiếu của mình.
 * Ngoài phạm vi → 404 (không để lộ phiếu tồn tại – TD-18).
 */
@Component
@RequiredArgsConstructor
public class RepairAccessGuard {

    private final RepairOrderRepository repository;

    public RepairOrder loadVisible(Long id, AuthenticatedUser user) {
        RepairOrder order = repository.findWithDetailsById(id)
                .orElseThrow(() -> BusinessException.notFound("Phiếu sửa chữa", id));
        if (!canView(order, user)) {
            throw BusinessException.notFound("Phiếu sửa chữa", id);
        }
        return order;
    }

    public boolean canView(RepairOrder order, AuthenticatedUser user) {
        return switch (user.role()) {
            case ADMIN, STAFF -> true;
            case TECHNICIAN -> order.getTechnician() != null && order.getTechnician().getId().equals(user.id());
            case CUSTOMER -> CurrentCustomerResolver.owns(user, order.getCustomer());
        };
    }
}
