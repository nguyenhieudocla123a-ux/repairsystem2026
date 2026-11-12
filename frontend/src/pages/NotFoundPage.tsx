import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { LostDeviceIllustration } from '@/components/illustrations'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <LostDeviceIllustration className="h-44 w-auto" />
      <h1 className="mt-6 mb-2 text-2xl font-semibold text-text">Không tìm thấy trang</h1>
      <p className="m-0 max-w-sm text-text-secondary">Đường dẫn không tồn tại hoặc đã bị thay đổi. Hãy quay lại trang tổng quan để tiếp tục.</p>
      <Button type="primary" size="large" className="mt-6" onClick={() => navigate('/dashboard')}>
        Về trang tổng quan
      </Button>
    </div>
  )
}
