/**
 * Nguồn token duy nhất của design system (docs/design-system.md §2).
 * AntD nhận token qua ConfigProvider và xuất ra CSS variables --ant-*; Tailwind đọc lại chúng trong index.css.
 */
export const colors = {
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',
  sidebarBg: '#0F172A',
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
