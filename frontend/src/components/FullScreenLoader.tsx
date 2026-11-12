import { Spin } from 'antd'

/** Chỉ dùng cho lần tải đầu (khôi phục phiên). Trong trang dùng Skeleton. */
export function FullScreenLoader({ tip = 'Đang tải...' }: { tip?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg" aria-busy="true">
      <Spin size="large" />
      <span className="text-sm text-text-secondary">{tip}</span>
    </div>
  )
}
