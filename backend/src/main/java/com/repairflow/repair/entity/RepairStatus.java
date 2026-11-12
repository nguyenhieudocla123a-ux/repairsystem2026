package com.repairflow.repair.entity;

/** Trạng thái phiếu sửa chữa. Luật chuyển đổi: RepairStatusPolicy. */
public enum RepairStatus {
    RECEIVED,
    INSPECTING,
    WAITING_CONFIRMATION,
    APPROVED,
    REJECTED,
    WAITING_FOR_PARTS,
    REPAIRING,
    COMPLETED,
    DELIVERED,
    CANCELLED
}
