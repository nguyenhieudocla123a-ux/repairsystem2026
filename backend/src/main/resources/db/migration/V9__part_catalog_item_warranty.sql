-- Danh mục nhóm linh kiện + bảo hành theo từng linh kiện (TD-76, docs/parts-and-warranty-research.md)

-- ---------------------------------------------------------------- Nhóm linh kiện
-- device_types: danh sách loại thiết bị áp dụng, phân tách bằng dấu phẩy (PHONE,TABLET,...)
CREATE TABLE part_categories (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                     VARCHAR(30)  NOT NULL,
    name                     VARCHAR(100) NOT NULL,
    device_types             VARCHAR(100) NOT NULL,
    default_warranty_months  INTEGER      NOT NULL,
    warranty_scope           TEXT,
    exclusions               TEXT,
    sort_order               INTEGER      NOT NULL DEFAULT 0,
    active                   BOOLEAN      NOT NULL DEFAULT TRUE,
    version                  BIGINT       NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_part_categories_code UNIQUE (code),
    CONSTRAINT ck_part_categories_code CHECK (code ~ '^[A-Z0-9_]+$'),
    CONSTRAINT ck_part_categories_months CHECK (default_warranty_months BETWEEN 0 AND 120)
);

-- Danh mục tham chiếu (mức bảo hành phổ biến trên thị trường VN, cửa hàng tự chỉnh). 0 tháng = không bảo hành.
INSERT INTO part_categories (code, name, device_types, default_warranty_months, warranty_scope, exclusions, sort_order) VALUES
('SCREEN',       'Màn hình',                    'PHONE,TABLET,LAPTOP,SMARTWATCH', 6,  'Lỗi hiển thị, cảm ứng, sọc/điểm chết không do va đập', 'Vỡ kính, cấn, chảy mực, ngấm nước, sọc do va đập', 10),
('GLASS',        'Mặt kính (ép kính)',          'PHONE,TABLET,SMARTWATCH',        1,  'Bụi, bọt, hở keo mặt kính', 'Vỡ kính sau khi bàn giao, lỗi hiển thị/cảm ứng của màn gốc', 20),
('TOUCH',        'Cảm ứng',                     'PHONE,TABLET,SMARTWATCH',        6,  'Liệt, loạn cảm ứng', 'Vỡ kính, va đập, ngấm nước', 30),
('BATTERY',      'Pin',                         'PHONE,TABLET,LAPTOP,SMARTWATCH', 12, 'Pin chai nhanh bất thường, không nhận sạc, sập nguồn', 'Phồng/cháy nổ do tác động ngoài, rơi vỡ, vào nước, dùng sạc không phù hợp', 40),
('CHARGE_PORT',  'Chân sạc / cụm sạc',          'PHONE,TABLET,LAPTOP',            6,  'Không nhận sạc, chập chờn', 'Cong, gãy chân do cắm sai; dị vật, ẩm, oxy hoá', 50),
('CAMERA_REAR',  'Camera sau',                  'PHONE,TABLET',                   6,  'Không lấy nét, mờ, không mở được camera', 'Nứt kính camera, va đập, vào nước', 60),
('CAMERA_FRONT', 'Camera trước',                'PHONE,TABLET',                   6,  'Không mở được, mờ, lỗi màu', 'Va đập, vào nước', 70),
('CAMERA_GLASS', 'Kính camera',                 'PHONE,TABLET',                   1,  'Bụi, hở keo kính camera', 'Nứt vỡ do va đập', 80),
('SPEAKER',      'Loa',                         'PHONE,TABLET,LAPTOP,SMARTWATCH', 6,  'Rè, nhỏ, mất tiếng', 'Vào nước, dị vật', 90),
('EARPIECE',     'Loa trong (loa thoại)',       'PHONE',                          6,  'Rè, nhỏ, mất tiếng khi gọi', 'Vào nước, dị vật', 100),
('MICROPHONE',   'Mic',                         'PHONE,TABLET,SMARTWATCH',        6,  'Mất tiếng, rè khi đàm thoại/ghi âm', 'Vào nước, dị vật', 110),
('VIBRATOR',     'Rung (Taptic)',               'PHONE,SMARTWATCH',               6,  'Không rung, rung yếu', 'Va đập, vào nước', 120),
('BUTTON',       'Nút bấm (nguồn, âm lượng, núm xoay)', 'PHONE,TABLET,SMARTWATCH',  6,  'Liệt, kẹt nút', 'Gãy, móp do va đập', 130),
('BIOMETRIC',    'Face ID / Touch ID / vân tay', 'PHONE,TABLET,LAPTOP',           1,  'Không nhận diện sau khi sửa', 'Rơi vỡ, vào nước; linh kiện cụm camera trước bị thay ở nơi khác', 140),
('BACK_GLASS',   'Kính lưng',                   'PHONE,TABLET,SMARTWATCH',        1,  'Bong keo, lệch màu', 'Nứt vỡ do va đập', 150),
('HOUSING',      'Vỏ / khung',                  'PHONE,TABLET,LAPTOP,SMARTWATCH', 1,  'Lệch màu, hở khung', 'Móp, trầy, nứt do va đập', 160),
('SIM_TRAY',     'Khay SIM',                    'PHONE,TABLET',                   1,  'Không nhận khay', 'Gãy, cong', 170),
('ANTENNA',      'Ăng-ten / cáp sóng / NFC',     'PHONE,TABLET,SMARTWATCH',        6,  'Mất sóng, yếu sóng, mất NFC/sạc không dây', 'Va đập, vào nước', 180),
('FLEX',         'Cáp nối (flex)',              'PHONE,TABLET,LAPTOP',            6,  'Đứt, chập chờn', 'Gập, kéo mạnh, vào nước', 190),
('IC',           'IC (sạc, nguồn, âm thanh…)',  'PHONE,TABLET,LAPTOP',            3,  'Lỗi tái phát đúng IC đã thay', 'Vào nước, chập điện do sạc không phù hợp', 200),
('MAINBOARD',    'Mainboard',                   'PHONE,TABLET,LAPTOP,DESKTOP,SMARTWATCH', 3, 'Lỗi tái phát trên mainboard đã thay/sửa', 'Vào nước, chập điện, va đập, can thiệp bên ngoài', 210),
('SCREEN_CABLE', 'Cáp màn hình',                'LAPTOP',                         6,  'Chớp, sọc, mất hình do cáp', 'Gập bản lề quá mức, va đập', 220),
('HINGE',        'Bản lề',                      'LAPTOP',                         6,  'Lỏng, kẹt bản lề', 'Gãy do rơi, mở quá góc', 230),
('KEYBOARD',     'Bàn phím',                    'LAPTOP,DESKTOP',                 12, 'Liệt, kẹt, loạn phím', 'Đổ nước, cạy phím, va đập', 240),
('TOUCHPAD',     'Touchpad',                    'LAPTOP',                         6,  'Liệt, loạn, không click', 'Va đập, vào nước', 250),
('ADAPTER',      'Sạc (adapter)',               'LAPTOP,DESKTOP',                 12, 'Không ra điện, nóng bất thường', 'Đứt dây, cháy nổ do nguồn điện', 260),
('RAM',          'RAM',                         'LAPTOP,DESKTOP',                 36, 'Lỗi bộ nhớ, máy không nhận RAM', 'Cháy, biến dạng, mất tem', 270),
('STORAGE',      'Ổ cứng (SSD / HDD)',          'LAPTOP,DESKTOP',                 12, 'Lỗi ổ, không nhận ổ', 'Cháy, biến dạng, mất tem; không bảo hành dữ liệu', 280),
('FAN',          'Quạt tản nhiệt',              'LAPTOP,DESKTOP',                 6,  'Kêu to, không quay', 'Bụi bẩn, dị vật, côn trùng', 290),
('WIFI',         'Card Wi-Fi / Bluetooth',      'LAPTOP,DESKTOP',                 6,  'Không nhận, mất kết nối', 'Va đập, chập điện', 300),
('WEBCAM',       'Webcam',                      'LAPTOP',                         6,  'Không nhận, mờ', 'Va đập, vào nước', 310),
('PORT',         'Cổng kết nối (USB, HDMI, audio)', 'LAPTOP,DESKTOP',            6,  'Lỏng, không nhận thiết bị', 'Gãy chân do cắm sai, va đập', 320),
('CPU',          'CPU',                         'DESKTOP',                        36, 'CPU lỗi', 'Cong chân, cháy do ép xung/nguồn, mất tem', 330),
('VGA',          'Card đồ hoạ (VGA)',           'DESKTOP',                        36, 'Lỗi hiển thị, không nhận card', 'Cháy, đào coin, mất tem', 340),
('PSU',          'Nguồn (PSU)',                 'DESKTOP',                        36, 'Không lên nguồn, sập nguồn', 'Cháy nổ do điện lưới, côn trùng', 350),
('CASE',         'Vỏ case',                     'DESKTOP',                        6,  'Lỗi nút nguồn/cổng trên case', 'Móp, trầy', 360),
('SENSOR',       'Cảm biến (nhịp tim, tiệm cận…)', 'PHONE,SMARTWATCH',            6,  'Cảm biến không hoạt động', 'Va đập, vào nước', 370),
('OTHER',        'Linh kiện khác',              'PHONE,TABLET,LAPTOP,DESKTOP,SMARTWATCH,OTHER', 3, 'Lỗi của chính linh kiện đã thay', 'Theo điều kiện chung', 999);

-- ---------------------------------------------------------------- Linh kiện: nhóm, loại thiết bị, chất lượng, bảo hành riêng
ALTER TABLE parts
    ADD COLUMN category_id        BIGINT REFERENCES part_categories (id),
    ADD COLUMN device_type        VARCHAR(20),
    ADD COLUMN grade              VARCHAR(20),
    ADD COLUMN brand              VARCHAR(100),
    ADD COLUMN compatible_models  VARCHAR(500),
    ADD COLUMN warranty_months    INTEGER,
    ADD CONSTRAINT ck_parts_device_type CHECK (device_type IS NULL OR device_type IN ('PHONE','LAPTOP','TABLET','DESKTOP','SMARTWATCH','OTHER')),
    ADD CONSTRAINT ck_parts_grade CHECK (grade IS NULL OR grade IN ('OEM','ORIGINAL_USED','AFTERMARKET','GENERIC')),
    ADD CONSTRAINT ck_parts_warranty_months CHECK (warranty_months IS NULL OR warranty_months BETWEEN 0 AND 120);

-- Nhóm chữ tự do cũ → nhóm chuẩn (khớp theo tên, không khớp thì "Linh kiện khác")
UPDATE parts p SET category_id = COALESCE(
    (SELECT c.id FROM part_categories c WHERE lower(c.name) = lower(trim(p.category))),
    (SELECT c.id FROM part_categories c WHERE c.code = 'OTHER'))
WHERE p.category IS NOT NULL;
DROP INDEX IF EXISTS idx_parts_category;
ALTER TABLE parts DROP COLUMN category;
CREATE INDEX idx_parts_category ON parts (category_id);

-- ---------------------------------------------------------------- Báo giá: lưu cố định loại linh kiện + bảo hành khách đã duyệt
ALTER TABLE quotation_items
    ADD COLUMN part_grade       VARCHAR(20),
    ADD COLUMN warranty_months  INTEGER,
    ADD CONSTRAINT ck_quotation_items_warranty_months CHECK (warranty_months IS NULL OR warranty_months BETWEEN 0 AND 120);

-- ---------------------------------------------------------------- Bảo hành theo từng dòng
ALTER TABLE warranties DROP CONSTRAINT ck_warranties_months;
ALTER TABLE warranties ADD CONSTRAINT ck_warranties_months CHECK (months BETWEEN 1 AND 120);

CREATE TABLE warranty_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    warranty_id  BIGINT       NOT NULL REFERENCES warranties (id) ON DELETE CASCADE,
    part_id      BIGINT       REFERENCES parts (id),
    category_id  BIGINT       REFERENCES part_categories (id),
    description  VARCHAR(255) NOT NULL,
    part_grade   VARCHAR(20),
    quantity     INTEGER      NOT NULL DEFAULT 1,
    months       INTEGER      NOT NULL,
    end_date     DATE         NOT NULL,
    exclusions   TEXT,
    CONSTRAINT ck_warranty_items_months CHECK (months BETWEEN 1 AND 120),
    CONSTRAINT ck_warranty_items_quantity CHECK (quantity > 0)
);
CREATE INDEX idx_warranty_items_warranty ON warranty_items (warranty_id);

-- Bảo hành cấp trước V9 → một dòng "toàn bộ dịch vụ"
INSERT INTO warranty_items (warranty_id, description, months, end_date)
SELECT id, 'Toàn bộ dịch vụ sửa chữa', months, end_date FROM warranties;

-- Yêu cầu bảo hành gắn với dòng (linh kiện) bị lỗi
ALTER TABLE warranty_claims ADD COLUMN warranty_item_id BIGINT REFERENCES warranty_items (id);

-- ---------------------------------------------------------------- Ảnh linh kiện (cửa hàng tự tải ảnh thật của linh kiện trong kho)
-- Bảng riêng như ảnh đại diện (V7): đọc danh sách linh kiện không kéo theo bytea; image_updated_at làm "phiên bản" phá cache.
ALTER TABLE parts ADD COLUMN image_updated_at TIMESTAMPTZ;

CREATE TABLE part_images (
    part_id       BIGINT       PRIMARY KEY REFERENCES parts (id) ON DELETE CASCADE,
    content_type  VARCHAR(20)  NOT NULL,
    data          BYTEA        NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_part_images_type CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT ck_part_images_size CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
