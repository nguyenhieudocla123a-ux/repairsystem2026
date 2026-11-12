import { Select } from 'antd'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usersApi } from '../usersApi'

export interface TechnicianSelectProps {
  value?: number
  onChange?: (id: number | undefined) => void
  allowClear?: boolean
  placeholder?: string
  id?: string
}

/** Chọn KTV, hiển thị số việc đang xử lý để phân công đều (GET /users/technicians). */
export function TechnicianSelect({ value, onChange, allowClear = true, placeholder = 'Chọn kỹ thuật viên', id }: TechnicianSelectProps) {
  const { data, loading } = useAsyncData(() => usersApi.technicians(), [])
  return (
    <Select<number>
      id={id}
      value={value}
      onChange={(v) => onChange?.(v)}
      allowClear={allowClear}
      loading={loading}
      placeholder={placeholder}
      showSearch={{ optionFilterProp: 'name' }}
      options={(data ?? []).map((t) => ({
        value: t.id,
        name: t.fullName,
        label: (
          <span className="flex justify-between gap-3">
            <span>{t.fullName}</span>
            <span className="text-text-muted">{t.activeTaskCount} việc đang làm</span>
          </span>
        ),
      }))}
      className="w-full"
    />
  )
}
