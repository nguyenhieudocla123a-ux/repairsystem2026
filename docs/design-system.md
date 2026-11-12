# RepairFlow Design System

> v1.0 · Mốc 3 · Hiện thực tại `frontend/src/theme` và `frontend/src/components`
> Xem trực quan (chỉ môi trường dev): `http://localhost:5173/dev/ui-kit`

## 1. Nguyên tắc

1. **Dữ liệu là nhân vật chính** – nền trung tính, màu chỉ dùng để truyền đạt *ý nghĩa* (trạng thái, cảnh báo, hành động chính).
2. **Một nguồn token** – `src/theme/tokens.ts` → AntD `ConfigProvider` → AntD xuất CSS variables (`--ant-*`) → Tailwind `@theme` đọc lại các biến đó. Không viết mã màu hex trong component.
3. **AntD cho hành vi, Tailwind cho bố cục** – component tương tác (Table, Form, Modal, Select…) dùng AntD; khoảng cách, lưới, responsive dùng Tailwind utility. Không tự viết lại component AntD đã có.
4. **Mọi màn hình dữ liệu có đủ 4 trạng thái**: loading · empty · error · có dữ liệu.
5. **Tiếp cận được bằng bàn phím** – mọi hành động có focus ring, icon-only button luôn có `aria-label`.

## 2. Design tokens

### 2.1 Màu

> **Phiên bản 2 (2026-11-12):** đổi sang bảng màu *B2B Service* do skill **ui-ux-pro-max** đề xuất cho dịch vụ kỹ thuật – navy chuyên nghiệp + xanh dương cho hành động chính, hổ phách làm điểm nhấn. Màu primary mới đã chạy validator của skill `dataviz` (đạt ≥ 3:1 cho biểu đồ, 5,9:1 cho chữ).

| Token | Giá trị | Dùng cho |
|---|---|---|
| `brand.primary` | `#0369A1` | Nút chính, link, focus, chuỗi biểu đồ |
| `brand.primaryHover` | `#075985` | Hover nút chính |
| `brand.accent` | `#F59E0B` | Điểm nhấn trang trí (logo, minh họa) – **không** dùng cho chữ |
| `neutral.bg` | `#F5F7FA` | Nền trang |
| `neutral.surface` | `#FFFFFF` | Card, bảng, header |
| `neutral.border` | `#E2E8F0` | Viền card/bảng |
| `neutral.text` | `#0F172A` | Chữ chính (tương phản 17:1 trên trắng) |
| `neutral.textSecondary` | `#475569` | Chữ phụ (7.5:1 – đạt AA cho chữ nhỏ) |
| `neutral.textMuted` | `#64748B` | Placeholder, chú thích phụ (4,8:1 – đạt AA) |
| `sidebar.bg` | `#0B1220` | Sidebar (chuyển nhẹ sang `#0A1628`), mục đang chọn có vạch xanh `#38BDF8` bên trái |
| `sidebar.text` / `sidebar.textActive` | `#CBD5E1` / `#FFFFFF` | Menu sidebar |
| `semantic.success` | `#15803D` | Hoàn thành, còn bảo hành |
| `semantic.warning` | `#B45309` | Chờ xác nhận, tồn thấp |
| `semantic.error` | `#DC2626` | Lỗi, hủy, hết hạn |
| `semantic.info` | `#0E7490` | Thông tin |

Mỗi tông ngữ nghĩa (`tone`) có cặp **nền nhạt + chữ đậm** dùng cho icon StatCard/Badge: `primary` (#E0F2FE/#075985), `success` (#F0FDF4/#15803D), `warning` (#FFFBEB/#B45309), `error` (#FEF2F2/#B91C1C), `info` (#ECFEFF/#0E7490), `neutral` (#F1F5F9/#334155).

### 2.2 Typography

| Token | Size / Line-height / Weight | Dùng cho |
|---|---|---|
| `display` | 28 / 36 / 700, `tabular-nums` | Số KPI |
| `h1` | 20 / 28 / 600 | Tiêu đề trang |
| `h2` | 16 / 24 / 600 | Tiêu đề card/section |
| `body` | 14 / 22 / 400 | Nội dung (cỡ cơ sở AntD) |
| `caption` | 12 / 20 / 500 | Nhãn KPI, meta |

Font: **Inter Variable** (tự host qua `@fontsource-variable/inter`, không gọi Google Fonts), fallback `system-ui`. Số tiền/số liệu luôn `tabular-nums` để cột số thẳng hàng.

### 2.3 Spacing, bo góc, đổ bóng, chuyển động

| Nhóm | Giá trị |
|---|---|
| Spacing | Lưới 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48. Padding trang 24px (desktop) / 16px (mobile), khoảng cách giữa card 16px |
| Radius | `sm` 6px (tag, input nhỏ) · `md` 8px (button, input) · `lg` 12px (card, modal) |
| Shadow | `card`: `0 1px 2px rgb(15 23 42 / .06)` · `overlay`: `0 10px 30px rgb(15 23 42 / .12)` (dropdown, modal) |
| Motion | `fast` 120ms (hover) · `base` 200ms (mở/đóng sidebar, drawer) · easing `cubic-bezier(.2,0,0,1)`. Tôn trọng `prefers-reduced-motion` |
| Breakpoint | `md` 768px (sidebar từ drawer → cột), `xl` 1200px (sidebar mở rộng) |

## 3. Components

### 3.1 PageHeader
Tiêu đề trang + mô tả + vùng hành động bên phải. Breadcrumb do layout lo (không truyền vào đây).

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `title` | `ReactNode` | — | Bắt buộc, render `<h1>` |
| `description` | `ReactNode` | — | Dòng phụ màu `textSecondary` |
| `extra` | `ReactNode` | — | Nút hành động (thường 1 nút primary) |

Responsive: < 640px phần `extra` xuống dòng dưới tiêu đề. Mỗi trang **chỉ một** `<h1>`.

### 3.2 StatCard
Thẻ KPI trên dashboard.

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `label` | `string` | — | Nhãn (caption) |
| `value` | `ReactNode` | — | Giá trị lớn (display) |
| `icon` | `ReactNode` | — | Icon trong ô màu theo `tone` |
| `tone` | `'primary' \| 'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'` | `'primary'` | Màu ô icon |
| `hint` | `ReactNode` | — | Dòng phụ (VD "so với 30 ngày trước") |
| `loading` | `boolean` | `false` | Hiện skeleton thay cho giá trị |
| `onClick` | `() => void` | — | Có → thẻ thành `button` điều hướng tới danh sách đã lọc |

| State | Hiển thị | Hành vi |
|---|---|---|
| Default | Card trắng, viền `border` | — |
| Hover (khi click được) | Viền `primary` nhạt, shadow `card` | Con trỏ pointer |
| Focus | Focus ring 2px `primary` | Enter/Space kích hoạt |
| Loading | Skeleton thay số | `aria-busy="true"` |

A11y: khi click được render `<button>` (không phải `div onClick`); icon `aria-hidden`.

### 3.3 StatusTag / RepairStatusTag
`StatusTag` hiển thị một giá trị enum bằng `Tag` AntD với nhãn tiếng Việt và màu tra từ **bảng cấu hình** (`StatusConfig<T>`). `RepairStatusTag` là cấu hình cho trạng thái phiếu (bảng màu ở `docs/ui-ux-design.md §1.3`). Có chấm tròn trước nhãn để **không chỉ dựa vào màu** (hỗ trợ người mù màu – nhãn chữ luôn hiện).

| Prop | Type | Mô tả |
|---|---|---|
| `value` | `T` (enum) | Giá trị |
| `config` | `Record<T, { label: string; color: string }>` | Chỉ có ở `StatusTag` gốc |

Do: dùng chung cho mọi bảng/chi tiết. Don't: tự `switch(status)` tô màu trong từng trang.

### 3.4 EmptyState
| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `title` | `string` | `'Chưa có dữ liệu'` | |
| `description` | `ReactNode` | — | Giải thích + gợi ý |
| `action` | `ReactNode` | — | VD nút "+ Thêm khách hàng" |
| `compact` | `boolean` | `false` | Dùng trong card nhỏ/bảng |

Ảnh minh họa: `EmptyIllustration` (SVG tự vẽ trong `components/illustrations.tsx`, aria-hidden).

Phân biệt 2 loại empty: *chưa có dữ liệu* (có nút tạo) và *không có kết quả lọc* (có nút "Xóa bộ lọc").

### 3.5 ErrorState
| Prop | Type | Mô tả |
|---|---|---|
| `error` | `unknown` | Lỗi từ API – tự lấy `message` theo định dạng `ApiErrorResponse` |
| `onRetry` | `() => void` | Có → hiện nút "Thử lại" |
| `title` | `string` | Mặc định "Không tải được dữ liệu" |

A11y: vùng lỗi có `role="alert"` để screen reader đọc ngay.

### 3.6 MoneyText
Định dạng `BigDecimal` từ API (`number`) thành `2.800.000 ₫`, `tabular-nums`, `null` → `—`.

## 4. Patterns

### 4.1 App shell
```
┌ Sidebar 240px (xl) / 72px (md) / Drawer (<md) ┬ Header 64px: ☰ · Breadcrumb · 🔍 · 🔔 · Avatar ┐
│ Logo                                          ├────────────────────────────────────────────────┤
│ Menu theo role (menuConfig)                   │ <main> padding 24 · max-width 1440 · Outlet      │
│ ─ Thẻ người dùng (tên, vai trò)               │                                                │
└───────────────────────────────────────────────┴────────────────────────────────────────────────┘
```
- Menu sinh từ `routes/menuConfig.ts` (mỗi mục khai báo `roles`), breadcrumb sinh từ route `handle.breadcrumb`.
- Link "Bỏ qua tới nội dung chính" (skip link) là phần tử focus đầu tiên.
- Sidebar thu gọn: tooltip hiện tên mục khi hover icon.

### 4.1d Phiên bản 2.2 – Tổng quan, Hồ sơ, Đăng nhập
- **Tổng quan** (không còn 3D): `DashboardHeader` (ngày · vai trò, lời chào theo giờ, hành động chính bên phải – nhân viên: *Tiếp nhận thiết bị*, KTV: *Công việc của tôi*, khách: *Gửi yêu cầu sửa*, admin: chọn khoảng thời gian); hàng thẻ KPI; nội dung theo vai trò (admin: biểu đồ doanh thu 2/3 + phân bố trạng thái; nhân viên: bảng *Việc cần xử lý* + *Lối tắt*; KTV: bảng *Việc ưu tiên*; khách: thẻ thiết bị đang sửa có thanh tiến độ).
- **StatCard v2**: nhãn + ô icon nhỏ ở hàng trên, số lớn, chú thích + "Xem chi tiết →" (thẻ hẹp chỉ hiện mũi tên). 5 thẻ nằm một hàng từ 1280px; lưới 2 cột thì thẻ thứ 5 trải 2 cột (không có hàng trống một nửa).
- **Hồ sơ**: dải bìa navy + ảnh đại diện 112px có nút máy ảnh, tên + vai trò + liên hệ, nút *Đổi ảnh / Xóa ảnh*; dải thông tin (thành viên từ, đăng nhập gần nhất); thẻ *Thông tin cá nhân* và *Bảo mật* có tiêu đề kèm icon. `UserAvatar` hiển thị ảnh thật ở header, sidebar, danh sách người dùng (chưa có ảnh → chữ cái đầu).
- **Trang công khai v2.4 – phong cách neon công nghệ** (theo ảnh tham chiếu của chủ sản phẩm): bên trái là **anh thợ** – ảnh 3D render từ **Adobe Stock #1677010084** (bản quyền Standard, gói miễn phí, lấy qua Adobe connector), tách nền bằng Photoshop API, nhãn áo "CONSTRUCTION" đổi thành "REPAIRFLOW", xuất WebP 432×1100 (55 KB) tại `frontend/public/images/technician.webp`; anh thợ thở/đung đưa quanh bàn chân, quầng sáng xanh phía sau, phía trên máy tính bảng nổi một **bảng hologram chẩn đoán** (4 hạng mục Màn hình/Pin/Camera/Bo mạch chạy dần → ✓ OK, % tiến độ, sóng tín hiệu; chùm sáng hắt lên + hạt sáng bay lên, nhấp nháy kiểu hologram); **vệt quét** chạy dọc màn hình điện thoại đồng bộ với % (chu kỳ 5 giây). (Đã bỏ tia laser nối máy tính bảng → điện thoại vì không hợp ngữ cảnh.) Bên phải là **điện thoại cắt lớp** (nửa giao diện theo dõi phiếu, nửa lộ bo mạch/chip/pin/cáp flex, ranh giới viền sáng), cụm camera + bo mạch + ốc vít văng ra, **tia lửa** (hệ hạt có trọng lực) ở góc máy, **hai vệt năng lượng** xoáy quanh máy. Nền **bo mạch phát sáng** (`CircuitTraces`, xung chạy dọc đường mạch); **3 thẻ kính mờ** sáng viền lần lượt (chu kỳ 9 giây) và khi hover; **nút Đăng nhập** gradient xanh → cyan có quầng sáng và vệt sáng quét. Luôn chuyển động + **nút tạm dừng/tiếp tục** (WCAG 2.2.2) điều khiển cả cảnh 3D lẫn các hiệu ứng CSS. Không có hiệu ứng theo chuột.
- **Trang công khai**: giữ cảnh 3D; form nằm trong thẻ trắng bo 16px trên nền chấm mờ, thanh trên có nút *Tra cứu bảo hành*, chân trang; trang đăng nhập có logo, tiêu đề "Đăng nhập vào RepairFlow", nút phụ *Đăng ký tài khoản khách hàng*.

### 4.1c Lớp chuyển động & hình ảnh (phiên bản 2.1)
- **Chuyển động** (theo skill *design-taste-frontend*, `index.css`): hover 150ms vào / 120ms ra, bấm 90ms, một đường cong ease-out. Nút nhích lên 1px khi hover, lún 1px + scale .985 khi bấm (trừ nút dạng chữ/link); thẻ bấm được (`.rf-card-link`, VD StatCard) nâng 2px + viền đậm một bậc; liên kết trong nội dung có gạch chân "vẽ" từ trái sang phải (một kiểu duy nhất); khối có `data-enter` nổi lên một lần khi tải trang. Dịch chuyển chỉ với chuột + không bật *giảm chuyển động*; khi giảm chuyển động chỉ đổi màu. Lớp này **không nằm trong @layer** để thắng class tiện ích của Tailwind.
- **Màn hình cảm ứng**: nút, ô nhập, select, date picker tối thiểu 44px.
- **Hình ảnh** (`components/DeviceArt.tsx`, SVG tự vẽ): `DeviceArt` theo loại thiết bị (điện thoại, laptop, máy tính bảng, máy bàn, đồng hồ, khác) – dùng ở danh sách thiết bị, Thiết bị của tôi, chi tiết phiếu, Bảo hành của tôi; `PartArt` theo loại linh kiện, đoán từ danh mục/tên (`guessPartKind`: màn hình, pin, camera, cổng sạc, loa, bàn phím, bo mạch, bộ nhớ, cáp) – dùng ở Kho; `InitialAvatar` chữ cái đầu, màu cố định theo tên – khách hàng, người dùng, thẻ khách trong chi tiết phiếu. Trang 403: `LockedIllustration`; lỗi tải dữ liệu: `UnpluggedIllustration`.

### 4.1b Trang công khai & 3D (phiên bản 2)
- `AuthLayout` (đăng nhập, đăng ký, quên mật khẩu, tra cứu bảo hành): panel navy bên trái có **cảnh 3D three.js chân thực** (`components/three/repairScene.ts`) – điện thoại khung titan, mặt kính phản chiếu môi trường, viền + đảo camera, nút bấm, cổng USB-C, cụm 3 camera sau; màn hình hiển thị giao diện theo dõi phiếu; xung quanh là linh kiện tháo rời (pin có nhãn Li-ion, bo mạch có chip & nắp chống nhiễu, cụm camera + cáp flex, ốc vít Phillips, khay SIM), bóng đổ mềm; xoay chậm như bàn trưng bày, nghiêng theo con trỏ. Dựng bằng hình học thủ tục + vật liệu PBR, không tải file mô hình ngoài; tiêu đề và 3 thẻ kính mờ (glassmorphism) nêu tính năng – không dùng số liệu giả.
- Vị trí 3D: panel trái ở ≥ 1024px; dải cao 240px phía trên form ở 640–1023px; banner dashboard ở ≥ 640px (minh họa SVG `WorkbenchIllustration` khi đang tải/lỗi); điện thoại < 640px không tải 3D.
- Quy tắc 3D: tải qua `React.lazy` (chunk riêng ~142 KB gzip); `setAnimationLoop` dừng khi tab ẩn/khung ra khỏi màn hình; `dispose()` toàn bộ tài nguyên GPU khi rời trang; *giảm chuyển động* → không tự chạy, chỉ nghiêng theo chuột (mỗi lần di chuột vẽ 1 khung), có vẽ bù 1 khung sau khi gắn để tránh canvas trống; chunk tải lỗi (vừa deploy / dev server khởi động lại) → tự tải lại trang một lần (`lazyRepairScene.ts`), vẫn lỗi hoặc WebGL lỗi → `Scene3DBoundary` ẩn cảnh, trang vẫn dùng được; canvas `aria-hidden`.
- Mobile: dải thương hiệu navy gọn thay cho panel 3D.
- Dashboard: banner chào mừng navy + `WorkbenchIllustration`; trang 404: `LostDeviceIllustration`.

### 4.2 Form
- React Hook Form + Zod schema đặt cạnh feature (`features/auth/schemas.ts`).
- Lỗi hiện dưới field (AntD `Form.Item validateStatus/help`); lỗi `fieldErrors` từ API được map vào đúng field; lỗi chung hiện `Alert` trên đầu form.
- Nút submit hiện `loading` và bị chặn double-submit.

### 4.3 Feedback
| Tình huống | Thành phần |
|---|---|
| Thao tác thành công | `message.success` (tự ẩn 3s) |
| Lỗi thao tác | `message.error` với `message` từ API |
| Hành động phá hủy (hủy phiếu, xóa) | `Modal.confirm` nút đỏ, nêu rõ hậu quả |
| Thông báo realtime | Badge chuông + `notification.info` góc phải |

## 5. Do's & Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Lấy màu từ token / class Tailwind (`text-primary`, `bg-surface`) | Viết `#0369A1` trong component |
| Dùng `StatusTag` cho mọi enum có màu | Tô màu trạng thái thủ công ở từng trang |
| Hiển thị skeleton đúng hình dạng nội dung | Spinner toàn trang khi chỉ một bảng đang tải |
| Nút icon-only có `aria-label` | Dùng `div onClick` cho phần tử bấm được |
| Dùng `MoneyText` cho tiền | Tự `toLocaleString()` rải rác |
