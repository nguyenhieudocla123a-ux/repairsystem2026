# PROJECT STATUS – RepairFlow

> Cập nhật: 2026-11-12 (Mốc 6) · Ký hiệu: ✅ xong & đã kiểm tra · 🟡 xong nhưng chưa kiểm thử · ⏳ đang làm · ⬜ chưa làm

## Môi trường máy dev (đã kiểm tra 2026-11-12)

| Công cụ | Trạng thái |
|---|---|
| JDK 17 | ✅ `~/.jdks/ms-17.0.20.1` (JDK mặc định trên PATH là 25 → đặt `JAVA_HOME` khi build) |
| Maven 3.10 + Maven Wrapper | ✅ |
| Node 24 / npm 11 | ✅ |
| Smart App Control (Windows) | ⚠️ Chặn binary native của Rolldown → frontend dùng Vite 7 (TD-29) |
| Docker 29 / Compose v5 | ✅ đang chạy; Testcontainers hoạt động |
| PostgreSQL Windows có sẵn | Chiếm cổng 5432 → container RepairFlow dùng **5433** (TD-24) |

## Tiến độ theo phase

| Phase | Nội dung | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Business Analysis | ✅ | `docs/requirements.md` |
| 2 | Database Design & ERD | ✅ | `docs/database-erd.md` (v0.2, khớp migration) |
| 3 | UI/UX & Wireframe | ✅ | `docs/ui-ux-design.md`, `docs/design-system.md` |
| – | Kiến trúc & API contract | ✅ | `docs/architecture.md`, `docs/api-specification.md` |
| 4 | Project Initialization (backend) | ✅ | Spring Boot 3.5.16, Java 17, cấu trúc modular monolith |
| 5 | PostgreSQL & Flyway | ✅ | V1–V6, 16 bảng, 16 entity (`ddl-auto=validate` pass) |
| 6 | Backend Core APIs | ✅ | Customers, Devices, Repair Orders, Repair Requests |
| 7 | Spring Security & JWT | ✅ | JWT + refresh rotation, blacklist, rate limit, RBAC, quản lý user |
| 8 | Frontend Layout & Auth | ✅ | Đăng nhập/đăng ký/quên & đặt lại mật khẩu, hồ sơ, quản lý user – nối API thật |
| 9 | FE–BE Integration | ⏳ | Auth, Users, Khách hàng, Thiết bị, Phiếu sửa chữa nối API thật; còn báo giá, kho, bảo hành, dashboard |
| 10 | Repair Management | ✅ | Máy trạng thái + tiếp nhận + phân công + chẩn đoán (bàn giao ở Mốc 6) |
| 11 | Quotation & Inventory | ✅ | Báo giá, kho, bàn giao – Backend + Frontend |
| 12 | Warranty | ⬜ | Entity + schema đã có |
| 13 | Dashboard & Reports | ⬜ | |
| 14 | Redis & WebSocket | ⏳ | Redis: blacklist token + rate limit đăng nhập ✅; chưa có cache dashboard, WebSocket |
| 15 | Unit & Integration Test | ⏳ | Backend: 49 unit + 55 integration · Frontend: 39 test |
| 16 | Docker Compose & Deployment | ⏳ | Compose có PostgreSQL + Redis; chưa có container backend/frontend |
| 17 | Final Review & Documentation | ⬜ | |

## Mốc 2 – Checklist hoàn thành (2026-11-12)

- [x] `backend/pom.xml` – Spring Boot 3.5.16, Web, JPA, Security, Validation, WebSocket, Actuator, Redis, Cache, Flyway, jjwt, springdoc, Lombok, Testcontainers
- [x] Maven Wrapper (`backend/mvnw`)
- [x] `application.yml` + profile `dev`/`prod`/`test`, bí mật đọc từ biến môi trường / `.env`
- [x] Migration V1–V6 với FK, UNIQUE, CHECK, partial index, GIN trigram index, sequence sinh mã
- [x] 16 entity + 13 enum ánh xạ đúng schema (Hibernate validate khi khởi động)
- [x] `GlobalExceptionHandler`, định dạng lỗi chuẩn, 401/403 JSON
- [x] `CodeGenerator` sinh mã từ sequence (đã test 50 luồng đồng thời không trùng)
- [x] `docker-compose.yml` (PostgreSQL 16, Redis 7 có mật khẩu, healthcheck, volume), `.env.example`
- [x] Swagger UI `/swagger-ui.html`

**Đã kiểm thử thật:**

| Kiểm tra | Kết quả |
|---|---|
| `mvn verify` (JDK 17) | ✅ BUILD SUCCESS |
| Unit test `DomainRulesTest` (tồn kho, hạn bảo hành) | ✅ 5/5 |
| `DatabaseSchemaIT` (Testcontainers): đủ 6 migration, CHECK chống âm kho, 1 báo giá SENT/phiếu, serial unique không phân biệt hoa thường, mã không trùng khi đồng thời | ✅ 5/5 |
| `ApiInfrastructureIT`: health UP, Redis đọc/ghi, OpenAPI public, 401 JSON | ✅ 4/4 |
| Chạy jar với Docker Compose: Flyway "Successfully applied 6 migrations", `/actuator/health` → db UP, redis UP | ✅ |
| `GET /api/v1/customers` không token → 401 JSON chuẩn; Swagger UI → 200 | ✅ |

## Mốc 3 – Checklist hoàn thành (2026-11-12)

- [x] React 19 + TypeScript (strict) + Vite 7, alias `@/`, proxy `/api` & `/ws` → backend
- [x] Design system (`docs/design-system.md`): tokens một nguồn (`src/theme/tokens.ts` → AntD theme + CSS vars `--rf-*` → Tailwind `@theme`), Inter tự host
- [x] Component: PageHeader, StatCard (container query), StatusTag/RepairStatusTag, EmptyState, ErrorState, MoneyText, FormField (RHF ↔ AntD)
- [x] App shell responsive: sidebar 240/72px/Drawer, header (breadcrumb, tìm mã phiếu, chuông, menu user), skip link
- [x] Menu & route theo role từ một nguồn (`routes/appRoutes.tsx`), ProtectedRoute / GuestRoute / RoleGuard, trang 403/404
- [x] Trang Login / Register / Forgot Password: React Hook Form + Zod, map `fieldErrors` từ API vào field
- [x] Axios instance: Bearer token, refresh token dùng chung 1 promise khi nhiều request 401, `withCredentials`
- [x] Redux Toolkit: authSlice (token trong RAM, khôi phục phiên qua `/auth/refresh` khi F5)
- [x] Trang chưa có API → `ComingSoonPage` (không dữ liệu giả); `/dev/ui-kit` chỉ ở môi trường dev

**Đã kiểm thử thật:**

| Kiểm tra | Kết quả |
|---|---|
| `tsc -b` (strict) | ✅ không lỗi |
| `vitest run` – 23 test (refresh token queue, error mapping, schema, guard, component, LoginPage) | ✅ 23/23 |
| `vite build` production | ✅ (react 44 kB, app 73 kB, antd 265 kB gzip); UI kit không có trong bundle |
| `oxlint` | ✅ sạch |
| Trình duyệt (dev server): login validation, gửi form khi backend tắt → "Máy chủ tạm thời không phản hồi"; UI kit desktop 1366px; mobile 375px (không tràn ngang, drawer menu theo role CUSTOMER) | ✅ – đã sửa 4 lỗi tìm thấy (màu link, CSS var cho Tailwind, StatCard tràn số tiền, layout tràn ngang mobile) |

**Chưa làm được / chưa kiểm tra:** đăng nhập thành công end-to-end (cần API /auth – Mốc 4).

## Mốc 4 – Checklist hoàn thành (2026-11-12)

**Backend**
- [x] `JwtService` (HS256, jti, secret base64 ≥ 32 byte – thiếu/yếu thì app không khởi động), `JwtAuthenticationFilter`, 401 `TOKEN_EXPIRED` vs `UNAUTHORIZED`
- [x] Refresh token: cookie HttpOnly/Secure/SameSite=Strict/Path=/api/v1/auth, lưu SHA-256, xoay vòng + phát hiện dùng lại (thu hồi cả phiên), khóa dòng khi xoay vòng
- [x] Redis: blacklist access token khi logout, rate limit 5 lần sai / 15 phút (fail-open có log)
- [x] `/auth`: login, register (tạo user + hồ sơ khách), refresh, logout, me, cập nhật hồ sơ, đổi mật khẩu, quên/đặt lại mật khẩu
- [x] `/users` (ADMIN): tìm kiếm/lọc/phân trang/sort whitelist, tạo, sửa, khóa/mở khóa, đặt lại mật khẩu; `/users/technicians` (ADMIN, STAFF)
- [x] Audit log cho thao tác quản trị; job dọn token hết hạn; validation `@StrongPassword`, `@VietnamesePhone`
- [x] `DemoDataSeeder` (dev) – 4 tài khoản demo, mật khẩu từ `.env`

**Frontend**
- [x] Đăng nhập / đăng ký / khôi phục phiên khi F5 / đăng xuất chạy với API thật; trang Đặt lại mật khẩu, Hồ sơ cá nhân (sửa thông tin, đổi mật khẩu)
- [x] Trang Người dùng & Nhân viên/KTV: phân trang/lọc/sắp xếp phía server, tìm kiếm debounce, modal tạo/sửa, khóa/mở khóa, đặt lại mật khẩu
- [x] Sau đăng nhập chỉ quay lại trang cũ nếu vai trò được phép

**Đã kiểm thử thật:**

| Kiểm tra | Kết quả |
|---|---|
| `mvnw verify` – 16 unit (JwtService, RefreshTokenService/Mockito…) + 27 integration (AuthFlowIT: đăng ký, login sai/hoa thường/rate limit, refresh rotation + reuse, logout blacklist, token hết hạn, đổi & đặt lại mật khẩu, RBAC 403, khóa tài khoản, sort whitelist) | ✅ 43/43 |
| Frontend `tsc`, `oxlint`, `vite build`, `vitest` (29 test, gồm khôi phục phiên & canAccessPath) | ✅ |
| API thật: 4 tài khoản demo đăng nhập đúng vai trò | ✅ |
| Trình duyệt: ADMIN đăng nhập → quay lại /users; F5 giữ phiên; cookie không đọc được từ JS (HttpOnly); tìm kiếm debounce chỉ 1 request; tạo KTV qua modal (validation + bàn phím); đăng xuất → refresh 401; CUSTOMER → trang 403 cho /users, menu đúng vai trò, trang hồ sơ | ✅ |

**Lỗi tìm thấy & đã sửa trong mốc này:** khôi phục phiên gọi `/me` trước khi lưu token; hash giả BCrypt không hợp lệ (mất tác dụng chống timing attack); repository lồng không được Spring Data quét; **mọi popup AntD hỏng khi bật "giảm chuyển động"** (TD-39); khách hàng bị đưa vào trang 403 sau đăng nhập.

**Dữ liệu kiểm thử còn lại trong DB dev:** 1 tài khoản KTV `ktv.kiemthu@repairflow.local` tạo khi test giao diện (có thể khóa trong trang Người dùng).

## Mốc 5 – Checklist hoàn thành (2026-11-12)

**Backend**
- [x] Khách hàng: tìm kiếm (mã/tên/SĐT/email), chi tiết + thống kê, CRUD (xóa bị chặn nếu đã có phiếu), kích hoạt tài khoản cổng khách
- [x] Thiết bị: CRUD, serial duy nhất không phân biệt hoa thường, lịch sử sửa chữa; khách tự quản lý thiết bị (`/me/devices`)
- [x] `RepairStatusPolicy`: đồ thị 17 cạnh + kênh (thủ công / báo giá / bàn giao) + quyền theo vai trò & quan hệ với phiếu + điều kiện (phải có KTV mới kiểm tra, phải có phương án mới hoàn thành, hủy phải có lý do)
- [x] Phiếu sửa chữa: tạo tại quầy, sửa thông tin (optimistic lock), phân công KTV (audit), chẩn đoán, chuyển trạng thái, lịch sử, tìm theo mã, lọc trạng thái/KTV/ưu tiên/ngày
- [x] Yêu cầu online: khách gửi/hủy; nhân viên tiếp nhận (chuyển thành phiếu) / từ chối
- [x] Phân quyền theo tài nguyên: KTV chỉ phiếu được giao, khách chỉ dữ liệu của mình (ngoài phạm vi → 404)

**Frontend**
- [x] Khách hàng (danh sách, chi tiết: thống kê, thiết bị, lịch sử, tạo tài khoản), Thiết bị
- [x] Wizard tiếp nhận 4 bước (tại quầy hoặc từ yêu cầu online, tạo nhanh khách/thiết bị trong wizard)
- [x] Danh sách phiếu (bộ lọc, cảnh báo trễ hẹn), chi tiết phiếu (tiến độ, nút theo `allowedTransitions`, chẩn đoán, phân công, sửa tiếp nhận, timeline)
- [x] Kanban công việc của KTV; Yêu cầu online (nhân viên)
- [x] Cổng khách: Thiết bị của tôi, Sửa chữa của tôi (tiến độ + yêu cầu đã gửi + gửi yêu cầu mới), theo dõi phiếu

**Đã kiểm thử thật:**

| Kiểm tra | Kết quả |
|---|---|
| `mvnw verify` – 49 unit (33 cho máy trạng thái: đủ 17 cạnh hợp lệ, không cạnh thừa, kênh, vai trò, điều kiện) + 43 integration (RepairFlowIT: workflow, 409 chuyển sai/version cũ, phân quyền KTV/khách, yêu cầu online, trùng SĐT/serial) | ✅ 92/92 |
| Frontend `tsc`, `oxlint`, `vitest` 35 test, `vite build` | ✅ |
| Trình duyệt end-to-end 3 vai trò: khách thêm thiết bị → gửi yêu cầu `RQ-2026-000001` → nhân viên tiếp nhận qua wizard (điền sẵn), phân công KTV → phiếu `RO-2026-000001` → KTV thấy trên Kanban → Bắt đầu kiểm tra → lưu chẩn đoán → khách thấy tiến độ "Đang kiểm tra" + lịch sử | ✅ |

**Lỗi tìm thấy & đã sửa trong mốc này:** thanh tiến độ bị ngắt từng chữ ở màn hình ~750px; nút tự dựng (thẻ Kanban, StatCard) không dùng font Inter do không có preflight; trang xác nhận tiếp nhận thiếu tên KTV; API lịch sử trả tên nhân viên cho khách (giao diện ẩn nhưng API vẫn lộ – đã ẩn ở backend + test).

**Dữ liệu tạo khi test giao diện (DB dev):** thiết bị "iPhone 13 của tôi" của khách demo, yêu cầu `RQ-2026-000001`, phiếu `RO-2026-000001` (đang kiểm tra).

**Chưa làm trong mốc này (theo kế hoạch):** báo giá, xuất kho, bàn giao/thanh toán (Mốc 6); bảo hành, thông báo, dashboard (Mốc 7). Trang chi tiết phiếu hiển thị gợi ý bước tiếp theo, ghi rõ chức năng nào có ở mốc sau.

## Mốc 6 – Checklist hoàn thành (2026-11-12)

**Backend**
- [x] Kho: CRUD linh kiện, nhập kho, điều chỉnh kiểm kê (ADMIN), sổ kho; xuất/hoàn cho phiếu với khóa bi quan `SELECT … FOR UPDATE`; KTV không thấy giá vốn
- [x] Báo giá: nháp → gửi (phiếu → WAITING_CONFIRMATION) → khách / nhân viên thay khách duyệt hoặc từ chối; bản cũ → SUPERSEDED; tổng tiền tính ở Backend
- [x] Bàn giao: COMPLETED/REJECTED → DELIVERED, số tiền mặc định từ báo giá đã duyệt, phương thức thanh toán, tự tạo bảo hành
- [x] Hủy phiếu / trả máy không sửa bị chặn khi còn linh kiện chưa hoàn kho

**Frontend**
- [x] Trang Kho (linh kiện, lọc tồn thấp, nhập kho, kiểm kê, ngừng kinh doanh, sổ kho)
- [x] Chi tiết phiếu: tab Báo giá (trình soạn, gửi, duyệt/từ chối theo vai trò), tab Linh kiện (xuất/hoàn), nút Bàn giao & thu tiền
- [x] Trang Báo giá (nhân viên) và Báo giá của tôi (khách)

**Đã kiểm thử thật:**

| Kiểm tra | Kết quả |
|---|---|
| `mvnw verify` – 49 unit + 55 integration (QuotationInventoryIT: luồng đầy đủ tới bảo hành, **2 KTV xuất đồng thời linh kiện cuối → đúng 1 thành công, tồn = 0**, xuất vượt tồn/trước khi duyệt, KTV khác bị chặn, hoàn kho, kiểm kê, giảm giá vượt tổng, duyệt thay khách phải ghi chú, báo giá mới thay thế bản cũ, trả máy không sửa) | ✅ 104/104 |
| Frontend `tsc`, `oxlint`, `vitest` 39 test, `vite build` | ✅ |
| Trình duyệt end-to-end (phiếu `RO-2026-000001`): nhân viên tạo linh kiện + nhập 3 → lập báo giá 2.700.000₫ → gửi → khách đồng ý trên web → KTV xuất 1 màn hình, sửa, hoàn thành → nhân viên bàn giao (tự điền 2.700.000₫, tiền mặt) → bảo hành `WR-2026-000001`; sổ kho +3 / −1, tồn 2 | ✅ |
| graphify: knowledge graph 2.003 node / 7.274 cạnh / 85 community; truy vấn xác nhận mọi đổi trạng thái phiếu chỉ qua `changeStatus` (5 nơi gọi) | ✅ |

**Lỗi tìm thấy & đã sửa:** dòng sổ kho được INSERT trước khi gắn phiếu → CHECK constraint ở DB chặn (TD-49); jsdom thiếu `ResizeObserver` cho bảng có dòng tổng (polyfill trong test setup).

**Dữ liệu tạo khi test giao diện (DB dev):** linh kiện `LCD-IP13` (tồn 2), báo giá v1 của `RO-2026-000001` (đã duyệt), phiếu đã bàn giao, bảo hành `WR-2026-000001`.

**graphify – lưu ý:** cảnh báo sức khỏe 763 cạnh trỏ tới symbol ngoài repo (thư viện) + 608 cạnh trùng cặp bị gộp; không ảnh hưởng truy vấn trong code dự án.

## Lộ trình theo mốc

1. ✅ Phân tích nghiệp vụ + ERD + UI/UX
2. ✅ Khởi tạo Backend + PostgreSQL + Flyway + Docker Compose cho DB/Redis
3. ✅ Khởi tạo Frontend + Design System + Dashboard Layout
4. ✅ Authentication + JWT + tích hợp đăng nhập + quản lý người dùng
5. ✅ Customers, Devices, Repair Management
6. ✅ Quotation + Inventory + Bàn giao
7. ⬜ Warranty + Notification (WebSocket) + Dashboard
8. ⬜ Testing + Docker hoàn chỉnh + tài liệu

## Mock data

Hiện tại: **không có**.

## Vấn đề mở

- Production chưa có cách tạo ADMIN đầu tiên (dev dùng DemoDataSeeder) – làm ở Mốc 8 cùng Docker.
