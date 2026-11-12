# PROJECT STATUS – RepairFlow

> Cập nhật: 2026-11-12 (Mốc 4) · Ký hiệu: ✅ xong & đã kiểm tra · 🟡 xong nhưng chưa kiểm thử · ⏳ đang làm · ⬜ chưa làm

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
| 6 | Backend Core APIs | ⬜ | Đã có nền: GlobalExceptionHandler, ApiErrorResponse, PageResponse, CodeGenerator |
| 7 | Spring Security & JWT | ✅ | JWT + refresh rotation, blacklist, rate limit, RBAC, quản lý user |
| 8 | Frontend Layout & Auth | ✅ | Đăng nhập/đăng ký/quên & đặt lại mật khẩu, hồ sơ, quản lý user – nối API thật |
| 9 | FE–BE Integration | ⏳ | Auth + Users đã nối API thật end-to-end; còn các module nghiệp vụ |
| 10 | Repair Management | ⬜ | Entity + schema đã có |
| 11 | Quotation & Inventory | ⬜ | Entity + schema đã có; `Part.decreaseStock` có unit test |
| 12 | Warranty | ⬜ | Entity + schema đã có |
| 13 | Dashboard & Reports | ⬜ | |
| 14 | Redis & WebSocket | ⏳ | Redis: blacklist token + rate limit đăng nhập ✅; chưa có cache dashboard, WebSocket |
| 15 | Unit & Integration Test | ⏳ | Backend: 16 unit + 27 integration · Frontend: 29 test |
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

## Lộ trình theo mốc

1. ✅ Phân tích nghiệp vụ + ERD + UI/UX
2. ✅ Khởi tạo Backend + PostgreSQL + Flyway + Docker Compose cho DB/Redis
3. ✅ Khởi tạo Frontend + Design System + Dashboard Layout
4. ✅ Authentication + JWT + tích hợp đăng nhập + quản lý người dùng
5. ⬜ Customers, Devices, Repair Management
6. ⬜ Quotation + Inventory
7. ⬜ Warranty + Notification (WebSocket) + Dashboard
8. ⬜ Testing + Docker hoàn chỉnh + tài liệu

## Mock data

Hiện tại: **không có**.

## Vấn đề mở

- Production chưa có cách tạo ADMIN đầu tiên (dev dùng DemoDataSeeder) – làm ở Mốc 8 cùng Docker.
- Kích hoạt tài khoản cổng khách cho hồ sơ có sẵn (`POST /customers/{id}/account`) làm cùng module Customers ở Mốc 5.
