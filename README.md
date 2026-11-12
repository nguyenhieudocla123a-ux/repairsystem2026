# RepairFlow – Device Repair & Warranty Management System

Hệ thống quản lý sửa chữa & bảo hành thiết bị điện tử cho trung tâm sửa chữa: tiếp nhận → kiểm tra → báo giá → sửa chữa → bàn giao → bảo hành, với 4 vai trò ADMIN / STAFF / TECHNICIAN / CUSTOMER.

> 🚧 Đang phát triển – Mốc 4/8 hoàn thành (nền tảng backend/frontend + đăng nhập JWT, phân quyền, quản lý người dùng). Xem tiến độ tại [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Chạy cục bộ

Yêu cầu: JDK 17, Docker Desktop (đang chạy).

```bash
# 1. Tạo file cấu hình (sau đó sửa các giá trị CHANGE_ME)
cp .env.example .env

# 2. Khởi động PostgreSQL (cổng 5433) + Redis (cổng 6379)
docker compose up -d

# 3. Chạy backend – Flyway tự migrate khi khởi động
cd backend
./mvnw spring-boot:run
```

- Health: http://localhost:8080/actuator/health
- Swagger UI: http://localhost:8080/swagger-ui.html

Chạy test (integration test cần Docker):

```bash
cd backend
./mvnw verify
```

Frontend (cần Node 20+):

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173 (proxy `/api` → backend 8080)
- UI kit (chỉ dev): http://localhost:5173/dev/ui-kit
- Test / build: `npm test`, `npm run build`

### Tài khoản demo (chỉ profile `dev`)

Đặt `DEMO_USER_PASSWORD` trong `.env` (≥ 8 ký tự, có chữ hoa, chữ thường, số) **trước** lần chạy backend đầu tiên. Backend tự tạo 4 tài khoản dùng chung mật khẩu đó:

| Vai trò | Email |
|---|---|
| ADMIN | `admin@repairflow.local` |
| STAFF | `staff@repairflow.local` |
| TECHNICIAN | `tech@repairflow.local` |
| CUSTOMER | `customer@repairflow.local` |

Tài khoản đã tồn tại sẽ không bị ghi đè: đổi `DEMO_USER_PASSWORD` sau đó không đổi mật khẩu cũ (dùng "Quên mật khẩu" – ở dev link đặt lại được in ra log backend).

> Nếu JDK mặc định không phải 17, đặt `JAVA_HOME` trỏ tới JDK 17 trước khi chạy `mvnw`.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | Java 17, Spring Boot 3, Spring Web, Data JPA, Security (JWT + Refresh Token), Validation, WebSocket (STOMP), Actuator, springdoc-openapi, Lombok |
| Dữ liệu | PostgreSQL 16, Flyway, Redis 7 |
| Frontend | React 19, TypeScript, Vite 7, React Router, Redux Toolkit, Axios, Tailwind CSS 4, Ant Design 6, React Hook Form, Zod, Recharts |
| Test | JUnit 5, Mockito, Spring Boot Test, Testcontainers · Vitest, React Testing Library |
| Triển khai | Docker, Docker Compose, Nginx |

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Phân tích nghiệp vụ, workflow, ma trận quyền |
| [docs/database-erd.md](docs/database-erd.md) | Thiết kế CSDL, ERD, ràng buộc, concurrency |
| [docs/ui-ux-design.md](docs/ui-ux-design.md) | Sitemap, wireframe |
| [docs/design-system.md](docs/design-system.md) | Design tokens, component, pattern |
| [docs/architecture.md](docs/architecture.md) | Kiến trúc, bảo mật, Redis, WebSocket, testing |
| [docs/api-specification.md](docs/api-specification.md) | Hợp đồng API Frontend ↔ Backend |
| [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) | Các quyết định kỹ thuật và lý do |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Đã làm / chưa làm |

## Cấu trúc repo

```
RepairFlow/
├── backend/      Spring Boot API
├── frontend/     React SPA
├── database/     (migration nằm trong backend/src/main/resources/db/migration)
├── docs/         Tài liệu thiết kế
├── docker-compose.yml   (sẽ thêm ở Mốc 2)
└── README.md
```
