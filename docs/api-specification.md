# RepairFlow – API Specification (hợp đồng Frontend ↔ Backend)

> Base URL: `/api/v1` · JSON UTF-8 · Phiên bản 0.1 (chờ thống nhất)
> Swagger UI (sau khi triển khai): `http://localhost:8080/swagger-ui.html` – là nguồn chính xác nhất khi code đã chạy; file này là **thiết kế** để hai phía code song song.
> Quy ước role trong bảng: **A**=ADMIN, **S**=STAFF, **T**=TECHNICIAN, **C**=CUSTOMER, **P**=public.

## 1. Quy ước chung

### 1.1 Xác thực
`Authorization: Bearer <accessToken>` cho mọi API trừ nhóm public. Refresh token nằm trong cookie `rf_refresh` (HttpOnly), Frontend không đọc/ghi trực tiếp — chỉ cần `withCredentials: true` cho các request `/auth/*`.

### 1.2 Phân trang, sắp xếp, lọc
Query: `page` (bắt đầu 0), `size` (mặc định 20, tối đa 100), `sort=field,asc|desc` (chỉ các field được whitelist), cộng các tham số lọc riêng của từng API.

```json
// PageResponse<T>
{ "content": [ ... ], "page": 0, "size": 20, "totalElements": 134, "totalPages": 7 }
```

### 1.3 Kiểu dữ liệu
| Loại | Định dạng JSON |
|---|---|
| Tiền | **number** 2 chữ số thập phân (`2800000.00`) – Backend `BigDecimal`, serialize dạng số |
| Thời điểm | ISO-8601 UTC `"2026-11-12T03:10:00Z"` |
| Ngày | `"2026-11-12"` |
| Enum | chuỗi in hoa (`"REPAIRING"`) |

### 1.4 Định dạng lỗi
```json
{
  "timestamp": "2026-11-12T03:10:00Z",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "Dữ liệu không hợp lệ",
  "path": "/api/v1/customers",
  "fieldErrors": [ { "field": "phone", "message": "Số điện thoại không hợp lệ" } ]
}
```

| HTTP | `code` tiêu biểu | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED`, `BAD_REQUEST` | Body/param sai |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` | Thiếu/sai/hết hạn token; sai mật khẩu |
| 403 | `ACCESS_DENIED`, `ACCOUNT_LOCKED` | Không đủ quyền |
| 404 | `NOT_FOUND` | Không tồn tại **hoặc** không thuộc phạm vi được xem |
| 409 | `CONFLICT`, `DUPLICATE_RESOURCE`, `INVALID_STATUS_TRANSITION`, `INSUFFICIENT_STOCK`, `CONCURRENT_MODIFICATION` | Vi phạm nghiệp vụ / xung đột |
| 429 | `TOO_MANY_REQUESTS` | Vượt rate limit |
| 500 | `INTERNAL_ERROR` | Lỗi không mong đợi (không lộ stack trace) |

Frontend: interceptor chỉ tự refresh khi `401` + `code = TOKEN_EXPIRED`.

## 2. Auth – `/auth`

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | P | Đăng nhập |
| POST | `/auth/register/send-code` | P | Gửi mã 6 số tới email `{email}` → `{expiresIn: 600, resendAfter: 60}`; 409 email đã dùng, 429 chưa đủ 60 giây / quá 10 lần mỗi giờ mỗi IP |
| POST | `/auth/register` | P | Khách hàng đăng ký – bắt buộc `verificationCode` (6 số); sai/hết hạn → 400, sai 5 lần huỷ mã |
| GET | `/auth/oauth2/providers` | P | Nhà cung cấp đang bật `{providers: ["google","facebook"]}` |
| GET | `/auth/oauth2/authorize/{google\|facebook}` | P | Điều hướng trình duyệt sang Google/Facebook (302) – xem docs/social-login.md |
| GET | `/auth/oauth2/callback/{id}` | P | Google/Facebook gọi về; chuyển tới `/oauth/callback`, `/register/social` hoặc `/login?oauthError=` |
| GET | `/auth/oauth2/pending` | P (cookie `rf_oauth_signup`) | Thông tin đăng ký chờ `{provider, email, fullName}` |
| POST | `/auth/oauth2/complete` | P (cookie `rf_oauth_signup`) | `{fullName, phone, address?, verificationCode}` → 201 + cookie refresh token |
| POST | `/auth/refresh` | P (cookie) | Cấp access token mới, xoay vòng refresh token |
| POST | `/auth/logout` | P (cookie) + Bearer nếu có | Thu hồi refresh token, blacklist access token |
| POST | `/auth/forgot-password` | P | Luôn trả 204 (không tiết lộ email có tồn tại) |
| POST | `/auth/reset-password` | P | Đặt lại bằng token |
| GET | `/auth/me` | A S T C | Thông tin user hiện tại |
| PUT | `/auth/me` | A S T C | Cập nhật họ tên, SĐT |
| PUT | `/auth/me/password` | A S T C | Đổi mật khẩu → thu hồi mọi phiên khác, trả `AuthResponse` + cookie mới cho thiết bị hiện tại |
| PUT | `/auth/me/avatar` | A S T C | Tải lên / thay ảnh đại diện – `multipart/form-data`, field `file`; JPEG/PNG/WebP ≤ 2 MB, loại ảnh xác định bằng chữ ký file (không tin Content-Type); trả `UserResponse` |
| DELETE | `/auth/me/avatar` | A S T C | Xóa ảnh đại diện → `UserResponse` với `avatarUpdatedAt = null` |
| GET | `/users/{id}/avatar` | A S T C³ | Ảnh đại diện (bytes, `Cache-Control: private, max-age=604800`, ETag). ³ Khách chỉ xem ảnh của chính mình, ngoài phạm vi → `404`. Client gắn `?v={avatarUpdatedAt}` để phá cache khi đổi ảnh |

```json
// POST /auth/login  →  LoginRequest
{ "email": "staff@repairflow.local", "password": "********" }
// 200 AuthResponse (+ Set-Cookie rf_refresh)
{ "accessToken": "eyJ...", "tokenType": "Bearer", "expiresIn": 900,
  "user": { "id": 2, "email": "staff@repairflow.local", "fullName": "Lê Staff",
            "phone": "0900000002", "role": "STAFF", "status": "ACTIVE", "customerId": null } }

// POST /auth/register → RegisterRequest
{ "fullName": "Nguyễn Văn A", "email": "a@gmail.com", "phone": "0901234567",
  "password": "Abc@1234", "address": "Hà Nội" }
// 201 AuthResponse (đăng nhập luôn). 409 DUPLICATE_RESOURCE nếu email/SĐT đã tồn tại

// POST /auth/reset-password
{ "token": "...", "newPassword": "Abc@1234" }
```
Mật khẩu: 8–72 ký tự, có chữ hoa, chữ thường, số (`@StrongPassword` ↔ `passwordSchema` Zod).

**Đã hiện thực (Mốc 4).** Ghi chú hành vi:
- `login` sai email hoặc sai mật khẩu đều trả cùng `401 INVALID_CREDENTIALS` (không lộ email nào tồn tại); sai 5 lần / 15 phút / email → `429 TOO_MANY_REQUESTS`; tài khoản khóa → `403 ACCOUNT_LOCKED`.
- `refresh` dùng lại token đã xoay vòng → `401` và thu hồi toàn bộ phiên đó (reuse detection).
- `logout` luôn `204` (idempotent), xóa cookie (`Max-Age=0`).
- `UserResponse` có thêm `lastLoginAt`, `createdAt`.

`UserResponse` có thêm `avatarUpdatedAt` (ISO, `null` = chưa có ảnh).

## 3. Users (quản trị) – `/users` · Role: **A**

| Method | Path | Mô tả |
|---|---|---|
| GET | `/users?role=&status=&q=&page=&size=&sort=` | Danh sách. `role` nhận nhiều giá trị (`role=STAFF,TECHNICIAN`); `sort` chỉ cho `createdAt, fullName, email, role, lastLoginAt` (khác → 400) |
| GET | `/users/{id}` | Chi tiết |
| POST | `/users` | Tạo tài khoản nội bộ (ADMIN/STAFF/TECHNICIAN) |
| PUT | `/users/{id}` | Sửa họ tên, SĐT, role |
| PATCH | `/users/{id}/status` | `{ "status": "LOCKED" }` |
| POST | `/users/{id}/reset-password` | `{ "newPassword": "..." }` |
| GET | `/users/technicians` | **A S** – danh sách KTV active + số việc đang làm (cho Select phân công) |

Quy tắc: không tạo `CUSTOMER` qua API này (400); không tự đổi vai trò/tự khóa chính mình (400); không chuyển qua lại giữa tài khoản khách hàng và nội bộ; đổi vai trò / khóa / đặt lại mật khẩu → thu hồi mọi phiên của người đó; mọi thao tác ghi `audit_logs`.

```json
// UserResponse
{ "id": 3, "email": "tech1@repairflow.local", "fullName": "Trần Kỹ Thuật", "phone": "0900000003",
  "role": "TECHNICIAN", "status": "ACTIVE", "customerId": null,
  "lastLoginAt": "2026-11-12T01:00:00Z", "createdAt": "2026-11-01T00:00:00Z" }
// TechnicianOption
{ "id": 3, "fullName": "Trần Kỹ Thuật", "activeTaskCount": 4 }
```

## 4. Customers – `/customers` · Role: **A S**

| Method | Path | Mô tả |
|---|---|---|
| GET | `/customers?q=&page=&size=&sort=` | Tìm theo tên/SĐT/email/mã |
| GET | `/customers/{id}` | Chi tiết (kèm thống kê: số thiết bị, số phiếu, tổng chi tiêu) |
| POST | `/customers` | Tạo |
| PUT | `/customers/{id}` | Sửa |
| DELETE | `/customers/{id}` | Xóa (409 nếu đã có phiếu) |
| GET | `/customers/{id}/devices` | Thiết bị của khách |
| GET | `/customers/{id}/repair-orders?page=` | Lịch sử sửa chữa |
| POST | `/customers/{id}/account` | Kích hoạt tài khoản cổng KH `{ "email", "password" }` |

```json
// CustomerRequest
{ "fullName": "Nguyễn Văn A", "phone": "0901234567", "email": "a@gmail.com",
  "address": "12 Láng Hạ, Hà Nội", "note": "Khách quen" }
// CustomerResponse
{ "id": 10, "code": "CUS-000010", "fullName": "Nguyễn Văn A", "phone": "0901234567",
  "email": "a@gmail.com", "address": "...", "note": "...", "hasAccount": true,
  "createdAt": "..." }
// CustomerDetailResponse = CustomerResponse + { "deviceCount": 2, "repairOrderCount": 5, "totalSpent": 4500000.00 }
```

## 5. Devices – `/devices`

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/devices?customerId=&type=&q=&page=` | A S | Danh sách (q: tên/model/serial) |
| GET | `/devices/{id}` | A S C¹ | Chi tiết |
| POST | `/devices` | A S | Tạo (`customerId` bắt buộc) |
| PUT | `/devices/{id}` | A S C¹ | Sửa |
| DELETE | `/devices/{id}` | A S | Xóa (409 nếu đã có phiếu) |
| GET | `/devices/{id}/repair-orders` | A S C¹ | Lịch sử sửa chữa thiết bị |
| GET | `/me/devices` | C | Thiết bị của tôi |
| POST | `/me/devices` | C | Thêm thiết bị của tôi (không có `customerId`) |

¹ CUSTOMER chỉ với thiết bị của mình.

```json
// DeviceRequest
{ "customerId": 10, "name": "iPhone 13 của A", "deviceType": "PHONE", "brand": "Apple",
  "model": "iPhone 13", "serialNumber": "356789101112131", "color": "Đen", "note": null }
// DeviceResponse
{ "id": 5, "customerId": 10, "customerName": "Nguyễn Văn A", "name": "...", "deviceType": "PHONE",
  "brand": "Apple", "model": "iPhone 13", "serialNumber": "356789101112131", "color": "Đen",
  "note": null, "createdAt": "..." }
```

## 6. Repair Requests (yêu cầu online) – `/repair-requests`

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/me/repair-requests` | C | Gửi yêu cầu `{ deviceId, issueDescription, expectedDropOffDate }` |
| GET | `/me/repair-requests` | C | Yêu cầu của tôi |
| POST | `/me/repair-requests/{id}/cancel` | C | Hủy khi còn PENDING |
| GET | `/repair-requests?status=&q=&page=` | A S | Danh sách |
| POST | `/repair-requests/{id}/convert` | A S | Tiếp nhận → tạo phiếu (body như `CreateRepairOrderRequest` trừ customer/device) → trả `RepairOrderDetailResponse` |
| POST | `/repair-requests/{id}/reject` | A S | `{ "reason": "..." }` |

```json
// RepairRequestResponse
{ "id": 1, "code": "RQ-2026-000001", "customerId": 10, "customerName": "...", "device": { DeviceSummary },
  "issueDescription": "Màn hình sọc", "expectedDropOffDate": "2026-11-13",
  "status": "PENDING", "repairOrderId": null, "rejectReason": null, "createdAt": "..." }
```

## 7. Repair Orders – `/repair-orders`

**Đã hiện thực (Mốc 5)** – trừ `/deliver` (Mốc 6). Ghi chú thay đổi so với thiết kế:
- `TransitionRequest` chỉ nhận `INSPECTING, REPAIRING, WAITING_FOR_PARTS, COMPLETED, CANCELLED`; gửi trạng thái thuộc kênh báo giá/bàn giao → `409 INVALID_STATUS_TRANSITION`. `version` sai → `409 CONCURRENT_MODIFICATION`.
- `RepairOrderDetailResponse` có thêm `canEditReception`, `canAssign`, `canDiagnose` (cờ quyền cho người dùng hiện tại); chưa có `currentQuotationId`, `warrantyId`, `warrantyClaimId` (thêm ở Mốc 6–7).
- `RepairOrderSummaryResponse` có thêm `customerId`, `deviceId`, `technicianId`.
- `GET /repair-orders/{id}/history` với CUSTOMER: `changedByName = null` (chỉ trả vai trò).
- `POST /me/repair-orders/{id}/cancel` body `{ "reason": "..." }`.
- `GET /customers/{id}/devices` trả mảng (không phân trang); `GET /devices/{id}/repair-orders` trả mảng tối đa 100 phiếu gần nhất.

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/repair-orders?status=&technicianId=&customerId=&priority=&q=&from=&to=&page=&sort=` | A S T¹ | Danh sách; `status` có thể nhiều giá trị `status=REPAIRING,INSPECTING` |
| GET | `/repair-orders/{id}` | A S T¹ C² | Chi tiết |
| POST | `/repair-orders` | A S | Tạo phiếu tại quầy |
| PUT | `/repair-orders/{id}` | A S | Sửa thông tin tiếp nhận (lỗi báo, tình trạng, phụ kiện, ưu tiên, hẹn trả). Gửi kèm `version` |
| PATCH | `/repair-orders/{id}/assign` | A S | `{ "technicianId": 3 }` |
| PATCH | `/repair-orders/{id}/diagnosis` | A T¹ | `{ "diagnosis": "...", "solution": "..." }` |
| POST | `/repair-orders/{id}/transitions` | theo ma trận | Đổi trạng thái (xem dưới) |
| POST | `/repair-orders/{id}/deliver` | A S | Bàn giao `{ finalAmount, paymentMethod, warrantyMonths, warrantyTerms, note }` |
| GET | `/repair-orders/{id}/history` | A S T¹ C² | Lịch sử trạng thái |
| GET | `/repair-orders/lookup?code=` | A S T | Tìm nhanh theo mã (ô search header) |
| GET | `/me/repair-orders?status=&page=` | C | Phiếu của tôi |
| POST | `/me/repair-orders/{id}/cancel` | C | Hủy khi `RECEIVED` |

¹ KTV: chỉ phiếu được giao. ² CUSTOMER: chỉ phiếu của mình.

```json
// CreateRepairOrderRequest
{ "customerId": 10, "deviceId": 5, "reportedIssue": "Màn hình sọc",
  "deviceCondition": "Trầy góc phải", "accessories": "Ốp lưng, SIM",
  "priority": "NORMAL", "expectedReturnDate": "2026-11-15", "technicianId": 3 }

// TransitionRequest — chỉ dùng cho: INSPECTING, REPAIRING, WAITING_FOR_PARTS, COMPLETED, CANCELLED
// (WAITING_CONFIRMATION/APPROVED/REJECTED đi qua API báo giá; DELIVERED qua /deliver)
{ "toStatus": "REPAIRING", "note": "Đã có linh kiện", "version": 4 }

// RepairOrderSummaryResponse (dùng trong bảng)
{ "id": 123, "code": "RO-2026-000123", "status": "INSPECTING", "priority": "HIGH",
  "customerName": "Nguyễn Văn A", "customerPhone": "0901234567",
  "deviceName": "iPhone 13", "technicianName": "Trần Kỹ Thuật",
  "isWarrantyRepair": false, "expectedReturnDate": "2026-11-15",
  "receivedAt": "...", "updatedAt": "..." }

// RepairOrderDetailResponse
{ ...Summary,
  "customer": { "id": 10, "code": "CUS-000010", "fullName": "...", "phone": "...", "email": "..." },
  "device":   { "id": 5, "name": "...", "deviceType": "PHONE", "brand": "Apple", "model": "iPhone 13", "serialNumber": "..." },
  "technician": { "id": 3, "fullName": "..." },
  "reportedIssue": "...", "deviceCondition": "...", "accessories": "...",
  "diagnosis": "...", "solution": "...",
  "finalAmount": null, "paymentMethod": null,
  "completedAt": null, "deliveredAt": null, "cancelReason": null,
  "repairRequestId": 1, "warrantyClaimId": null, "warrantyId": null,
  "currentQuotationId": 42,
  "allowedTransitions": ["WAITING_FOR_PARTS", "CANCELLED"],   // tính cho user hiện tại
  "version": 4 }

// RepairStatusHistoryResponse
{ "id": 1, "fromStatus": null, "toStatus": "RECEIVED", "changedByName": "Lê Staff",
  "changedByRole": "STAFF", "note": "Tiếp nhận tại quầy", "changedAt": "..." }
```
CUSTOMER nhận cùng DTO nhưng `deviceCondition`/thông tin nội bộ vẫn hiển thị được (minh bạch); không có trường nhạy cảm nội bộ (giá nhập linh kiện chẳng hạn không bao giờ xuất hiện trong DTO phiếu).

## 8. Quotations

**Đã hiện thực (Mốc 6).** Ghi chú: chỉ lập báo giá khi phiếu ở `INSPECTING`, `REPAIRING` hoặc `REJECTED` (các trạng thái có cạnh tới `WAITING_CONFIRMATION`); mỗi phiếu tối đa 1 bản nháp; gửi báo giá mới → bản `SENT`/`REJECTED` cũ thành `SUPERSEDED`; `validUntil` đã qua → duyệt bị `409`; dòng `PART` bỏ trống `unitPrice` → lấy giá bán hiện tại; nhân viên duyệt/từ chối thay khách bắt buộc `note`.

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/repair-orders/{id}/quotations` | A S T¹ C² | Mọi phiên bản (C không thấy DRAFT) |
| POST | `/repair-orders/{id}/quotations` | A S | Tạo DRAFT (version tự tăng) |
| GET | `/quotations/{qid}` | A S T¹ C² | Chi tiết |
| PUT | `/quotations/{qid}` | A S | Sửa DRAFT (thay toàn bộ items) |
| DELETE | `/quotations/{qid}` | A S | Xóa DRAFT |
| POST | `/quotations/{qid}/send` | A S | DRAFT → SENT; phiếu → WAITING_CONFIRMATION |
| POST | `/quotations/{qid}/approve` | C² A S | `{ "note": "..." }` (A/S: note bắt buộc) |
| POST | `/quotations/{qid}/reject` | C² A S | `{ "note": "Giá cao" }` |
| GET | `/quotations?status=&q=&page=` | A S | Danh sách toàn hệ thống |
| GET | `/me/quotations?status=SENT` | C | Báo giá chờ tôi xác nhận |

```json
// QuotationRequest
{ "discount": 0, "note": "Bảo hành màn hình 6 tháng", "validUntil": "2026-11-20",
  "items": [
    { "itemType": "PART",  "partId": 7, "description": "Màn hình OLED iPhone 13", "quantity": 1, "unitPrice": 2500000 },
    { "itemType": "LABOR", "partId": null, "description": "Công thay màn hình", "quantity": 1, "unitPrice": 300000 } ] }

// QuotationResponse
{ "id": 42, "repairOrderId": 123, "repairOrderCode": "RO-2026-000123", "versionNo": 2,
  "status": "SENT", "items": [ { "id": 1, "itemType": "PART", "partId": 7, "partSku": "LCD-IP13",
  "description": "...", "quantity": 1, "unitPrice": 2500000.00, "lineTotal": 2500000.00 } ],
  "laborTotal": 300000.00, "partsTotal": 2500000.00, "discount": 0.00, "totalAmount": 2800000.00,
  "note": "...", "validUntil": "2026-11-20", "customerResponseNote": null,
  "createdByName": "Lê Staff", "respondedByName": null,
  "sentAt": "...", "respondedAt": null, "createdAt": "...", "version": 1 }
```

## 9. Inventory

**Đã hiện thực (Mốc 6).** Bổ sung `GET /parts/categories`. Xuất/hoàn chỉ khi phiếu `APPROVED`/`REPAIRING`/`WAITING_FOR_PARTS`. Hủy phiếu hoặc trả máy không sửa khi còn linh kiện đã xuất → `409`. `POST /repair-orders/{id}/deliver`: `finalAmount` bỏ trống → tổng báo giá đã duyệt (hoặc 0 khi trả máy không sửa); `paymentMethod` bắt buộc khi số tiền > 0; `warrantyMonths` 0–24; trả `RepairOrderDetailResponse` có `warrantyId`, `warrantyCode`. `RepairOrderDetailResponse` có thêm `canQuote`, `canDeliver`, `canUseParts`, `approvedQuotationTotal`.

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/parts?q=&category=&lowStock=&active=&page=` | A S T | Danh sách |
| GET | `/parts/options` | A S T | Danh sách gọn active (cache) cho Select |
| GET | `/parts/{id}` | A S T | Chi tiết |
| POST | `/parts` | A S | Tạo (tồn ban đầu = 0, nhập qua `/import`) |
| PUT | `/parts/{id}` | A S | Sửa (kèm `version`) |
| PATCH | `/parts/{id}/active` | A | `{ "active": false }` |
| POST | `/parts/{id}/import` | A S | `{ quantity, unitCost, supplierName, note }` |
| POST | `/parts/{id}/adjust` | A | `{ newQuantity, note }` (note bắt buộc) |
| GET | `/inventory/transactions?partId=&type=&repairOrderId=&from=&to=&page=` | A S | Lịch sử kho |
| GET | `/repair-orders/{id}/parts` | A S T¹ | Linh kiện đã dùng cho phiếu (EXPORT − RETURN) |
| POST | `/repair-orders/{id}/parts` | A T¹ | Xuất kho `{ partId, quantity, note }` → 409 `INSUFFICIENT_STOCK` |
| POST | `/repair-orders/{id}/parts/return` | A T¹ | Hoàn kho `{ partId, quantity, note }` (≤ số đã xuất) |

```json
// PartResponse  (costPrice chỉ có giá trị với A/S; T nhận null)
{ "id": 7, "sku": "LCD-IP13", "name": "Màn hình OLED iPhone 13", "category": "Màn hình",
  "unit": "cái", "costPrice": 1800000.00, "sellingPrice": 2500000.00,
  "quantityOnHand": 3, "minStockLevel": 2, "lowStock": false, "active": true, "version": 5 }
// InventoryTransactionResponse
{ "id": 99, "partId": 7, "partSku": "LCD-IP13", "partName": "...", "type": "EXPORT",
  "quantity": 1, "balanceAfter": 2, "unitCost": 1800000.00, "repairOrderId": 123,
  "repairOrderCode": "RO-2026-000123", "supplierName": null, "note": "...",
  "createdByName": "Trần Kỹ Thuật", "createdAt": "..." }
// RepairPartUsageResponse
{ "partId": 7, "partSku": "LCD-IP13", "partName": "...", "quantityUsed": 1 }
```

## 10. Warranty

**Đã hiện thực (Mốc 7).** Ghi chú: `GET /warranties` nhận `q` (mã BH / mã phiếu / serial / tên khách) và `validOnly` (chưa có lọc `status`). `/public/warranty-check`: giới hạn **10 lần/phút/IP** (Redis, quá hạn → `429`), `keyword` ≥ 4 ký tự, chỉ trả model + serial đã che + thời hạn – không có dữ liệu cá nhân. Khách (C²) chỉ xem/tạo yêu cầu trên bảo hành của chính mình, ngoài phạm vi → `404`; KTV không truy cập được. Tạo yêu cầu: bảo hành phải còn hạn, chưa bị hủy và không có yêu cầu `SUBMITTED`/`ACCEPTED` đang mở (`409`). `accept` nhận thêm `priority` (mặc định `HIGH`), mở phiếu sửa mới `warrantyRepair=true`; khi phiếu đó được bàn giao, yêu cầu tự chuyển `ACCEPTED → RESOLVED`. `WarrantyDetailResponse = { warranty, claims[], canClaim }`.

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/public/warranty-check?keyword=` | P (rate limit) | Tra cứu tối thiểu theo mã BH / mã phiếu / serial |
| GET | `/warranties?q=&status=&validOnly=&page=` | A S | Danh sách |
| GET | `/warranties/lookup?keyword=` | A S | Tra cứu đầy đủ |
| GET | `/warranties/{id}` | A S C² | Chi tiết + danh sách claim |
| PATCH | `/warranties/{id}/void` | A | Hủy bảo hành `{ reason }` |
| GET | `/me/warranties` | C | Bảo hành của tôi |
| POST | `/warranties/{id}/claims` | A S C² | Tạo yêu cầu BH `{ issueDescription }` (409 nếu hết hạn/void) |
| GET | `/warranty-claims?status=&page=` | A S | Danh sách yêu cầu BH |
| POST | `/warranty-claims/{id}/accept` | A S | → tạo phiếu bảo hành; body `{ technicianId, deviceCondition, note }` |
| POST | `/warranty-claims/{id}/reject` | A S | `{ reason }` |

```json
// PublicWarrantyCheckResponse
{ "warrantyCode": "WR-2026-000001", "deviceModel": "iPhone 13", "serialMasked": "3567********131",
  "startDate": "2026-11-12", "endDate": "2027-02-12", "valid": true, "daysRemaining": 92 }
// WarrantyResponse
{ "id": 1, "code": "WR-2026-000001", "repairOrderId": 123, "repairOrderCode": "RO-2026-000123",
  "customerId": 10, "customerName": "...", "device": { DeviceSummary },
  "startDate": "2026-11-12", "endDate": "2027-02-12", "months": 3, "terms": "...",
  "status": "ACTIVE", "valid": true, "daysRemaining": 92, "createdAt": "..." }
// WarrantyClaimResponse
{ "id": 1, "code": "WC-2026-000001", "warrantyId": 1, "warrantyCode": "WR-2026-000001",
  "issueDescription": "...", "status": "ACCEPTED", "resolutionNote": null,
  "repairOrderId": 150, "repairOrderCode": "RO-2026-000150",
  "createdByName": "...", "handledByName": "...", "createdAt": "...", "resolvedAt": null }
```

## 11. Notifications

**Đã hiện thực (Mốc 7).** Thông báo được sinh từ domain event **sau khi transaction commit** (`@TransactionalEventListener(AFTER_COMMIT)`), lưu DB trong transaction riêng rồi đẩy qua STOMP; người thực hiện hành động không nhận thông báo của chính mình. Người nhận: báo giá gửi → khách; khách duyệt/từ chối → KTV + nhân viên tiếp nhận phiếu; hoàn thành → khách + nhân viên; đổi trạng thái khác → khách; phân công → KTV; yêu cầu online mới / yêu cầu bảo hành mới → STAFF; tồn kho thấp → ADMIN + STAFF. WebSocket: CONNECT thiếu/sai token hoặc token đã thu hồi → bị từ chối; chỉ được SUBSCRIBE `/user/**` (không nghe trộm hàng đợi người khác).

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/notifications?unreadOnly=&page=` | A S T C | Thông báo của tôi |
| GET | `/notifications/unread-count` | A S T C | `{ "count": 3 }` |
| PATCH | `/notifications/{id}/read` | A S T C | Đánh dấu đã đọc (chỉ của mình) |
| PATCH | `/notifications/read-all` | A S T C | Đọc tất cả |

```json
// NotificationResponse  (cũng là payload đẩy qua WebSocket)
{ "id": 77, "type": "QUOTATION_SENT", "title": "Báo giá mới",
  "message": "Phiếu RO-2026-000123 có báo giá 2.800.000₫ chờ bạn xác nhận",
  "referenceType": "REPAIR_ORDER", "referenceId": 123, "read": false, "createdAt": "..." }
```
`type`: `REPAIR_STATUS_CHANGED, QUOTATION_SENT, QUOTATION_APPROVED, QUOTATION_REJECTED, REPAIR_ASSIGNED, REPAIR_COMPLETED, LOW_STOCK, REPAIR_REQUEST_CREATED, WARRANTY_CLAIM_CREATED`.

**WebSocket**: kết nối `ws(s)://<host>/ws`, frame CONNECT kèm header `Authorization: Bearer <token>`; subscribe `/user/queue/notifications`.

## 12. Dashboard & Reports

**Đã hiện thực (Mốc 7).** Số liệu tính bằng SQL tổng hợp (không tải entity), mốc ngày theo múi giờ `Asia/Ho_Chi_Minh`. `from`/`to` mặc định 30 ngày gần nhất; `to < from` hoặc khoảng > 366 ngày → `400`. Doanh thu = tổng `final_amount` của phiếu `DELIVERED` theo ngày bàn giao. `/dashboard/admin` được cache Redis 60 giây (key `from:to`) và bị xóa khi có sự kiện nghiệp vụ; `StaffDashboardResponse` có thêm `openWarrantyClaims`. `TechnicianStat = { technicianId, fullName, completedCount, activeCount, avgHoursToComplete }`.

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/dashboard/admin?from=&to=` | A | KPI + chuỗi doanh thu theo ngày + phân bố trạng thái + top linh kiện + tồn thấp |
| GET | `/dashboard/staff` | A S | KPI quầy + danh sách việc cần xử lý |
| GET | `/dashboard/technician` | T | KPI KTV + việc ưu tiên |
| GET | `/dashboard/customer` | C | KPI khách |
| GET | `/reports/revenue?from=&to=&groupBy=DAY\|MONTH` | A | Doanh thu |
| GET | `/reports/parts-usage?from=&to=&limit=` | A | Linh kiện xuất nhiều nhất |
| GET | `/reports/technician-performance?from=&to=` | A | Số phiếu hoàn thành, thời gian xử lý TB theo KTV |

```json
// AdminDashboardResponse
{ "totalOrders": 1248, "inProgressOrders": 37, "completedOrders": 1102,
  "revenue": 482500000.00,
  "revenueSeries": [ { "date": "2026-11-01", "amount": 12500000.00 } ],
  "statusDistribution": [ { "status": "REPAIRING", "count": 12 } ],
  "topParts": [ { "partId": 7, "partName": "...", "quantity": 25 } ],
  "lowStockParts": [ { "id": 7, "sku": "...", "name": "...", "quantityOnHand": 1, "minStockLevel": 3 } ] }
// StaffDashboardResponse
{ "newOrders": 5, "pendingRequests": 3, "waitingConfirmation": 4, "readyForDelivery": 2,
  "todo": [ RepairOrderSummaryResponse ] }
// TechnicianDashboardResponse
{ "assigned": 3, "inProgress": 4, "completedThisMonth": 21, "priorityTasks": [ RepairOrderSummaryResponse ] }
// CustomerDashboardResponse
{ "deviceCount": 2, "activeOrders": 1, "pendingQuotations": 1, "activeWarranties": 1,
  "activeOrderList": [ RepairOrderSummaryResponse ] }
```

## 13. Hệ thống

| Path | Mô tả |
|---|---|
| `/actuator/health` | Healthcheck (public, không lộ chi tiết) |
| `/v3/api-docs`, `/swagger-ui.html` | OpenAPI (bật ở dev; production có thể tắt bằng biến môi trường) |


## Bổ sung V9 – nhóm linh kiện, ảnh linh kiện, bảo hành theo từng dòng (TD-76, TD-77)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/part-categories` | ADMIN, STAFF, TECHNICIAN | Danh mục nhóm linh kiện: `code, name, deviceTypes[], defaultWarrantyMonths, warrantyScope, exclusions, active` |
| POST | `/part-categories` | ADMIN | Thêm nhóm (`code` chữ IN HOA, số, `_`) |
| PUT | `/part-categories/{id}` | ADMIN | Sửa tên / loại thiết bị / bảo hành mặc định (0–120 tháng) / phạm vi / điều kiện từ chối (`version` bắt buộc) |
| GET | `/parts?categoryId=&deviceType=` | ADMIN, STAFF, TECHNICIAN | Lọc theo nhóm và loại thiết bị (linh kiện dùng chung luôn hiện) |
| POST/PUT | `/parts` | ADMIN, STAFF | Bắt buộc `categoryId`, `grade` (OEM / ORIGINAL_USED / AFTERMARKET / GENERIC); tuỳ chọn `deviceType`, `brand`, `compatibleModels`, `warrantyMonths` (null = theo nhóm). Nhóm phải áp dụng cho `deviceType` |
| PUT | `/parts/{id}/image` | ADMIN, STAFF | Ảnh linh kiện (multipart `file`, ≤ 2 MB, JPEG/PNG/WebP theo chữ ký file) |
| DELETE | `/parts/{id}/image` | ADMIN, STAFF | Xoá ảnh (quay về ảnh mặc định của nhóm) |
| GET | `/parts/{id}/image` | Mọi người đã đăng nhập | Ảnh linh kiện, cache riêng 7 ngày, client gắn `?v=imageUpdatedAt` |
| GET | `/repair-orders/{id}/warranty-suggestions` | ADMIN, STAFF | Dòng bảo hành gợi ý khi bàn giao: linh kiện trong báo giá đã duyệt + số tháng đã báo khách |

Thay đổi trên API có sẵn:
- `PartResponse` thêm `categoryId/Code/Name, deviceType, grade, brand, compatibleModels, warrantyMonths, effectiveWarrantyMonths, imageUpdatedAt` (bỏ `category` chữ tự do và `GET /parts/categories`).
- Dòng báo giá (`QuotationItemResponse`) thêm `partGrade, warrantyMonths` – lưu cố định lúc lập báo giá.
- `POST /repair-orders/{id}/deliver` thêm `warrantyItems: [{partId?, description, quantity?, months}]` (partId null = công sửa; months 0 = bỏ dòng; linh kiện phải có trong báo giá đã duyệt). Không gửi → tự lấy gợi ý + dòng "Công sửa chữa" `warrantyMonths` tháng.
- `WarrantyResponse.items[]`: `description, partGrade, quantity, months, endDate, valid, daysRemaining, exclusions`; `months/endDate` của phiếu = dòng dài nhất (tối đa 120 tháng).
- `POST /warranties/{id}/claims` thêm `warrantyItemId` (bắt buộc khi phiếu có > 1 dòng còn hạn; dòng phải còn hạn). `WarrantyClaimResponse` thêm `warrantyItemId, warrantyItemDescription`.
- `GET /public/warranty-check` thêm `items: [{description, endDate, valid}]` (không có thông tin cá nhân).

### Bổ sung – tồn đầu kỳ & sổ kho đầy đủ
- `POST /parts` nhận thêm `initialQuantity` (0–100000) và `supplierName`: tạo linh kiện kèm **một dòng sổ kho IMPORT "Tồn đầu kỳ"** (giá = `costPrice`) trong cùng transaction. Sửa linh kiện bỏ qua 2 trường này – tồn chỉ đổi qua Nhập kho / Kiểm kê.
- `GET /inventory/summary?partId=&type=&from=&to=` (ADMIN, STAFF): `importQuantity/Value, exportQuantity/Value, returnQuantity/Value, adjustmentQuantity, transactionCount, stockQuantity, stockValue` (giá trị = số lượng × giá nhập ghi trên từng dòng; tồn × giá nhập gần nhất).
- `TransactionResponse` thêm `partUnit, partCategoryCode, partImageUpdatedAt` (hiển thị ảnh linh kiện trong sổ kho).
- `GET /part-categories` thêm `partCount, stockQuantity` (số linh kiện đang kinh doanh và tổng tồn của nhóm); tham số tùy chọn `deviceType` → chỉ đếm linh kiện của loại thiết bị đó và linh kiện dùng chung (`deviceType` rỗng), cùng quy tắc với `GET /parts?deviceType=`.
