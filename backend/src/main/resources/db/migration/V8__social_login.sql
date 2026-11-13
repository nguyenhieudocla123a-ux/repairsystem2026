-- Đăng nhập bằng Google / Facebook (TD-74)
-- Tài khoản tạo qua mạng xã hội chưa có mật khẩu (có thể đặt sau bằng "Quên mật khẩu").
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Liên kết tài khoản RepairFlow ↔ danh tính ở nhà cung cấp (sub của Google, id của Facebook).
-- Đăng nhập lại tra theo (provider, provider_user_id) chứ không theo email: email ở nhà cung cấp có thể đổi.
CREATE TABLE user_identities (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider         VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_identities_provider CHECK (provider IN ('GOOGLE', 'FACEBOOK')),
    CONSTRAINT uk_user_identities_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT uk_user_identities_user_provider UNIQUE (user_id, provider)
);
