-- V6: Thông báo trong hệ thống (đồng thời được đẩy realtime qua WebSocket)

CREATE TABLE notifications (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type            VARCHAR(50)  NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    BIGINT,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_notifications_type CHECK (type IN (
        'REPAIR_STATUS_CHANGED', 'QUOTATION_SENT', 'QUOTATION_APPROVED', 'QUOTATION_REJECTED',
        'REPAIR_ASSIGNED', 'REPAIR_COMPLETED', 'LOW_STOCK', 'REPAIR_REQUEST_CREATED', 'WARRANTY_CLAIM_CREATED'))
);
CREATE INDEX idx_notifications_user ON notifications (user_id, read_at, created_at DESC);
