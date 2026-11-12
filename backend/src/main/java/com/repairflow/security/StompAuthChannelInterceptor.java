package com.repairflow.security;

import io.jsonwebtoken.JwtException;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Xác thực WebSocket ở frame STOMP CONNECT (TD-16): trình duyệt không gửi được header Authorization khi bắt tay
 * WebSocket, nên token được gửi trong header của frame CONNECT. Principal.getName() = userId → server gửi riêng cho
 * từng người qua /user/{userId}/queue/notifications; mỗi người chỉ nhận được hàng đợi của chính mình.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new MessageDeliveryException("Thiếu access token");
            }
            try {
                JwtService.ParsedToken parsed = jwtService.parse(header.substring(7));
                if (blacklistService.isBlacklisted(parsed.jti())) {
                    throw new MessageDeliveryException("Phiên đăng nhập đã kết thúc");
                }
                String userId = String.valueOf(parsed.user().id());
                accessor.setUser((Principal) () -> userId);
            } catch (JwtException | IllegalArgumentException e) {
                throw new MessageDeliveryException("Access token không hợp lệ hoặc đã hết hạn");
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
            if (accessor.getUser() == null) {
                throw new MessageDeliveryException("Chưa xác thực");
            }
            // Chỉ cho phép đăng ký hàng đợi riêng của mình (không nghe trộm /queue/... của người khác)
            String destination = accessor.getDestination();
            if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                    && (destination == null || !destination.startsWith("/user/"))) {
                throw new MessageDeliveryException("Không được đăng ký kênh " + destination);
            }
        }
        return message;
    }
}
