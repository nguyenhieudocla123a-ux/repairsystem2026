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

| Token | Giá trị | Dùng cho |
|---|---|---|
| `brand.primary` | `#4F46E5` | Nút chính, link, menu active, focus |
| `brand.primaryHover` | `#4338CA` | Hover nút chính |
| `neutral.bg` | `#F8FAFC` | Nền trang |
| `neutral.surface` | `#FFFFFF` | Card, bảng, header |
| `neutral.border` | `#E2E8F0` | Viền card/bảng |
| `neutral.text` | `#0F172A` | Chữ chính (tương phản 17:1 trên trắng) |
| `neutral.textSecondary` | `#475569` | Chữ phụ (7.5:1 – đạt AA cho chữ nhỏ) |
| `neutral.textMuted` | `#94A3B8` | Placeholder, chú thích phụ – **không** dùng cho nội dung quan trọng |
| `sidebar.bg` | `#0F172A` | Sidebar |
| `sidebar.text` / `sidebar.textActive` | `#CBD5E1` / `#FFFFFF` | Menu sidebar |
| `semantic.success` | `#16A34A` | Hoàn thành, còn bảo hành |
| `semantic.warning` | `#D97706` | Chờ xác nhận, tồn thấp |
| `semantic.error` | `#DC2626` | Lỗi, hủy, hết hạn |
| `semantic.info` | `#0284C7` | Thông tin |

Mỗi tông ngữ nghĩa (`tone`) có cặp **nền nhạt + chữ đậm** dùng cho icon StatCard/Badge: `primary` (#EEF2FF/#4F46E5), `success` (#F0FDF4/#15803D), `warning` (#FFFBEB/#B45309), `error` (#FEF2F2/#B91C1C), `info` (#F0F9FF/#0369A1), `neutral` (#F1F5F9/#334155).

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
| Lấy màu từ token / class Tailwind (`text-primary`, `bg-surface`) | Viết `#4F46E5` trong component |
| Dùng `StatusTag` cho mọi enum có màu | Tô màu trạng thái thủ công ở từng trang |
| Hiển thị skeleton đúng hình dạng nội dung | Spinner toàn trang khi chỉ một bảng đang tải |
| Nút icon-only có `aria-label` | Dùng `div onClick` cho phần tử bấm được |
| Dùng `MoneyText` cho tiền | Tự `toLocaleString()` rải rác |
