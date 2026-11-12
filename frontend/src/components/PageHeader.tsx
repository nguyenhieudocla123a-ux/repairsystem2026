import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  extra?: ReactNode
}

/** Tiêu đề trang (một <h1> mỗi trang) + mô tả + hành động. Breadcrumb do AppLayout hiển thị. */
export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 text-xl leading-7 font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 mb-0 text-sm text-text-secondary">{description}</p>}
      </div>
      {extra && <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 overflow-x-auto sm:shrink-0">{extra}</div>}
    </div>
  )
}
