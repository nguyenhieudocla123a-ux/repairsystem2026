import { Tag } from 'antd'

export interface StatusOption {
  label: string
  /** Preset màu của AntD Tag (blue, gold, green...) */
  color: string
}

export type StatusConfig<T extends string> = Record<T, StatusOption>

export interface StatusTagProps<T extends string> {
  value: T
  config: StatusConfig<T>
  /** md: dùng trong tiêu đề trang (chữ 14px) */
  size?: 'sm' | 'md'
}

/**
 * Hiển thị một giá trị enum với nhãn tiếng Việt + màu tra từ bảng cấu hình.
 * Luôn có nhãn chữ và chấm tròn → không truyền đạt thông tin chỉ bằng màu (WCAG 1.4.1).
 */
export function StatusTag<T extends string>({ value, config, size = 'sm' }: StatusTagProps<T>) {
  const option = config[value] ?? { label: value, color: 'default' }
  return (
    <Tag color={option.color} className={`m-0 inline-flex items-center gap-1.5 font-medium ${size === 'md' ? 'px-2.5 py-0.5 text-sm' : ''}`}>
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
      {option.label}
    </Tag>
  )
}
