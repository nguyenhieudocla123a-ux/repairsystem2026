package com.repairflow.user.controller;

import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.dto.UserResponse;
import com.repairflow.user.entity.UserAvatar;
import com.repairflow.user.service.AvatarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Avatar", description = "Ảnh đại diện người dùng")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AvatarController {

    private final AvatarService avatarService;

    @Operation(summary = "Tải lên / thay ảnh đại diện của tôi (multipart, field `file`, JPEG/PNG/WebP ≤ 2 MB)")
    @PutMapping(path = "/auth/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse upload(@AuthenticationPrincipal AuthenticatedUser user, @RequestParam("file") MultipartFile file) {
        return avatarService.upload(user.id(), file);
    }

    @Operation(summary = "Xóa ảnh đại diện của tôi")
    @DeleteMapping("/auth/me/avatar")
    public UserResponse delete(@AuthenticationPrincipal AuthenticatedUser user) {
        return avatarService.delete(user.id());
    }

    @Operation(summary = "Xem ảnh đại diện (khách chỉ xem ảnh của mình). Cache riêng 7 ngày – client gắn ?v=avatarUpdatedAt")
    @GetMapping("/users/{id}/avatar")
    public ResponseEntity<byte[]> get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser user) {
        UserAvatar avatar = avatarService.get(id, user);
        String etag = "\"" + avatar.getUpdatedAt().toEpochMilli() + "\"";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .eTag(etag)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(avatar.getData());
    }
}
