import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Result
        status="404"
        title="Không tìm thấy trang"
        subTitle="Đường dẫn không tồn tại hoặc đã bị thay đổi."
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Về trang tổng quan</Button>}
      />
    </div>
  )
}
