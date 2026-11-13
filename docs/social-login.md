# Đăng nhập / đăng ký bằng Google và Facebook

RepairFlow dùng luồng **OAuth2 Authorization Code** phía backend (Spring Security `oauth2-client`):
client secret chỉ nằm ở server, frontend không nhúng SDK của Google/Facebook. Quyết định: TD-75.

## 1. Luồng hoạt động

```
Nút "Google" (frontend)
  → GET /api/v1/auth/oauth2/authorize/google          Spring tạo state, lưu yêu cầu vào Redis (10 phút), chuyển sang Google
  → Google: người dùng đăng nhập + đồng ý
  → GET /api/v1/auth/oauth2/callback/google?code&state  Spring đổi code lấy thông tin (sub, email, email_verified, name)
  → SocialLoginService
       ├─ đã liên kết (provider + id)                     → cookie refresh token → /oauth/callback → vào /dashboard
       ├─ email trùng tài khoản KHÁCH + Google đã xác minh → liên kết rồi đăng nhập như trên
       ├─ email của tài khoản nội bộ                       → /login?oauthError=STAFF_ACCOUNT
       └─ người mới                                       → cookie phiên đăng ký chờ (15 phút) → /register/social
            → POST /auth/register/send-code (mã 6 số gửi về email, lưu Redis 10 phút, 60 giây mới gửi lại)
            → POST /auth/oauth2/complete { fullName, phone, address?, verificationCode }
            → tạo tài khoản CUSTOMER (chưa có mật khẩu) + hồ sơ khách + liên kết → đăng nhập
```

- Token không bao giờ nằm trên URL: phiên đăng nhập đi bằng cookie HttpOnly (`rf_refresh`), phiên đăng ký chờ
  bằng cookie HttpOnly `rf_oauth_signup` (Path `/api/v1/auth/oauth2`).
- Tài khoản tạo qua Google/Facebook **chưa có mật khẩu**: đăng nhập bằng mật khẩu sẽ báo sai; muốn có mật khẩu thì
  dùng "Quên mật khẩu".
- Facebook không trả cờ "email đã xác minh" → không tự liên kết với tài khoản có sẵn (tránh chiếm tài khoản).

## 2. Lấy Client ID / Secret

Chỉ chủ dự án làm được bước này (cần tài khoản Google / Meta của bạn).

**Redirect URI** khai báo ở cả hai nơi (dev):

```
http://localhost:5173/api/v1/auth/oauth2/callback/google
http://localhost:5173/api/v1/auth/oauth2/callback/facebook
```

(Production: thay `http://localhost:5173` bằng `FRONTEND_URL` thật, bắt buộc HTTPS.)

### Google
1. https://console.cloud.google.com → tạo project → **APIs & Services → OAuth consent screen**: loại *External*,
   điền tên ứng dụng, email hỗ trợ; scope `openid`, `email`, `profile`; thêm email của bạn vào *Test users*.
2. **Credentials → Create credentials → OAuth client ID** → *Web application* → thêm *Authorized redirect URI* ở trên.
3. Chép Client ID + Client secret.

### Facebook
1. https://developers.facebook.com → **My Apps → Create app** → loại *Consumer* (hoặc "Authenticate and request data
   from users with Facebook Login").
2. Thêm sản phẩm **Facebook Login → Settings** → *Valid OAuth Redirect URIs*: URI ở trên.
3. **App settings → Basic**: chép App ID + App secret. Quyền `email` và `public_profile` có sẵn ở chế độ Development
   (chỉ tài khoản có vai trò trong app đăng nhập được cho tới khi app được duyệt/Live).

## 3. Cấu hình

Thêm vào `.env` ở thư mục gốc (không commit file này):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

Khởi động lại backend. Bên nào để trống thì nút của bên đó không hiện (`GET /api/v1/auth/oauth2/providers`).

## 4. Gửi mã xác nhận qua Gmail (SMTP)

Chưa cấu hình SMTP thì ở profile dev mã chỉ được in ra log backend. Để mã về hộp thư thật (đã kiểm tra với Gmail):

1. Bật **Xác minh 2 bước** cho tài khoản Google → tạo **Mật khẩu ứng dụng** tại https://myaccount.google.com/apppasswords
   (16 ký tự, bỏ dấu cách).
2. Thêm vào `.env`:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<gmail>
MAIL_PASSWORD=<mật khẩu ứng dụng 16 ký tự>
MAIL_SMTP_AUTH=true
MAIL_STARTTLS=true
MAIL_FROM=RepairFlow <gmail>
```

- `MAIL_FROM` phải có dấu `< >` quanh địa chỉ (thiếu → lỗi "Could not parse mail"; backend nay tự dùng `MAIL_USERNAME`).
- Gmail chỉ gửi dưới tên tài khoản đã đăng nhập SMTP; giới hạn ~500 thư/ngày – đủ cho dev/demo, production nên dùng
  dịch vụ gửi mail chuyên dụng.
