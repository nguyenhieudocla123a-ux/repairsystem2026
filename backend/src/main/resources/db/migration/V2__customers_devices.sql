-- V2: Khách hàng và thiết bị

-- pg_trgm: cho phép index GIN phục vụ tìm kiếm ILIKE '%từ khóa%' nhanh.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SEQUENCE customer_code_seq START 1;

CREATE TABLE customers (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL,
    user_id     BIGINT REFERENCES users (id),          -- tài khoản cổng khách hàng (0..1)
    full_name   VARCHAR(150) NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    email       VARCHAR(255),
    address     VARCHAR(255),
    note        TEXT,
    created_by  BIGINT REFERENCES users (id),          -- NULL khi khách tự đăng ký
    version     BIGINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_customers_code UNIQUE (code),
    CONSTRAINT uk_customers_user UNIQUE (user_id),
    CONSTRAINT uk_customers_phone UNIQUE (phone),
    CONSTRAINT uk_customers_email UNIQUE (email),
    CONSTRAINT ck_customers_email_lowercase CHECK (email IS NULL OR email = lower(email))
);
CREATE INDEX idx_customers_full_name_trgm ON customers USING GIN (lower(full_name) gin_trgm_ops);
CREATE INDEX idx_customers_created ON customers (created_at DESC);

CREATE TABLE devices (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id    BIGINT       NOT NULL REFERENCES customers (id),
    name           VARCHAR(150) NOT NULL,
    device_type    VARCHAR(20)  NOT NULL,
    brand          VARCHAR(100),
    model          VARCHAR(100),
    serial_number  VARCHAR(100),
    color          VARCHAR(50),
    note           TEXT,
    version        BIGINT       NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_devices_type CHECK (device_type IN ('PHONE', 'LAPTOP', 'TABLET', 'DESKTOP', 'SMARTWATCH', 'OTHER'))
);
CREATE INDEX idx_devices_customer ON devices (customer_id);
-- Serial duy nhất không phân biệt hoa thường, chỉ áp dụng khi có giá trị.
CREATE UNIQUE INDEX uk_devices_serial ON devices (upper(serial_number)) WHERE serial_number IS NOT NULL;
