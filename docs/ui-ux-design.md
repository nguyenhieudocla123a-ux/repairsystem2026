# RepairFlow – Thiết kế UI/UX, Sitemap & Wireframe (Phase 3)

> Phong cách: SaaS Dashboard (tham khảo tinh thần Linear / Vercel dashboard: gọn, nhiều khoảng trắng, nhấn mạnh dữ liệu) · Phiên bản 0.1

## 1. Design system

### 1.1 Công nghệ giao diện
- **Ant Design 6** (xem TD-28) cho component phức tạp (Table, Form, Modal, Drawer, Steps, Timeline, DatePicker, Select có search, Badge, notification).
- **Tailwind CSS** cho layout, spacing, responsive, card tự dựng. Không import `preflight` của Tailwind để không xung đột reset CSS của AntD. Chi tiết token/component: `docs/design-system.md`.
- **Recharts** cho biểu đồ. Icon: `@ant-design/icons`.
- Theme AntD qua `ConfigProvider` (token) – một nguồn màu duy nhất, Tailwind đọc cùng bảng màu trong `tailwind.config`.

### 1.2 Màu sắc (design tokens)
| Token | Giá trị | Dùng cho |
|---|---|---|
| primary | `#4F46E5` (indigo-600) | Nút chính, link, menu active |
| sidebar bg | `#0F172A` (slate-900) | Sidebar tối, chữ `#CBD5E1` |
| page bg | `#F8FAFC` (slate-50) | Nền nội dung |
| surface | `#FFFFFF`, viền `#E2E8F0`, bo góc 12px, shadow-sm | Card, bảng |
| success / warning / error / info | `#16A34A` / `#D97706` / `#DC2626` / `#0284C7` | Trạng thái |

### 1.3 Màu trạng thái phiếu (Tag)
| Trạng thái | Nhãn hiển thị | Màu |
|---|---|---|
| RECEIVED | Đã tiếp nhận | blue |
| INSPECTING | Đang kiểm tra | geekblue |
| WAITING_CONFIRMATION | Chờ khách xác nhận | gold |
| APPROVED | Đã duyệt báo giá | cyan |
| WAITING_FOR_PARTS | Chờ linh kiện | orange |
| REPAIRING | Đang sửa | purple |
| COMPLETED | Sửa xong | green |
| DELIVERED | Đã bàn giao | default (xám) |
| REJECTED | Khách từ chối | volcano |
| CANCELLED | Đã hủy | red |

Ánh xạ này đặt ở **một file duy nhất** `src/features/repairs/constants/status.ts` để mọi màn hình dùng chung.

### 1.4 Typography & spacing
- Font: **Inter** (fallback system-ui), size cơ sở 14px; tiêu đề trang 20px/600; số liệu KPI 28px/700, `tabular-nums`.
- Lưới spacing 4px; padding trang 24px (desktop) / 16px (mobile).
- Tiền: định dạng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` → `2.800.000 ₫`. Ngày: `dd/MM/yyyy HH:mm` (dayjs, locale vi).

### 1.5 Trạng thái màn hình (bắt buộc cho mọi trang dữ liệu)
| State | Hiển thị |
|---|---|
| Loading | Skeleton cho card/bảng (không dùng spinner toàn trang trừ lần tải đầu) |
| Empty | `<Empty>` + mô tả + nút hành động (VD "Chưa có khách hàng · **+ Thêm khách hàng**") |
| Error | `<Result status="error">` + thông điệp từ API + nút "Thử lại" |
| 403 | Trang "Bạn không có quyền truy cập" |
| 404 | Trang "Không tìm thấy" |
| Thành công | `message.success` góc trên; lỗi validate hiện ngay dưới field (React Hook Form + Zod, map `fieldErrors` từ API vào field) |

### 1.6 Responsive
- ≥ 1200px: sidebar mở rộng 240px.
- 768–1199px: sidebar thu gọn chỉ icon 72px.
- < 768px: sidebar thành `Drawer` mở bằng nút ☰; bảng chuyển cột phụ ẩn đi (`responsive` của AntD column), thẻ KPI xếp 1 cột.

## 2. Bố cục chung (App Shell)

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ ◆ RepairFlow │  ☰  Trang chủ / Phiếu sửa chữa / RO-2026-000123   🔍  🔔3  (A)▾│ ← Header 64px
│              ├──────────────────────────────────────────────────────────────┤
│ ▣ Dashboard  │  Phiếu sửa chữa                              [+ Tạo phiếu]    │ ← Page header
│ 👥 Khách hàng│  ┌─────────────────────────────────────────────────────────┐ │
│ 📱 Thiết bị  │  │ Bộ lọc: [Tìm mã/khách...] [Trạng thái ▾] [KTV ▾] [Ngày]│ │
│ 🔧 Phiếu SC  │  ├─────────────────────────────────────────────────────────┤ │
│ 🧾 Báo giá   │  │ Bảng dữ liệu (phân trang server-side)                    │ │
│ 📦 Kho       │  │                                                          │ │
│ 🛡 Bảo hành  │  └─────────────────────────────────────────────────────────┘ │
│ 📊 Báo cáo   │                                         ‹ 1 2 3 … 10 ›  20/trang│
│ ⚙ Người dùng │                                                              │
│──────────────│                                                              │
│ (A) Admin    │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

- **Sidebar**: menu sinh từ cấu hình `menuConfig` theo role (mỗi item có `roles: Role[]`).
- **Header**: breadcrumb (sinh từ route `handle.breadcrumb`), ô tìm nhanh mã phiếu, chuông thông báo (badge số chưa đọc, realtime), avatar dropdown (Hồ sơ, Đổi mật khẩu, Đăng xuất).
- **Notification center**: click chuông → Dropdown 360px danh sách 10 thông báo mới nhất, "Đánh dấu đã đọc tất cả", "Xem tất cả" → trang Notifications.

## 3. Sitemap & phân quyền route

| Route | Trang | ADMIN | STAFF | TECH | CUSTOMER |
|---|---|:-:|:-:|:-:|:-:|
| `/login` | Đăng nhập | public |||
| `/register` | Đăng ký khách hàng | public |||
| `/forgot-password`, `/reset-password` | Quên / đặt lại mật khẩu | public |||
| `/warranty-check` | Tra cứu bảo hành công khai | public |||
| `/dashboard` | Dashboard (nội dung theo role) | ✓ | ✓ | ✓ | ✓ |
| `/users` | Quản lý người dùng (tất cả tài khoản) | ✓ | | | |
| `/staff` | Quản lý nhân viên & KTV | ✓ | | | |
| `/customers`, `/customers/:id` | Khách hàng (chi tiết: thông tin, thiết bị, lịch sử SC) | ✓ | ✓ | | |
| `/devices`, `/devices/:id` | Thiết bị (chi tiết + lịch sử SC) | ✓ | ✓ | | |
| `/reception` | Tiếp nhận thiết bị (wizard) | ✓ | ✓ | | |
| `/repair-requests` | Yêu cầu sửa chữa online | ✓ | ✓ | | |
| `/repairs`, `/repairs/:id` | Phiếu sửa chữa – danh sách / chi tiết | ✓ | ✓ | ✓¹ | |
| `/tasks` | Công việc được giao (Kanban) | | | ✓ | |
| `/quotations` | Báo giá (danh sách tất cả phiên bản) | ✓ | ✓ | | |
| `/inventory`, `/inventory/transactions` | Linh kiện, lịch sử kho | ✓ | ✓ | ✓² | |
| `/warranties`, `/warranty-claims` | Bảo hành & yêu cầu bảo hành | ✓ | ✓ | | |
| `/reports` | Báo cáo doanh thu, linh kiện, KTV | ✓ | | | |
| `/my/devices` | Thiết bị của tôi | | | | ✓ |
| `/my/repairs`, `/my/repairs/:id` | Lịch sử & theo dõi sửa chữa (+ duyệt báo giá) | | | | ✓ |
| `/my/repairs/new` | Gửi yêu cầu sửa chữa | | | | ✓ |
| `/my/quotations` | Báo giá chờ xác nhận | | | | ✓ |
| `/my/warranties` | Bảo hành của tôi + tra cứu | | | | ✓ |
| `/notifications` | Tất cả thông báo | ✓ | ✓ | ✓ | ✓ |
| `/profile` | Hồ sơ & đổi mật khẩu | ✓ | ✓ | ✓ | ✓ |

¹ KTV chỉ thấy phiếu được giao (Backend lọc). ² KTV chỉ xem danh sách linh kiện (đọc), không nhập kho.
Guard route ở Frontend chỉ để **trải nghiệm** (ẩn menu, chuyển trang 403); quyền thật do Backend quyết định.

## 4. Wireframe các màn hình chính

### 4.1 Đăng nhập
```
┌───────────────────────────────┬───────────────────────────────┐
│                               │                               │
│   ◆ RepairFlow                │   Đăng nhập                   │
│                               │   Email     [______________]  │
│   Quản lý sửa chữa &          │   Mật khẩu  [__________ 👁]   │
│   bảo hành thiết bị           │   [ ] Ghi nhớ   Quên mật khẩu?│
│   (minh họa gradient indigo)  │   [       Đăng nhập        ]  │
│                               │   Chưa có tài khoản? Đăng ký  │
│   ✓ Theo dõi tiến độ realtime │   ─────────────               │
│   ✓ Báo giá minh bạch         │   Tra cứu bảo hành →          │
└───────────────────────────────┴───────────────────────────────┘
```
Mobile: ẩn panel trái.

### 4.2 Dashboard ADMIN
```
 Xin chào, Admin 👋                              [Khoảng: 30 ngày ▾]
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
 │Tổng phiếu│ │Đang sửa  │ │Hoàn thành│ │Doanh thu     │
 │   1.248  │ │    37    │ │   1.102  │ │ 482.500.000₫ │
 │ ▲12% kỳ  │ │          │ │          │ │ ▲8%          │
 └──────────┘ └──────────┘ └──────────┘ └──────────────┘
 ┌───────────────────────────────────┐ ┌─────────────────────┐
 │ Doanh thu theo ngày (AreaChart)    │ │ Phiếu theo trạng thái│
 │                                    │ │ (Donut chart)        │
 └───────────────────────────────────┘ └─────────────────────┘
 ┌───────────────────────────────────┐ ┌─────────────────────┐
 │ Top linh kiện xuất (BarChart)      │ │ ⚠ Tồn kho thấp       │
 │                                    │ │ Màn hình IP13  1/3   │
 └───────────────────────────────────┘ └─────────────────────┘
```
- STAFF: 4 KPI (Phiếu mới · Yêu cầu online chờ · Chờ khách xác nhận · Chờ bàn giao) + bảng "Việc cần xử lý hôm nay".
- TECHNICIAN: 3 KPI (Được giao · Đang làm · Hoàn thành tháng này) + danh sách việc ưu tiên cao.
- CUSTOMER: thẻ thiết bị, phiếu đang xử lý dạng **progress stepper**, banner "Bạn có 1 báo giá chờ xác nhận → Xem".

### 4.3 Tiếp nhận thiết bị (wizard – STAFF)
```
 Tiếp nhận thiết bị
 (1) Khách hàng ──── (2) Thiết bị ──── (3) Tình trạng ──── (4) Xác nhận
 ┌──────────────────────────────────────────────────────────┐
 │ Tìm khách: [SĐT hoặc tên...      🔍]  hoặc [+ Khách mới] │
 │ ● Nguyễn Văn A · 0901xxx · 3 thiết bị                     │
 └──────────────────────────────────────────────────────────┘
 Bước 3: Lỗi khách báo [textarea] · Tình trạng ngoại quan [textarea]
         Phụ kiện kèm [tags: Sạc, Ốp, SIM...] · Ưu tiên (•Thường) · Hẹn trả [date]
         Phân công KTV [select, hiển thị số việc đang làm của từng KTV]
                                              [‹ Quay lại] [Tạo phiếu]
```
Có thể bắt đầu từ một *yêu cầu online* → bước 1, 2, lỗi khách báo được điền sẵn.

### 4.4 Chi tiết phiếu sửa chữa (màn hình trung tâm)
```
 RO-2026-000123  [Đang kiểm tra]  [Ưu tiên: Cao]          [Hành động ▾]
 Tiến độ: ●──●──○──○──○──○──○  (Steps: Tiếp nhận → … → Bàn giao)
 ┌─────────────────────────────────────┐ ┌────────────────────────┐
 │ Tabs: [Tổng quan][Báo giá][Linh kiện]│ │ Khách hàng             │
 │       [Lịch sử]                      │ │ Nguyễn Văn A · 0901... │
 │ Lỗi khách báo: Màn hình sọc          │ ├────────────────────────┤
 │ Tình trạng khi nhận: Trầy góc        │ │ Thiết bị               │
 │ Chẩn đoán (KTV): [textarea] [Lưu]    │ │ iPhone 13 · IMEI ...   │
 │ Phương án khắc phục: ...             │ ├────────────────────────┤
 │                                      │ │ KTV: Trần B  [Đổi]     │
 │                                      │ │ Hẹn trả: 15/11/2026    │
 └─────────────────────────────────────┘ └────────────────────────┘
```
- Nút **Hành động** chỉ hiển thị các chuyển trạng thái hợp lệ với role hiện tại — danh sách lấy từ API (`allowedTransitions` trong response) để Frontend không tự đoán luật nghiệp vụ.
- Tab *Báo giá*: danh sách phiên bản (v1 Từ chối, v2 Đang chờ…), bảng dòng báo giá có thể sửa khi DRAFT, tổng tiền, nút "Gửi cho khách".
- Tab *Linh kiện* (KTV): bảng linh kiện đã xuất, nút "+ Xuất linh kiện" (Modal: chọn linh kiện có search, hiện tồn, nhập SL), "Hoàn kho".
- Tab *Lịch sử*: `Timeline` các lần đổi trạng thái (ai, lúc nào, ghi chú).

### 4.5 Công việc của KTV (Kanban)
```
 Được giao (3)      Đang kiểm tra (2)   Chờ linh kiện (1)   Đang sửa (2)
 ┌────────────┐    ┌────────────┐       ┌────────────┐      ┌────────────┐
 │RO-..123 🔴 │    │RO-..118    │       │RO-..101    │      │RO-..099    │
 │iPhone 13   │    │Dell XPS    │       │Galaxy S22  │      │MacBook Air │
 │Hẹn 15/11   │    │            │       │            │      │            │
 └────────────┘    └────────────┘       └────────────┘      └────────────┘
```
Click thẻ → mở chi tiết phiếu. Có toggle "Dạng bảng". (Không kéo-thả đổi trạng thái để tránh thao tác nhầm; đổi trạng thái qua nút có xác nhận.)

### 4.6 Khách hàng – theo dõi sửa chữa & duyệt báo giá
```
 Phiếu RO-2026-000123 · iPhone 13
 Tiếp nhận ✓ ─ Kiểm tra ✓ ─ Chờ xác nhận ● ─ Sửa chữa ─ Hoàn thành ─ Bàn giao
 ┌──────────────────────────────────────────────────────┐
 │ 🧾 Báo giá v2 – cần bạn xác nhận                       │
 │ Màn hình OLED iPhone 13      1 × 2.500.000₫           │
 │ Công thay màn hình           1 ×   300.000₫           │
 │ Tổng cộng                         2.800.000₫           │
 │        [Từ chối]   [✓ Đồng ý sửa]                      │
 └──────────────────────────────────────────────────────┘
 Lịch sử cập nhật: 12/11 09:10 Đã tiếp nhận · 12/11 10:30 Đang kiểm tra ...
```
"Từ chối" mở Modal nhập lý do. "Đồng ý" có Modal xác nhận số tiền.

### 4.7 Kho linh kiện
- Bảng: SKU, tên, danh mục, giá bán, tồn (badge đỏ nếu ≤ tối thiểu), trạng thái; lọc "Chỉ tồn thấp".
- Nút: "+ Linh kiện", "Nhập kho" (Modal: linh kiện, SL, giá nhập, NCC), "Điều chỉnh" (ADMIN).
- Trang lịch sử kho: lọc theo linh kiện, loại giao dịch, khoảng ngày, phiếu SC.

### 4.8 Bảo hành
- Ô tra cứu lớn (mã BH / mã phiếu / serial) → thẻ kết quả: còn hạn (xanh, "còn 54 ngày") / hết hạn (đỏ).
- Danh sách bảo hành, danh sách yêu cầu bảo hành (trạng thái, nút Chấp nhận / Từ chối).

## 5. Cấu trúc thư mục Frontend (feature-based)

```
frontend/src/
├── app/            store.ts, hooks.ts (useAppDispatch/useAppSelector), router.tsx, providers.tsx
├── layouts/        AppLayout (sidebar+header), AuthLayout
├── routes/         ProtectedRoute, RoleGuard, menuConfig.ts
├── components/     dùng chung: PageHeader, StatCard, StatusTag, MoneyText, EmptyState, ErrorState
├── features/
│   ├── auth/       authSlice.ts, authApi.ts, pages/(Login, Register, ForgotPassword, ResetPassword), schemas.ts
│   ├── customers/  api, types, pages, components
│   ├── devices/
│   ├── repairs/    (requests, orders, reception wizard, kanban, detail tabs, constants/status.ts)
│   ├── quotations/
│   ├── inventory/
│   ├── warranties/
│   ├── notifications/ notificationSlice.ts, useNotificationSocket.ts
│   ├── dashboard/
│   ├── reports/
│   └── users/
├── services/       http.ts (axios instance + interceptors), websocket.ts
├── hooks/          usePagination, useDebounce, useApiError
├── types/          api.ts (PageResponse, ApiError), enums.ts
├── utils/          format.ts (tiền, ngày), errors.ts
└── test/           setup.ts, utils render có Provider
```

**Quản lý state:** Redux Toolkit giữ `auth` (user, accessToken trong bộ nhớ), `notifications` (unread count + danh sách mới nhất – được WebSocket cập nhật). Dữ liệu danh sách theo màn hình dùng hook gọi service + state cục bộ (đơn giản, không đưa mọi thứ vào Redux).
