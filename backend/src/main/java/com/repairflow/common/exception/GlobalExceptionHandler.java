package com.repairflow.common.exception;

import com.repairflow.common.web.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusiness(BusinessException ex, HttpServletRequest req) {
        return build(ex.getErrorCode(), ex.getMessage(), req, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                             HttpServletRequest req) {
        List<ApiErrorResponse.FieldError> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ApiErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();
        return build(ErrorCode.VALIDATION_FAILED, "Dữ liệu không hợp lệ", req, fields);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(ConstraintViolationException ex,
                                                             HttpServletRequest req) {
        List<ApiErrorResponse.FieldError> fields = ex.getConstraintViolations().stream()
                .map(v -> new ApiErrorResponse.FieldError(v.getPropertyPath().toString(), v.getMessage()))
                .toList();
        return build(ErrorCode.VALIDATION_FAILED, "Dữ liệu không hợp lệ", req, fields);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.BAD_REQUEST, "Yêu cầu không đúng định dạng", req, List.of());
    }

    /** File tải lên vượt giới hạn multipart (spring.servlet.multipart.max-file-size). */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleTooLarge(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.VALIDATION_FAILED, "Ảnh tối đa 2 MB", req, List.of());
    }

    /** Thiếu phần file / không phải multipart. */
    @ExceptionHandler({org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.multipart.MultipartException.class,
            org.springframework.web.HttpMediaTypeNotSupportedException.class})
    public ResponseEntity<ApiErrorResponse> handleMissingPart(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.BAD_REQUEST, "Yêu cầu không đúng định dạng", req, List.of());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex,
                                                                 HttpServletRequest req) {
        return build(ErrorCode.CONCURRENT_MODIFICATION,
                "Dữ liệu đã được người khác cập nhật, vui lòng tải lại và thử lại", req, List.of());
    }

    /** Chốt chặn cuối: vi phạm UNIQUE/CHECK/FK ở DB mà service chưa kiểm tra trước. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleIntegrity(DataIntegrityViolationException ex,
                                                            HttpServletRequest req) {
        log.warn("Data integrity violation at {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build(ErrorCode.CONFLICT, "Dữ liệu vi phạm ràng buộc hệ thống", req, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return build(ErrorCode.ACCESS_DENIED, "Bạn không có quyền thực hiện thao tác này", req, List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex, HttpServletRequest req) {
        return build(ErrorCode.NOT_FOUND, "Không tìm thấy đường dẫn", req, List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest req) {
        log.error("Unexpected error at {}", req.getRequestURI(), ex);
        return build(ErrorCode.INTERNAL_ERROR, "Đã có lỗi xảy ra, vui lòng thử lại sau", req, List.of());
    }

    private ResponseEntity<ApiErrorResponse> build(ErrorCode code, String message, HttpServletRequest req,
                                                   List<ApiErrorResponse.FieldError> fields) {
        ApiErrorResponse body = new ApiErrorResponse(Instant.now(), code.status().value(), code.name(),
                message, req.getRequestURI(), fields);
        return ResponseEntity.status(code.status()).body(body);
    }
}
