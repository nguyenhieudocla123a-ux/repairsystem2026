package com.repairflow.notification.entity;

/** Loại thông báo. */
public enum NotificationType {
    REPAIR_STATUS_CHANGED,
    QUOTATION_SENT,
    QUOTATION_APPROVED,
    QUOTATION_REJECTED,
    REPAIR_ASSIGNED,
    REPAIR_COMPLETED,
    LOW_STOCK,
    REPAIR_REQUEST_CREATED,
    WARRANTY_CLAIM_CREATED
}
