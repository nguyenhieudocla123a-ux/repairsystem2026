package com.repairflow.user.dto;

/** Lựa chọn KTV khi phân công, kèm số phiếu đang xử lý. */
public record TechnicianOption(Long id, String fullName, long activeTaskCount) {
}
