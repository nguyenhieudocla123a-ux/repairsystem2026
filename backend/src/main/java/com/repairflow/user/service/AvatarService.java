package com.repairflow.user.service;

import com.repairflow.auth.service.AuthService;
import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.dto.UserResponse;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.entity.UserAvatar;
import com.repairflow.user.repository.UserAvatarRepository;
import com.repairflow.user.repository.UserRepository;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ảnh đại diện: tải lên / xóa ảnh của chính mình, xem ảnh người khác theo quyền.
 *
 * - Tối đa 2 MB (frontend đã thu về 512×512 trước khi gửi nên ảnh thật thường chỉ vài chục KB).
 * - Loại ảnh xác định bằng CHỮ KÝ FILE (magic bytes), không tin Content-Type do trình duyệt gửi:
 *   chặn việc đổi đuôi một file HTML/SVG thành ".png" rồi để trình duyệt hiển thị (XSS qua ảnh).
 * - Khách hàng chỉ xem được ảnh của chính mình; nhân viên xem được ảnh mọi người (TD-18: ngoài phạm vi → 404).
 */
@Service
@RequiredArgsConstructor
public class AvatarService {

    public static final long MAX_BYTES = 2L * 1024 * 1024;

    private final UserRepository userRepository;
    private final UserAvatarRepository avatarRepository;
    private final AuthService authService;
    private final Clock clock;

    @Transactional
    public UserResponse upload(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng chọn ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Ảnh tối đa 2 MB");
        }
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Không đọc được file ảnh");
        }
        String contentType = detectImageType(data);
        if (contentType == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Chỉ nhận ảnh JPEG, PNG hoặc WebP");
        }

        User user = loadUser(userId);
        // Cắt về mili-giây: giá trị này đi vào URL (?v=) và được so sánh ở client
        Instant now = Instant.now(clock).truncatedTo(ChronoUnit.MILLIS);
        avatarRepository.findById(userId).ifPresentOrElse(
                avatar -> avatar.replace(contentType, data, now),
                () -> avatarRepository.save(new UserAvatar(userId, contentType, data, now)));
        user.setAvatarUpdatedAt(now);
        return authService.me(userId);
    }

    @Transactional
    public UserResponse delete(Long userId) {
        User user = loadUser(userId);
        avatarRepository.findById(userId).ifPresent(avatarRepository::delete);
        user.setAvatarUpdatedAt(null);
        return authService.me(userId);
    }

    @Transactional(readOnly = true)
    public UserAvatar get(Long ownerId, AuthenticatedUser viewer) {
        if (viewer.role() == Role.CUSTOMER && !Objects.equals(viewer.id(), ownerId)) {
            throw BusinessException.notFound("Ảnh đại diện", ownerId);
        }
        return avatarRepository.findById(ownerId).orElseThrow(() -> BusinessException.notFound("Ảnh đại diện", ownerId));
    }

    /** JPEG: FF D8 FF · PNG: 89 50 4E 47 0D 0A 1A 0A · WebP: "RIFF" ???? "WEBP". */
    public static String detectImageType(byte[] d) {
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G'
                && d[4] == 0x0D && d[5] == 0x0A && d[6] == 0x1A && d[7] == 0x0A) {
            return "image/png";
        }
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F'
                && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> BusinessException.notFound("Người dùng", userId));
    }
}
