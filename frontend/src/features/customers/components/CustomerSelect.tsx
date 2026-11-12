import { Select, Spin } from 'antd'
import { useState } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { customersApi, type CustomerResponse } from '../customersApi'

export interface CustomerSelectProps {
  value?: number
  onChange?: (id: number | undefined, customer?: CustomerResponse) => void
  placeholder?: string
  /** Khách đang chọn (để hiển thị nhãn khi chưa tìm kiếm). */
  initialCustomer?: CustomerResponse
  id?: string
}

/** Ô chọn khách hàng tìm kiếm phía server (theo tên, SĐT, mã) – không tải toàn bộ danh sách về trình duyệt. */
export function CustomerSelect({ value, onChange, placeholder = 'Tìm theo tên, SĐT, mã KH...', initialCustomer, id }: CustomerSelectProps) {
  const [keyword, setKeyword] = useState('')
  const q = useDebouncedValue(keyword, 300)
  const { data, loading } = useAsyncData(() => customersApi.search({ q, size: 10 }), [q])

  const options = [...(data?.content ?? [])]
  if (initialCustomer && !options.some((c) => c.id === initialCustomer.id)) options.unshift(initialCustomer)

  return (
    <Select<number>
      id={id}
      showSearch={{ filterOption: false, onSearch: setKeyword }}
      allowClear
      value={value}
      placeholder={placeholder}
      notFoundContent={loading ? <Spin size="small" /> : 'Không tìm thấy khách hàng'}
      onChange={(v) => onChange?.(v, options.find((c) => c.id === v))}
      options={options.map((c) => ({
        value: c.id,
        label: (
          <span className="flex justify-between gap-3">
            <span className="truncate">{c.fullName}</span>
            <span className="shrink-0 text-text-muted tabular-nums">{c.phone}</span>
          </span>
        ),
      }))}
      className="w-full"
    />
  )
}
