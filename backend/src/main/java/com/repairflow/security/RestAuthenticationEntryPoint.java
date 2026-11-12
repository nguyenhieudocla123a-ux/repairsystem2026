package com.repairflow.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.common.web.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/** Trả 401 dạng JSON chuẩn khi request chưa xác thực (thay vì trang HTML/redirect mặc định). */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        ErrorCode code = ErrorCode.UNAUTHORIZED;
        ApiErrorResponse body = new ApiErrorResponse(Instant.now(), code.status().value(), code.name(),
                "Vui lòng đăng nhập", request.getRequestURI(), List.of());
        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
