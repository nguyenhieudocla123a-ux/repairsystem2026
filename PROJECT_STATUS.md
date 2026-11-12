# PROJECT STATUS – RepairFlow

> Cập nhật: 2026-11-12 · Ký hiệu: ✅ xong & đã kiểm tra · 🟡 xong nhưng chưa kiểm thử · ⏳ đang làm · ⬜ chưa làm

## Môi trường máy dev (đã kiểm tra 2026-11-12)

| Công cụ | Trạng thái |
|---|---|
| JDK 17 | ✅ `~/.jdks/ms-17.0.20.1` (JDK mặc định trên PATH là 25 → đặt `JAVA_HOME` khi build) |
| Maven 3.10 + Maven Wrapper | ✅ |
| Node 24 / npm 11 | ✅ |
| Docker 29 / Compose v5 | ✅ đang chạy; Testcontainers hoạt động |
| PostgreSQL Windows có sẵn | Chiếm cổng 5432 → container RepairFlow dùng **5433** (TD-24) |

## Tiến độ theo phase

| Phase | Nội dung | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Business Analysis | ✅ | `docs/requirements.md` |
| 2 | Database Design & ERD | ✅ | `docs/database-erd.md` (v0.2, khớp migration) |
| 3 | UI/UX & Wireframe | ✅ | `docs/ui-ux-design.md` |
| – | Kiến trúc & API contract | ✅ | `docs/architecture.md`, `docs/api-specification.md` |
| 4 | Project Initialization (backend) | ✅ | Spring Boot 3.5.16, Java 17, cấu trúc modular monolith |
| 5 | PostgreSQL & Flyway | ✅ | V1–V6, 16 bảng, 16 entity (`ddl-auto=validate` pass) |
| 6 | Backend Core APIs | ⬜ | Đã có nền: GlobalExceptionHandler, ApiErrorResponse, PageResponse, CodeGenerator |
| 7 | Spring Security & JWT | ⏳ | Đã có: stateless, CORS, 401/403 JSON, BCrypt bean. Chưa có: JWT filter, /auth |
| 8 | Frontend Layout & Auth | ⬜ | |
| 9 | FE–BE Integration | ⬜ | |
| 10 | Repair Management | ⬜ | Entity + schema đã có |
| 11 | Quotation & Inventory | ⬜ | Entity + schema đã có; `Part.decreaseStock` có unit test |
| 12 | Warranty | ⬜ | Entity + schema đã có |
| 13 | Dashboard & Reports | ⬜ | |
| 14 | Redis & WebSocket | ⏳ | Redis kết nối & health OK; chưa có cache/blacklist/WebSocket |
| 15 | Unit & Integration Test | ⏳ | 5 unit + 9 integration test (xem dưới) |
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

## Lộ trình theo mốc

1. ✅ Phân tích nghiệp vụ + ERD + UI/UX
2. ✅ Khởi tạo Backend + PostgreSQL + Flyway + Docker Compose cho DB/Redis
3. ⬜ Khởi tạo Frontend + Dashboard Layout (áp dụng design skill)
4. ⬜ Authentication + JWT + tích hợp đăng nhập
5. ⬜ Customers, Devices, Repair Management
6. ⬜ Quotation + Inventory
7. ⬜ Warranty + Notification (WebSocket) + Dashboard
8. ⬜ Testing + Docker hoàn chỉnh + tài liệu

## Mock data

Hiện tại: **không có**.

## Vấn đề mở

- Chưa có API nghiệp vụ nào – mọi endpoint `/api/v1/**` hiện trả 401 (đúng thiết kế cho tới Mốc 4).
