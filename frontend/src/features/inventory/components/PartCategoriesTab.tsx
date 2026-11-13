import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, type TableProps } from 'antd'
import { useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_OPTIONS } from '@/features/devices/devicesApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import type { DeviceType } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { categoryImage } from '../constants/categoryImages'
import { inventoryApi, type PartCategory } from '../inventoryApi'

const monthsText = (m: number) => (m === 0 ? 'Không bảo hành' : `${m} tháng`)

/** Sửa / thêm nhóm linh kiện (ADMIN). Đổi số tháng chỉ áp dụng cho báo giá & bảo hành cấp SAU khi lưu. */
function CategoryModal({ category, onClose, onSaved }: { category?: PartCategory; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp()
  const [code, setCode] = useState(category?.code ?? '')
  const [name, setName] = useState(category?.name ?? '')
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>(category?.deviceTypes ?? ['PHONE'])
  const [months, setMonths] = useState<number | null>(category?.defaultWarrantyMonths ?? 6)
  const [scope, setScope] = useState(category?.warrantyScope ?? '')
  const [exclusions, setExclusions] = useState(category?.exclusions ?? '')
  const [active, setActive] = useState(category?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || deviceTypes.length === 0 || months === null || (!category && !code.trim())) {
      return setError('Vui lòng nhập đủ mã, tên, loại thiết bị và số tháng bảo hành')
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        code: category ? undefined : code.trim().toUpperCase(),
        name: name.trim(),
        deviceTypes,
        defaultWarrantyMonths: months,
        warrantyScope: scope || undefined,
        exclusions: exclusions || undefined,
        active,
        version: category?.version,
      }
      if (category) await inventoryApi.updateCategory(category.id, body)
      else await inventoryApi.createCategory(body)
      message.success(category ? `Đã cập nhật nhóm ${name}` : `Đã thêm nhóm ${name}`)
      onSaved()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={category ? `Nhóm ${category.name}` : 'Thêm nhóm linh kiện'} okText="Lưu" cancelText="Hủy" onOk={submit} onCancel={onClose} confirmLoading={saving} maskClosable={false}>
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <div className="grid gap-x-4 sm:grid-cols-[1fr_2fr]">
          <Form.Item label="Mã nhóm" required htmlFor="cat-code" extra={category ? 'Không đổi được' : 'VD: SCREEN_TV'}>
            <Input id="cat-code" value={code} disabled={!!category} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} />
          </Form.Item>
          <Form.Item label="Tên nhóm" required htmlFor="cat-name">
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Item>
        </div>
        <Form.Item label="Dùng cho thiết bị" required htmlFor="cat-types">
          <Select id="cat-types" mode="multiple" value={deviceTypes} onChange={setDeviceTypes} options={DEVICE_TYPE_OPTIONS} />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-[1fr_auto]">
          <Form.Item label="Bảo hành mặc định" required htmlFor="cat-months" extra="0 = không bảo hành. Áp dụng cho báo giá lập sau khi lưu.">
            <InputNumber id="cat-months" className="!w-full" min={0} max={120} value={months} onChange={setMonths} addonAfter="tháng" />
          </Form.Item>
          <Form.Item label="Đang dùng" htmlFor="cat-active">
            <Switch id="cat-active" checked={active} onChange={setActive} />
          </Form.Item>
        </div>
        <Form.Item label="Phạm vi bảo hành" htmlFor="cat-scope">
          <Input.TextArea id="cat-scope" rows={2} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Lỗi được bảo hành, VD: lỗi hiển thị, cảm ứng" />
        </Form.Item>
        <Form.Item label="Không bảo hành khi" htmlFor="cat-excl">
          <Input.TextArea id="cat-excl" rows={2} value={exclusions} onChange={(e) => setExclusions(e.target.value)} placeholder="VD: rơi vỡ, vào nước, chảy mực" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/** Danh mục nhóm linh kiện + bảo hành mặc định. Mọi nhân viên xem được, chỉ ADMIN sửa. */
export function PartCategoriesTab({ canEdit }: { canEdit: boolean }) {
  const { data, loading, error, reload } = useAsyncData(() => inventoryApi.categories(), [])
  const [deviceType, setDeviceType] = useState<DeviceType>()
  const [dialog, setDialog] = useState<{ category?: PartCategory } | null>(null)

  const columns: TableProps<PartCategory>['columns'] = [
    {
      title: 'Nhóm',
      render: (_, c) => (
        <div className={`flex items-center gap-3 ${c.active ? '' : 'opacity-60'}`}>
          <img src={categoryImage(c.code)} alt="" aria-hidden="true" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
          <div>
            <div className="font-medium text-text">{c.name} {!c.active && <Tag className="ml-1">Ngừng dùng</Tag>}</div>
            <div className="font-mono text-xs text-text-muted">{c.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Thiết bị',
      dataIndex: 'deviceTypes',
      responsive: ['lg'],
      render: (types: DeviceType[]) => <div className="flex flex-wrap gap-1">{types.map((t) => <Tag key={t}>{DEVICE_TYPE_LABELS[t]}</Tag>)}</div>,
    },
    {
      title: 'Bảo hành',
      dataIndex: 'defaultWarrantyMonths',
      align: 'right',
      render: (m: number) => <span className={`tabular-nums font-semibold ${m === 0 ? 'text-text-muted' : 'text-text'}`}>{monthsText(m)}</span>,
    },
    { title: 'Phạm vi bảo hành', dataIndex: 'warrantyScope', responsive: ['md'], render: (v: string | null) => <span className="text-sm text-text-secondary">{v ?? '—'}</span> },
    { title: 'Không bảo hành khi', dataIndex: 'exclusions', responsive: ['xl'], render: (v: string | null) => <span className="text-sm text-text-secondary">{v ?? '—'}</span> },
    ...(canEdit
      ? [{
          title: <span className="sr-only">Thao tác</span>,
          key: 'edit',
          width: 56,
          render: (_: unknown, c: PartCategory) => <Button type="text" icon={<EditOutlined />} aria-label={`Sửa nhóm ${c.name}`} onClick={() => setDialog({ category: c })} />,
        }]
      : []),
  ]

  if (error && !loading) return <ErrorState error={error} onRetry={reload} />
  return (
    <>
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center">
        <Select<DeviceType> aria-label="Lọc loại thiết bị" placeholder="Mọi thiết bị" allowClear value={deviceType} onChange={setDeviceType}
          options={DEVICE_TYPE_OPTIONS} className="md:w-48" />
        <span className="text-sm text-text-secondary">
          Thời hạn mặc định theo mức phổ biến của thị trường – cửa hàng tự chỉnh theo chính sách riêng. Báo giá và bảo hành đã cấp không bị đổi.
        </span>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} className="md:ml-auto" onClick={() => setDialog({})}>Thêm nhóm</Button>}
      </div>
      <Table<PartCategory>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={(data ?? []).filter((c) => !deviceType || c.deviceTypes.includes(deviceType))}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
      {dialog && <CategoryModal key={dialog.category?.id ?? 'new'} category={dialog.category} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload() }} />}
    </>
  )
}
