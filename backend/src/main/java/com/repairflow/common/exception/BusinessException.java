package com.repairflow.common.exception;

import lombok.Getter;

/**
 * Lỗi nghiệp vụ có chủ đích (không phải bug). Được {@link GlobalExceptionHandler} chuyển thành JSON lỗi chuẩn.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public static BusinessException notFound(String resource, Object id) {
        return new BusinessException(ErrorCode.NOT_FOUND, resource + " không tồn tại: " + id);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(ErrorCode.CONFLICT, message);
    }
}
