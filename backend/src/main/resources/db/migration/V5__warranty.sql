-- V5: Bảo hành và yêu cầu bảo hành
-- "Còn hạn" được tính khi truy vấn: status = 'ACTIVE' AND end_date >= CURRENT_DATE (không cần job cập nhật EXPIRED).

CREATE SEQUENCE warranty_code_seq START 1;
CREATE SEQUENCE warranty_claim_code_seq START 1;

CREATE TABLE warranties (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL,
    repair_order_id  BIGINT       NOT NULL REFERENCES repair_orders (id),
    customer_id      BIGINT       NOT NULL REFERENCES customers (id),
    device_id        BIGINT       NOT NULL REFERENCES devices (id),
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    months           INTEGER      NOT NULL,
    terms            TEXT,
    status           VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    void_reason      TEXT,
    created_by       BIGINT       NOT NULL REFERENCES users (id),
    version          BIGINT       NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_warranties_code UNIQUE (code),
    CONSTRAINT uk_warranties_repair_order UNIQUE (repair_order_id),
    CONSTRAINT ck_warranties_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_warranties_months CHECK (months BETWEEN 1 AND 24),
    CONSTRAINT ck_warranties_status CHECK (status IN ('ACTIVE', 'VOID'))
);
CREATE INDEX idx_warranties_customer ON warranties (customer_id);
CREATE INDEX idx_warranties_device ON warranties (device_id);
CREATE INDEX idx_warranties_end_date ON warranties (end_date);

CREATE TABLE warranty_claims (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code               VARCHAR(20)  NOT NULL,
    warranty_id        BIGINT       NOT NULL REFERENCES warranties (id),
    issue_description  TEXT         NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED',
    resolution_note    TEXT,
    repair_order_id    BIGINT REFERENCES repair_orders (id),   -- phiếu sửa chữa bảo hành được tạo khi ACCEPTED
    created_by         BIGINT       NOT NULL REFERENCES users (id),
    handled_by         BIGINT REFERENCES users (id),
    resolved_at        TIMESTAMPTZ,
    version            BIGINT       NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_warranty_claims_code UNIQUE (code),
    CONSTRAINT uk_warranty_claims_repair_order UNIQUE (repair_order_id),
    CONSTRAINT ck_warranty_claims_status CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'RESOLVED')),
    CONSTRAINT ck_warranty_claims_accepted_order CHECK (status NOT IN ('ACCEPTED', 'RESOLVED') OR repair_order_id IS NOT NULL)
);
CREATE INDEX idx_warranty_claims_warranty ON warranty_claims (warranty_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims (status, created_at DESC);
