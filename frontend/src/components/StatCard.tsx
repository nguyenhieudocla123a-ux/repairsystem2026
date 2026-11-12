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
  /** Có onClick → thẻ render thành <button> (truy cập được bằng bàn phím). */
  onClick?: () => void
}

const base = '@container flex w-full items-start gap-4 rounded-card border border-border bg-surface p-5 text-left shadow-card'

export function StatCard({ label, value, icon, tone = 'primary', hint, loading = false, onClick }: StatCardProps) {
  const content = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-xl ${toneClasses[tone]}`}
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs leading-5 font-medium text-text-secondary">{label}</span>
        {loading ? (
          <Skeleton.Input active size="small" className="mt-2" />
        ) : (
          // Không truncate (số tiền bị cắt → đọc sai). Container query: cỡ chữ theo độ rộng của chính thẻ.
          <span className="mt-1 text-xl leading-7 font-bold break-words text-text tabular-nums @[17rem]:text-2xl @[17rem]:leading-8 @[20rem]:text-[28px] @[20rem]:leading-9">
            {value}
          </span>
        )}
        {hint && !loading && <span className="mt-1 text-xs text-text-muted">{hint}</span>}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-busy={loading}
        className={`${base} focus-ring cursor-pointer transition-colors duration-150 hover:border-primary/40 hover:shadow-overlay`}
      >
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
