-- Khách tự đăng ký chỉ cần email + mật khẩu (+ mã xác nhận email); họ tên, SĐT bổ sung sau ở trang hồ sơ.
-- SĐT trống = hồ sơ chưa hoàn tất → các thao tác dịch vụ (gửi yêu cầu sửa, thêm thiết bị, xác nhận báo giá,
-- yêu cầu bảo hành) bị chặn tới khi khách cập nhật. UNIQUE vẫn giữ: PostgreSQL cho phép nhiều NULL.
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;
