import { ReloadOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { getErrorMessage } from '@/utils/errors'

export interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

/** Lỗi tải dữ liệu. role="alert" để trình đọc màn hình thông báo ngay. */
export function ErrorState({ error, onRetry, title = 'Không tải được dữ liệu' }: ErrorStateProps) {
  return (
    <div role="alert">
      <Result
        status="error"
        title={<span className="text-base font-semibold">{title}</span>}
        subTitle={getErrorMessage(error)}
        extra={
          onRetry && (
            <Button icon={<ReloadOutlined />} onClick={onRetry}>
              Thử lại
            </Button>
          )
        }
      />
    </div>
  )
}
