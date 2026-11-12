import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')

const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('vi-VN')

/** 2800000 → "2.800.000 ₫"; null/undefined → "—". */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return moneyFormatter.format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return numberFormatter.format(value)
}

/** ISO-8601 (UTC từ API) → giờ địa phương "12/11/2026 10:30". */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—'
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '—'
}
