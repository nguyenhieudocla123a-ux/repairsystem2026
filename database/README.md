# database/

Migration Flyway **không** đặt ở đây mà ở:

```
backend/src/main/resources/db/migration/
```

Lý do (TD-13 trong `TECHNICAL_DECISIONS.md`): migration được đóng gói vào file jar của backend nên chạy được ở mọi nơi backend chạy (máy dev, Docker image, Testcontainers) – chỉ có **một** nguồn sự thật.

Thiết kế schema & ERD: xem [`docs/database-erd.md`](../docs/database-erd.md).

Thư mục này dùng cho các script tiện ích thủ công (nếu có), ví dụ truy vấn báo cáo mẫu, script backup.
