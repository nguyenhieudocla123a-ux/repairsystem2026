import { formatMoney } from '@/utils/format'

export function MoneyText({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  return <span className={`tabular-nums whitespace-nowrap ${className}`}>{formatMoney(value)}</span>
}
