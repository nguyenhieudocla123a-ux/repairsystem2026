import { ArrowRightOutlined } from '@ant-design/icons'
import { Skeleton } from 'antd'
import type { ReactNode } from 'react'
import { toneClasses, type Tone } from '@/theme/tokens'

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
  hint?: ReactNode
  loading?: boolean
  /** Có onClick → thẻ render thành <button> (truy cập được bằng bàn phím) + dòng "Xem chi tiết". */
  onClick?: () => void
}

const base = '@container flex w-full flex-col rounded-card border border-border bg-surface p-5 text-left shadow-card'

/**
 * Thẻ chỉ số (KPI): nhãn + ô icon nhỏ ở hàng trên, con số lớn, chú thích phía dưới.
 * Bố cục dọc giữ nhãn trên một dòng kể cả khi lưới 5 cột (thẻ hẹp).
 */
export function StatCard({ label, value, icon, tone = 'primary', hint, loading = false, onClick }: StatCardProps) {
  const content = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm leading-5 font-medium text-text-secondary">{label}</span>
        {icon && (
          <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-base ${toneClasses[tone]}`}>
            {icon}
          </span>
        )}
      </span>
      {loading ? (
        <Skeleton.Input active size="small" className="mt-3" />
      ) : (
        // Không truncate (số tiền bị cắt → đọc sai). Container query: cỡ chữ theo độ rộng của chính thẻ.
        <span className="mt-2 text-2xl leading-8 font-semibold tracking-tight break-words text-text tabular-nums @[16rem]:text-[28px] @[16rem]:leading-9">
          {value}
        </span>
      )}
      {(hint || onClick) && !loading && (
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-text-muted">
          <span>{hint}</span>
          {onClick && (
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
              {/* Thẻ hẹp (lưới 5 cột): chỉ hiện mũi tên, chữ vẫn còn cho trình đọc màn hình */}
              <span className="@max-[15rem]:sr-only">Xem chi tiết</span> <ArrowRightOutlined className="text-[10px]" aria-hidden="true" />
            </span>
          )}
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-busy={loading} className={`${base} rf-card-link focus-ring cursor-pointer`}>
        {content}
      </button>
    )
  }
  return (
    <div className={base} aria-busy={loading}>
      {content}
    </div>
  )
}
