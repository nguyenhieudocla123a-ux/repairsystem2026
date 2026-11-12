-- V4: Linh kiện, báo giá, giao dịch kho

CREATE TABLE parts (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku               VARCHAR(50)    NOT NULL,
    name              VARCHAR(200)   NOT NULL,
    category          VARCHAR(100),
    unit              VARCHAR(20)    NOT NULL DEFAULT 'cái',
    cost_price        NUMERIC(15, 2) NOT NULL DEFAULT 0,
    selling_price     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    quantity_on_hand  INTEGER        NOT NULL DEFAULT 0,
    min_stock_level   INTEGER        NOT NULL DEFAULT 0,
    active            BOOLEAN        NOT NULL DEFAULT TRUE,
    version           BIGINT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uk_parts_sku UNIQUE (sku),
    CONSTRAINT ck_parts_cost_price CHECK (cost_price >= 0),
    CONSTRAINT ck_parts_selling_price CHECK (selling_price >= 0),
    -- Chốt chặn cuối chống âm kho (lớp chính là khóa SELECT ... FOR UPDATE trong InventoryService)
    CONSTRAINT ck_parts_quantity_non_negative CHECK (quantity_on_hand >= 0),
    CONSTRAINT ck_parts_min_stock CHECK (min_stock_level >= 0)
);
CREATE INDEX idx_parts_name_trgm ON parts USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX idx_parts_category ON parts (category);
CREATE INDEX idx_parts_low_stock ON parts (id) WHERE active AND quantity_on_hand <= min_stock_level;

CREATE TABLE quotations (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repair_order_id         BIGINT         NOT NULL REFERENCES repair_orders (id),
    version_no              INTEGER        NOT NULL,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    labor_total             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    parts_total             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount                NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(15, 2) NOT NULL DEFAULT 0,
    note                    TEXT,
    valid_until             DATE,
    customer_response_note  TEXT,
    created_by              BIGINT         NOT NULL REFERENCES users (id),
    responded_by            BIGINT REFERENCES users (id),
    sent_at                 TIMESTAMPTZ,
    responded_at            TIMESTAMPTZ,
    version                 BIGINT         NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uk_quotations_order_version UNIQUE (repair_order_id, version_no),
    CONSTRAINT ck_quotations_status CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    CONSTRAINT ck_quotations_amounts CHECK (labor_total >= 0 AND parts_total >= 0 AND discount >= 0 AND total_amount >= 0),
    CONSTRAINT ck_quotations_discount CHECK (discount <= labor_total + parts_total)
);
-- Tối đa một báo giá đang chờ khách xác nhận trên mỗi phiếu.
CREATE UNIQUE INDEX uk_quotations_one_sent_per_order ON quotations (repair_order_id) WHERE status = 'SENT';
CREATE INDEX idx_quotations_status ON quotations (status, created_at DESC);

CREATE TABLE quotation_items (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quotation_id  BIGINT         NOT NULL REFERENCES quotations (id) ON DELETE CASCADE,
    item_type     VARCHAR(10)    NOT NULL,
    part_id       BIGINT REFERENCES parts (id),
    description   VARCHAR(255)   NOT NULL,
    quantity      INTEGER        NOT NULL,
    unit_price    NUMERIC(15, 2) NOT NULL,
    line_total    NUMERIC(15, 2) NOT NULL,
    CONSTRAINT ck_quotation_items_type CHECK (item_type IN ('LABOR', 'PART')),
    CONSTRAINT ck_quotation_items_part CHECK (item_type <> 'PART' OR part_id IS NOT NULL),
    CONSTRAINT ck_quotation_items_quantity CHECK (quantity > 0),
    CONSTRAINT ck_quotation_items_price CHECK (unit_price >= 0 AND line_total >= 0)
);
CREATE INDEX idx_quotation_items_quotation ON quotation_items (quotation_id);

-- Giao dịch kho là bất biến (không có updated_at). Mỗi thay đổi tồn = 1 dòng, kèm số dư sau giao dịch.
CREATE TABLE inventory_transactions (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    part_id          BIGINT         NOT NULL REFERENCES parts (id),
    type             VARCHAR(20)    NOT NULL,
    quantity         INTEGER        NOT NULL,      -- ADJUSTMENT: chênh lệch có dấu; loại khác: > 0
    balance_after    INTEGER        NOT NULL,
    unit_cost        NUMERIC(15, 2),
    repair_order_id  BIGINT REFERENCES repair_orders (id),
    supplier_name    VARCHAR(150),
    note             TEXT,
    created_by       BIGINT         NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_inventory_transactions_type CHECK (type IN ('IMPORT', 'EXPORT', 'RETURN', 'ADJUSTMENT')),
    CONSTRAINT ck_inventory_transactions_quantity CHECK (
        (type = 'ADJUSTMENT' AND quantity <> 0) OR (type <> 'ADJUSTMENT' AND quantity > 0)),
    CONSTRAINT ck_inventory_transactions_balance CHECK (balance_after >= 0),
    CONSTRAINT ck_inventory_transactions_order CHECK (type NOT IN ('EXPORT', 'RETURN') OR repair_order_id IS NOT NULL),
    CONSTRAINT ck_inventory_transactions_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
);
CREATE INDEX idx_inventory_transactions_part ON inventory_transactions (part_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_order ON inventory_transactions (repair_order_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions (type, created_at);
