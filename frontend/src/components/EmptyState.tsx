import { Empty } from 'antd'
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title?: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ title = 'Chưa có dữ liệu', description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-14'}`}>
      <Empty
        image={compact ? Empty.PRESENTED_IMAGE_SIMPLE : Empty.PRESENTED_IMAGE_DEFAULT}
        description={
          <span className="flex flex-col gap-1">
            <span className="text-base font-semibold text-text">{title}</span>
            {description && <span className="max-w-md text-sm text-text-secondary">{description}</span>}
          </span>
        }
      >
        {action}
      </Empty>
    </div>
  )
}
