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

/** Rút gọn tiền trên trục: 2.500.000 → "2,5 tr". */
export function compactMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return `${formatNumber(Math.round(v / 100_000_000) / 10)} tỷ`
  if (Math.abs(v) >= 1_000_000) return `${formatNumber(Math.round(v / 100_000) / 10)} tr`
  if (Math.abs(v) >= 1_000) return `${formatNumber(Math.round(v / 1_000))} k`
  return formatNumber(v)
}
