-- Ảnh đại diện người dùng.
-- Dữ liệu ảnh nằm ở bảng riêng để đọc danh sách người dùng không kéo theo bytea;
-- users.avatar_updated_at vừa cho biết có ảnh hay không, vừa làm "phiên bản" để frontend phá cache khi đổi ảnh.
ALTER TABLE users ADD COLUMN avatar_updated_at TIMESTAMPTZ;

CREATE TABLE user_avatars (
    user_id       BIGINT       PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    content_type  VARCHAR(20)  NOT NULL,
    data          BYTEA        NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_avatars_type CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    -- Chốt chặn cuối ở DB: tối đa 2 MB (service đã kiểm tra trước)
    CONSTRAINT ck_user_avatars_size CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
