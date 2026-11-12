package com.repairflow.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Ảnh đại diện (1-1 với users, khóa chính = user_id). Tách bảng để không tải bytea khi đọc User. */
@Entity
@Table(name = "user_avatars")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAvatar {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(nullable = false)
    private byte[] data;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UserAvatar(Long userId, String contentType, byte[] data, Instant updatedAt) {
        this.userId = userId;
        replace(contentType, data, updatedAt);
    }

    public void replace(String contentType, byte[] data, Instant updatedAt) {
        this.contentType = contentType;
        this.data = data;
        this.updatedAt = updatedAt;
    }
}
