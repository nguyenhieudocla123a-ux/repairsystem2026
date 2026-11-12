package com.repairflow.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;

/** Thông tin thiết bị gắn với phiên đăng nhập (phục vụ kiểm tra bảo mật, hiển thị "thiết bị đang đăng nhập"). */
public record RequestMetadata(String userAgent, String ipAddress) {

    private static final int MAX_USER_AGENT = 255;

    public static RequestMetadata from(HttpServletRequest request) {
        String ua = request.getHeader(HttpHeaders.USER_AGENT);
        if (ua != null && ua.length() > MAX_USER_AGENT) {
            ua = ua.substring(0, MAX_USER_AGENT);
        }
        return new RequestMetadata(ua, request.getRemoteAddr());
    }

    public static RequestMetadata unknown() {
        return new RequestMetadata(null, null);
    }
}
