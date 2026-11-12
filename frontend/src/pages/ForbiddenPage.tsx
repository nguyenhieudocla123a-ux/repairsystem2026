import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <Result
      status="403"
      title="Bạn không có quyền truy cập"
      subTitle="Trang này không dành cho vai trò của bạn. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn."
      extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Về trang tổng quan</Button>}
    />
  )
}
