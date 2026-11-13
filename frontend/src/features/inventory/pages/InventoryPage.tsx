import { CameraOutlined, EditOutlined, HistoryOutlined, ImportOutlined, MoreOutlined, PlusOutlined, SearchOutlined, StopOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons'
import { App, Button, Card, Checkbox, Drawer, Dropdown, Input, Select, Table, Tabs, Tag, Tooltip, type MenuProps, type TableProps } from 'antd'
import { useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_OPTIONS } from '@/features/devices/devicesApi'
import type { DeviceType } from '@/types/enums'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/utils/errors'
import { LedgerView } from '../components/LedgerView'
import { PartCategoriesTab } from '../components/PartCategoriesTab'
import { PartCategoryGrid } from '../components/PartCategoryGrid'
import { PartImage } from '../components/PartImage'
import { PartImageModal } from '../components/PartImageModal'
import { PartFormModal, StockModal } from '../components/PartModals'
import { PART_GRADE_CONFIG, inventoryApi, type PartCategory, type PartResponse } from '../inventoryApi'

function PartsTab() {
  const role = useAppSelector((s) => s.auth.user!.role)
  const canManage = role === 'ADMIN' || role === 'STAFF'
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<number>()
  const [deviceType, setDeviceType] = useState<DeviceType>()
  const [lowStock, setLowStock] = useState(false)
  const [dialog, setDialog] = useState<{ kind: 'edit' | 'import' | 'adjust' | 'image' | 'ledger'; part?: PartResponse; preset?: PartCategory } | null>(null)
  const q = useDebouncedValue(keyword)
  // số liệu trên thẻ loại tính theo loại thiết bị đang lọc
  const categories = useAsyncData(() => inventoryApi.categories(deviceType), [deviceType])
  const { data, loading, error, reload } = useAsyncData(
    () => inventoryApi.search({ page, size: 20, q, categoryId, deviceType, lowStock: lowStock || undefined }),
    [page, q, categoryId, deviceType, lowStock],
  )

  const toggleActive = (p: PartResponse) =>
    modal.confirm({
      title: p.active ? `Ngừng kinh doanh ${p.sku}?` : `Mở lại kinh doanh ${p.sku}?`,
      content: p.active ? 'Linh kiện sẽ không xuất hiện khi lập báo giá / xuất kho. Lịch sử kho vẫn được giữ.' : undefined,
      okText: p.active ? 'Ngừng kinh doanh' : 'Mở lại',
      okButtonProps: { danger: p.active },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await inventoryApi.setActive(p.id, !p.active)
          reload()
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })

  const actions = (p: PartResponse): MenuProps['items'] => [
    { key: 'import', icon: <ImportOutlined />, label: 'Nhập kho', onClick: () => setDialog({ kind: 'import', part: p }) },
    { key: 'ledger', icon: <HistoryOutlined />, label: 'Lịch sử kho', onClick: () => setDialog({ kind: 'ledger', part: p }) },
    { key: 'edit', icon: <EditOutlined />, label: 'Sửa thông tin', onClick: () => setDialog({ kind: 'edit', part: p }) },
    { key: 'image', icon: <CameraOutlined />, label: p.imageUpdatedAt ? 'Đổi ảnh' : 'Thêm ảnh', onClick: () => setDialog({ kind: 'image', part: p }) },
    ...(role === 'ADMIN'
      ? [
          { key: 'adjust', icon: <SwapOutlined />, label: 'Điều chỉnh kiểm kê', onClick: () => setDialog({ kind: 'adjust', part: p }) },
          { type: 'divider' as const },
          { key: 'active', icon: <StopOutlined />, label: p.active ? 'Ngừng kinh doanh' : 'Mở lại kinh doanh', danger: p.active, onClick: () => toggleActive(p) },
        ]
      : []),
  ]

  const columns: TableProps<PartResponse>['columns'] = [
    {
      title: 'Linh kiện',
      render: (_, p) => (
        <div className={`flex min-w-0 items-center gap-3 ${p.active ? '' : 'opacity-60'}`}>
          {canManage ? (
            <button type="button" aria-label={`Đổi ảnh ${p.sku}`} title="Đổi ảnh" onClick={() => setDialog({ kind: 'image', part: p })}
              className="focus-ring group relative shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0">
              <PartImage partId={p.id} categoryCode={p.categoryCode} version={p.imageUpdatedAt} size={52} />
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <CameraOutlined />
              </span>
            </button>
          ) : (
            <PartImage partId={p.id} categoryCode={p.categoryCode} version={p.imageUpdatedAt} size={52} />
          )}
          <div className="min-w-0">
            <div className="font-medium text-text">{p.name} {!p.active && <Tag className="ml-1">Ngừng kinh doanh</Tag>}</div>
            <div className="font-mono text-xs text-text-secondary">
              {p.sku}
              <span className="font-sans">
                {p.categoryName && ` · ${p.categoryName}`}
                {p.deviceType && ` · ${DEVICE_TYPE_LABELS[p.deviceType]}`}
                {p.brand && ` · ${p.brand}`}
              </span>
            </div>
            {p.compatibleModels && <div className="max-w-xs truncate text-xs text-text-muted" title={p.compatibleModels}>Hợp: {p.compatibleModels}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'grade',
      responsive: ['md'],
      render: (g: PartResponse['grade']) =>
        g ? (
          <Tooltip title={PART_GRADE_CONFIG[g].label}>
            <Tag color={PART_GRADE_CONFIG[g].color} className="!m-0">{PART_GRADE_CONFIG[g].short}</Tag>
          </Tooltip>
        ) : (
          <span className="text-xs text-text-muted">Chưa phân loại</span>
        ),
    },
    {
      title: 'Bảo hành',
      dataIndex: 'effectiveWarrantyMonths',
      align: 'right',
      render: (m: number, p) => (
        <Tooltip title={p.warrantyMonths === null ? `Theo nhóm ${p.categoryName ?? ''}` : 'Bảo hành riêng của linh kiện'}>
          <span className={`tabular-nums ${m === 0 ? 'text-text-muted' : 'text-text'}`}>{m === 0 ? 'Không' : `${m} tháng`}</span>
          {p.warrantyMonths !== null && <span className="ml-1 text-xs text-primary">●</span>}
        </Tooltip>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantityOnHand',
      align: 'right',
      render: (_, p) => (
        <span className={`tabular-nums font-semibold ${p.lowStock ? 'text-error' : 'text-text'}`}>
          {p.lowStock && <WarningOutlined className="mr-1" aria-label="Tồn thấp" />}
          {p.quantityOnHand} <span className="font-normal text-text-muted">{p.unit}</span>
        </span>
      ),
    },
    { title: 'Tối thiểu', dataIndex: 'minStockLevel', align: 'right', responsive: ['md'], render: (v: number) => <span className="tabular-nums text-text-secondary">{v}</span> },
    ...(canManage ? [{ title: 'Giá nhập', dataIndex: 'costPrice', align: 'right' as const, responsive: ['lg' as const], render: (v: number | null) => <MoneyText value={v} /> }] : []),
    { title: 'Giá bán', dataIndex: 'sellingPrice', align: 'right', render: (v: number) => <MoneyText value={v} /> },
    ...(canManage
      ? [
          {
            title: <span className="sr-only">Thao tác</span>,
            key: 'actions',
            width: 56,
            align: 'right' as const,
            render: (_: unknown, p: PartResponse) => (
              <Dropdown menu={{ items: actions(p) }} trigger={['click']} placement="bottomRight">
                <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác với ${p.sku}`} />
              </Dropdown>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PartCategoryGrid
        categories={categories.data ?? []}
        deviceType={deviceType}
        selectedId={categoryId}
        canManage={canManage}
        onSelect={(id) => { setCategoryId(id); setPage(0) }}
        onAdd={(c) => setDialog({ kind: 'edit', preset: c })}
      />
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center">
        <Input
          aria-label="Tìm linh kiện"
          placeholder="Tìm theo tên hoặc SKU..."
          prefix={<SearchOutlined className="text-text-muted" />}
          allowClear
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setPage(0)
          }}
          className="md:max-w-sm"
        />
        <Select<DeviceType>
          aria-label="Lọc loại thiết bị"
          placeholder="Mọi thiết bị"
          allowClear
          value={deviceType}
          onChange={(v) => { setDeviceType(v); setPage(0) }}
          options={DEVICE_TYPE_OPTIONS}
          className="md:w-40"
        />
        <Select<number>
          aria-label="Lọc nhóm linh kiện"
          placeholder="Tất cả nhóm"
          allowClear
          showSearch
          optionFilterProp="label"
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setPage(0) }}
          options={(categories.data ?? [])
            .filter((c) => !deviceType || c.deviceTypes.includes(deviceType))
            .map((c) => ({ value: c.id, label: c.name }))}
          className="md:w-52"
        />
        <Checkbox checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(0) }}>
          Chỉ tồn thấp
        </Checkbox>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} className="md:ml-auto" onClick={() => setDialog({ kind: 'edit' })}>
            Thêm linh kiện
          </Button>
        )}
      </div>
      {error && !loading ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Table<PartResponse>
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={loading}
          scroll={{ x: 'max-content' }}
          rowClassName={(p) => (p.lowStock && p.active ? 'bg-tone-error-bg/40' : '')}
          locale={{ emptyText: loading ? ' ' : <EmptyState compact title={q || categoryId || deviceType || lowStock ? 'Không có linh kiện phù hợp' : 'Chưa có linh kiện'} /> }}
          pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1), showTotal: (t) => `${t} linh kiện` }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <PartFormModal key={dialog.part?.id ?? `new-${dialog.preset?.id ?? ''}`} part={dialog.part}
          preset={dialog.preset ? { categoryId: dialog.preset.id, deviceType: deviceType && dialog.preset.deviceTypes.includes(deviceType) ? deviceType : null } : undefined}
          categories={categories.data ?? []} onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); reload(); categories.reload() }} />
      )}
      {dialog && (dialog.kind === 'import' || dialog.kind === 'adjust') && dialog.part && (
        <StockModal key={`${dialog.kind}-${dialog.part.id}`} part={dialog.part} mode={dialog.kind} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); categories.reload() }} />
      )}
      {dialog?.kind === 'image' && dialog.part && (
        <PartImageModal key={`img-${dialog.part.id}`} part={dialog.part} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload() }} />
      )}
      <Drawer
        open={dialog?.kind === 'ledger'}
        size={900}
        title={dialog?.part ? <span className="flex items-center gap-2"><HistoryOutlined /> Lịch sử kho – {dialog.part.sku} · {dialog.part.name}</span> : null}
        onClose={() => setDialog(null)}
        destroyOnHidden
      >
        {dialog?.kind === 'ledger' && dialog.part && <LedgerView partId={dialog.part.id} compact />}
      </Drawer>
    </>
  )
}

/** Sổ kho toàn bộ: tổng hợp + từng dòng biến động, lọc theo linh kiện / loại / khoảng ngày. */
function TransactionsTab() {
  return <LedgerView />
}

/** Kho linh kiện. KTV chỉ xem danh sách (không thấy giá nhập, không có sổ kho). */
export function InventoryPage() {
  const role = useAppSelector((s) => s.auth.user!.role)
  const canManage = role === 'ADMIN' || role === 'STAFF'
  return (
    <>
      <PageHeader title="Kho linh kiện" description="Linh kiện theo nhóm và loại thiết bị, bảo hành từng linh kiện, tồn kho và sổ kho. Dòng đỏ = tồn thấp hơn mức tối thiểu." />
      <Card styles={{ body: { paddingTop: 8 } }}>
        {canManage ? (
          <Tabs items={[
            { key: 'parts', label: 'Linh kiện', children: <PartsTab /> },
            { key: 'categories', label: 'Nhóm & bảo hành', children: <PartCategoriesTab canEdit={role === 'ADMIN'} /> },
            { key: 'transactions', label: 'Sổ kho', children: <TransactionsTab /> },
          ]} />
        ) : (
          <div className="pt-4"><PartsTab /></div>
        )}
      </Card>
    </>
  )
}
