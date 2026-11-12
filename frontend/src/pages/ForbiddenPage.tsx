import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { LockedIllustration } from '@/components/illustrations'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <LockedIllustration className="h-40 w-auto" />
      <h1 className="mt-6 mb-2 text-2xl font-semibold text-text">Bạn không có quyền truy cập</h1>
      <p className="m-0 max-w-md text-text-secondary">Trang này không dành cho vai trò của bạn. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.</p>
      <Button type="primary" size="large" className="mt-6" onClick={() => navigate('/dashboard')}>
        Về trang tổng quan
      </Button>
    </div>
  )
}
