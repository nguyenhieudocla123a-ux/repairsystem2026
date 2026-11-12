-- V3: Yêu cầu sửa chữa online, phiếu sửa chữa, lịch sử trạng thái
-- Lưu ý: luật chuyển trạng thái nằm ở RepairStatusPolicy (Java), DB chỉ ràng buộc giá trị hợp lệ.

CREATE SEQUENCE repair_request_code_seq START 1;
CREATE SEQUENCE repair_order_code_seq START 1;

CREATE TABLE repair_requests (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                    VARCHAR(20)  NOT NULL,
    customer_id             BIGINT       NOT NULL REFERENCES customers (id),
    device_id               BIGINT       NOT NULL REFERENCES devices (id),
    issue_description       TEXT         NOT NULL,
    expected_drop_off_date  DATE,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    reject_reason           TEXT,
    handled_by              BIGINT REFERENCES users (id),
    version                 BIGINT       NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_repair_requests_code UNIQUE (code),
    CONSTRAINT ck_repair_requests_status CHECK (status IN ('PENDING', 'CONVERTED', 'REJECTED', 'CANCELLED'))
);
CREATE INDEX idx_repair_requests_status ON repair_requests (status, created_at DESC);
CREATE INDEX idx_repair_requests_customer ON repair_requests (customer_id);

CREATE TABLE repair_orders (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                  VARCHAR(20)   NOT NULL,
    repair_request_id     BIGINT REFERENCES repair_requests (id),
    customer_id           BIGINT        NOT NULL REFERENCES customers (id),
    device_id             BIGINT        NOT NULL REFERENCES devices (id),
    technician_id         BIGINT REFERENCES users (id),
    created_by            BIGINT        NOT NULL REFERENCES users (id),
    status                VARCHAR(30)   NOT NULL DEFAULT 'RECEIVED',
    priority              VARCHAR(10)   NOT NULL DEFAULT 'NORMAL',
    reported_issue        TEXT          NOT NULL,
    device_condition      TEXT,
    accessories           VARCHAR(255),
    diagnosis             TEXT,
    solution              TEXT,
    is_warranty_repair    BOOLEAN       NOT NULL DEFAULT FALSE,
    expected_return_date  DATE,
    final_amount          NUMERIC(15, 2),
    payment_method        VARCHAR(20),
    cancel_reason         TEXT,
    received_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ,
    delivered_at          TIMESTAMPTZ,
    version               BIGINT        NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uk_repair_orders_code UNIQUE (code),
    CONSTRAINT uk_repair_orders_request UNIQUE (repair_request_id),
    CONSTRAINT ck_repair_orders_status CHECK (status IN (
        'RECEIVED', 'INSPECTING', 'WAITING_CONFIRMATION', 'APPROVED', 'REJECTED',
        'WAITING_FOR_PARTS', 'REPAIRING', 'COMPLETED', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_repair_orders_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT ck_repair_orders_payment_method CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'BANK_TRANSFER', 'CARD')),
    CONSTRAINT ck_repair_orders_final_amount CHECK (final_amount IS NULL OR final_amount >= 0),
    -- Đã bàn giao thì phải có thời điểm bàn giao (báo cáo doanh thu dựa vào cột này)
    CONSTRAINT ck_repair_orders_delivered CHECK (status <> 'DELIVERED' OR delivered_at IS NOT NULL)
);
CREATE INDEX idx_repair_orders_status ON repair_orders (status);
CREATE INDEX idx_repair_orders_technician_status ON repair_orders (technician_id, status);
CREATE INDEX idx_repair_orders_customer ON repair_orders (customer_id);
CREATE INDEX idx_repair_orders_device ON repair_orders (device_id);
CREATE INDEX idx_repair_orders_delivered ON repair_orders (delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_repair_orders_created ON repair_orders (created_at DESC);

CREATE TABLE repair_status_histories (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repair_order_id  BIGINT       NOT NULL REFERENCES repair_orders (id),
    from_status      VARCHAR(30),                     -- NULL ở bản ghi tạo phiếu
    to_status        VARCHAR(30)  NOT NULL,
    changed_by       BIGINT       NOT NULL REFERENCES users (id),
    note             TEXT,
    changed_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_repair_status_histories_order ON repair_status_histories (repair_order_id, changed_at);
