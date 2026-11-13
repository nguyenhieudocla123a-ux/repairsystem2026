package com.repairflow.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Ảnh thật của linh kiện (1-1 với parts). Tách bảng để đọc danh sách linh kiện không tải bytea. */
@Entity
@Table(name = "part_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PartImage {

    @Id
    @Column(name = "part_id")
    private Long partId;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(nullable = false)
    private byte[] data;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PartImage(Long partId, String contentType, byte[] data, Instant updatedAt) {
        this.partId = partId;
        replace(contentType, data, updatedAt);
    }

    public void replace(String contentType, byte[] data, Instant updatedAt) {
        this.contentType = contentType;
        this.data = data;
        this.updatedAt = updatedAt;
    }
}
