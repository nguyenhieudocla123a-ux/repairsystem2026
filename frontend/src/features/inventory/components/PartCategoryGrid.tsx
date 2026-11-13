import { CheckOutlined, DownOutlined, PlusOutlined, SafetyCertificateOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Segmented } from 'antd'
import { useState } from 'react'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import type { DeviceType } from '@/types/enums'
import { categoryImage } from '../constants/categoryImages'
import type { PartCategory } from '../inventoryApi'

const COLLAPSED = 12

type View = 'all' | 'stocked' | 'empty'

/**
 * Lưới các loại linh kiện có ảnh: số linh kiện đang kinh doanh, tổng tồn, bảo hành mặc định của loại.
 * Số liệu do backend tính theo loại thiết bị đang lọc (linh kiện riêng của thiết bị + linh kiện dùng chung).
 * Bấm thẻ để lọc danh sách; nút + mở form thêm linh kiện đã điền sẵn nhóm – không tạo dữ liệu giả.
 */
export function PartCategoryGrid({ categories, deviceType, selectedId, canManage, onSelect, onAdd }: {
  categories: PartCategory[]
  deviceType?: DeviceType
  selectedId?: number
  canManage: boolean
  onSelect: (id: number | undefined) => void
  onAdd: (category: PartCategory) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<View>('all')
  const forDevice = categories.filter((c) => c.active && (!deviceType || c.deviceTypes.includes(deviceType)))
  const stocked = forDevice.filter((c) => c.partCount > 0).length
  const list = forDevice.filter((c) => view === 'all' || (view === 'stocked' ? c.partCount > 0 : c.partCount === 0))
  const shown = expanded ? list : list.slice(0, COLLAPSED)

  return (
    <section aria-labelledby="part-category-heading" className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="part-category-heading" className="m-0 text-base font-semibold text-text">
            Các loại linh kiện{deviceType && <span className="font-normal text-text-secondary"> cho {DEVICE_TYPE_LABELS[deviceType]}</span>}
          </h2>
          <p className="m-0 text-sm text-text-secondary">
            <span className="tabular-nums">{stocked}/{forDevice.length}</span> loại đang có linh kiện trong kho
          </p>
        </div>
        <Segmented<View>
          size="small"
          value={view}
          onChange={(v) => { setView(v); setExpanded(false) }}
          options={[
            { value: 'all', label: `Tất cả (${forDevice.length})` },
            { value: 'stocked', label: `Đang có (${stocked})` },
            { value: 'empty', label: `Chưa có (${forDevice.length - stocked})` },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
          {view === 'empty' ? 'Loại linh kiện nào cũng đã có hàng trong kho.' : 'Chưa có loại linh kiện nào có hàng.'}
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {shown.map((c) => {
            const selected = c.id === selectedId
            const empty = c.partCount === 0
            return (
              <li
                key={c.id}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgb(15_23_42/0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                  selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Phần trên: bấm để lọc danh sách theo loại */}
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Lọc theo ${c.name}`}
                  onClick={() => onSelect(selected ? undefined : c.id)}
                  className="focus-ring flex w-full cursor-pointer flex-col border-0 bg-transparent p-0 text-left"
                >
                  <span className="relative block aspect-[16/10] w-full overflow-hidden bg-bg">
                    <img
                      src={categoryImage(c.code)}
                      alt=""
                      loading="lazy"
                      className={`size-full object-cover transition-[transform,filter,opacity] duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none ${empty ? 'opacity-60 grayscale' : ''}`}
                    />
                    {selected && (
                      <span aria-hidden="true" className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white shadow">
                        <CheckOutlined />
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 min-h-10 px-3 pt-2.5 text-sm leading-5 font-medium text-text" title={c.name}>{c.name}</span>
                  <span className="flex items-center gap-1.5 px-3 pt-1 pb-2.5 text-xs text-text-muted">
                    <SafetyCertificateOutlined aria-hidden="true" />
                    {c.defaultWarrantyMonths === 0 ? 'Không bảo hành' : `Bảo hành ${c.defaultWarrantyMonths} tháng`}
                  </span>
                </button>
                {/* Phần dưới: số liệu bên trái, nút thêm bên phải – tách khỏi tên, không đè lên chữ */}
                <div className="mx-3 mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-border/70 pt-2 pb-2.5">
                  {empty ? (
                    <span className="text-xs text-text-muted">Chưa có linh kiện</span>
                  ) : (
                    <span className="min-w-0 truncate text-xs text-text-secondary">
                      <span className="tabular-nums text-sm font-semibold text-text">{c.partCount}</span> mã
                      <span aria-hidden="true" className="mx-1.5 text-border">|</span>
                      tồn <span className="tabular-nums text-sm font-semibold text-text">{c.stockQuantity}</span>
                    </span>
                  )}
                  {canManage && (
                    <Button
                      size="small"
                      type={empty ? 'primary' : 'default'}
                      shape="circle"
                      icon={<PlusOutlined />}
                      aria-label={`Thêm linh kiện ${c.name}`}
                      title={`Thêm linh kiện ${c.name}`}
                      className="shrink-0"
                      onClick={() => onAdd(c)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > COLLAPSED && (
        <div className="mt-3 text-center">
          <Button type="link" icon={expanded ? <UpOutlined /> : <DownOutlined />} onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Thu gọn' : `Xem tất cả ${list.length} loại`}
          </Button>
        </div>
      )}
    </section>
  )
}
