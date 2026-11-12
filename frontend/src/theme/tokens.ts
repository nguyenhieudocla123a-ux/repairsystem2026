/**
 * Nguồn token duy nhất của design system (docs/design-system.md §2).
 * AntD nhận token qua ConfigProvider và xuất ra CSS variables --ant-*; Tailwind đọc lại chúng trong index.css.
 */
/**
 * Bảng màu "B2B Service" (ui-ux-pro-max): navy chuyên nghiệp + xanh dương cho hành động chính.
 * primary #0369A1 đạt 5,9:1 trên nền trắng (dùng được cho chữ/link), accent hổ phách chỉ để nhấn (không dùng cho chữ).
 */
export const colors = {
  primary: '#0369A1',
  primaryHover: '#075985',
  accent: '#F59E0B',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  success: '#15803D',
  warning: '#B45309',
  error: '#DC2626',
  info: '#0E7490',
  sidebarBg: '#0B1220',
  sidebarText: '#CBD5E1',
  sidebarTextActive: '#FFFFFF',
} as const

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

/** Cặp nền nhạt / chữ đậm cho ô icon, badge theo ngữ nghĩa. Class Tailwind khai báo tĩnh để Tailwind quét được. */
export const toneClasses: Record<Tone, string> = {
  primary: 'bg-tone-primary-bg text-tone-primary-fg',
  success: 'bg-tone-success-bg text-tone-success-fg',
  warning: 'bg-tone-warning-bg text-tone-warning-fg',
  error: 'bg-tone-error-bg text-tone-error-fg',
  info: 'bg-tone-info-bg text-tone-info-fg',
  neutral: 'bg-tone-neutral-bg text-tone-neutral-fg',
}

export const radius = { sm: 6, md: 8, lg: 12 } as const

export const fontFamily =
  "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
