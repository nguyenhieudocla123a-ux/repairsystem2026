import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

/**
 * Đích quay về sau khi đăng nhập Google/Facebook thành công. Backend đã đặt cookie refresh token; lúc tải trang,
 * app tự khôi phục phiên (bootstrapSession) và GuestRoute chuyển thẳng vào /dashboard.
 * Trang này chỉ hiện khi khôi phục phiên thất bại (cookie bị chặn, hết hạn...).
 */
export function OAuthCallbackPage() {
  return (
    <Result
      status="warning"
      title="Chưa đăng nhập được"
      subTitle="Không khôi phục được phiên đăng nhập. Vui lòng thử lại."
      extra={
        <Link to="/login">
          <Button type="primary">Quay lại đăng nhập</Button>
        </Link>
      }
    />
  )
}
