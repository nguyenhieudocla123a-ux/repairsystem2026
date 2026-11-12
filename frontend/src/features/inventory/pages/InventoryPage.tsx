import { EditOutlined, ImportOutlined, MoreOutlined, PlusOutlined, SearchOutlined, StopOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons'
import { App, Button, Card, Checkbox, DatePicker, Dropdown, Input, Select, Table, Tabs, Tag, type MenuProps, type TableProps } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'
import { PartFormModal, StockModal } from '../components/PartModals'
import { TRANSACTION_TYPE_CONFIG, inventoryApi, type InventoryTransaction, type InventoryTransactionType, type PartResponse } from '../inventoryApi'

function PartsTab() {
  const role = useAppSelector((s) => s.auth.user!.role)
  const canManage = role === 'ADMIN' || role === 'STAFF'
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<string>()
  const [lowStock, setLowStock] = useState(false)
  const [dialog, setDialog] = useState<{ kind: 'edit' | 'import' | 'adjust'; part?: PartResponse } | null>(null)
  const q = useDebouncedValue(keyword)
  const categories = useAsyncData(() => inventoryApi.categories(), [])
  const { data, loading, error, reload } = useAsyncData(
    () => inventoryApi.search({ page, size: 20, q, category, lowStock: lowStock || undefined }),
    [page, q, category, lowStock],
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
    { key: 'edit', icon: <EditOutlined />, label: 'Sửa thông tin', onClick: () => setDialog({ kind: 'edit', part: p }) },
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
        <div className={p.active ? '' : 'opacity-60'}>
          <div className="font-medium text-text">{p.name} {!p.active && <Tag className="ml-1">Ngừng KD</Tag>}</div>
          <div className="font-mono text-xs text-text-secondary">{p.sku}{p.category && <span className="font-sans"> · {p.category}</span>}</div>
        </div>
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
        <Select<string>
          aria-label="Lọc danh mục"
          placeholder="Tất cả danh mục"
          allowClear
          value={category}
          onChange={(v) => {
            setCategory(v)
            setPage(0)
          }}
          options={(categories.data ?? []).map((c) => ({ value: c, label: c }))}
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
          locale={{ emptyText: loading ? ' ' : <EmptyState compact title={q || category || lowStock ? 'Không có linh kiện phù hợp' : 'Chưa có linh kiện'} /> }}
          pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1), showTotal: (t) => `${t} linh kiện` }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <PartFormModal key={dialog.part?.id ?? 'new'} part={dialog.part} categories={categories.data ?? []} onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); reload(); categories.reload() }} />
      )}
      {dialog && dialog.kind !== 'edit' && dialog.part && (
        <StockModal key={`${dialog.kind}-${dialog.part.id}`} part={dialog.part} mode={dialog.kind} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload() }} />
      )}
    </>
  )
}

function TransactionsTab() {
  const [page, setPage] = useState(0)
  const [type, setType] = useState<InventoryTransactionType>()
  const [range, setRange] = useState<[string, string] | null>(null)
  const { data, loading, error, reload } = useAsyncData(
    () => inventoryApi.transactions({ page, size: 20, type, from: range?.[0], to: range?.[1] }),
    [page, type, range],
  )
  const columns: TableProps<InventoryTransaction>['columns'] = [
    { title: 'Thời gian', dataIndex: 'createdAt', render: formatDateTime },
    { title: 'Loại', dataIndex: 'type', render: (t: InventoryTransactionType) => <Tag color={TRANSACTION_TYPE_CONFIG[t].color}>{TRANSACTION_TYPE_CONFIG[t].label}</Tag> },
    { title: 'Linh kiện', render: (_, t) => <span><span className="font-mono text-xs">{t.partSku}</span> {t.partName}</span> },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      align: 'right',
      render: (q: number, t) => {
        const signed = t.type === 'EXPORT' ? -q : q
        return <span className={`tabular-nums font-semibold ${signed < 0 ? 'text-error' : 'text-success'}`}>{signed > 0 ? `+${signed}` : signed}</span>
      },
    },
    { title: 'Tồn sau', dataIndex: 'balanceAfter', align: 'right', render: (v: number) => <span className="tabular-nums">{v}</span> },
    {
      title: 'Liên quan',
      responsive: ['md'],
      render: (_, t) => t.repairOrderCode ? <Link to={`/repairs/${t.repairOrderId}`} className="font-mono text-xs">{t.repairOrderCode}</Link> : t.supplierName ?? '—',
    },
    { title: 'Người thực hiện', dataIndex: 'createdByName', responsive: ['lg'] },
    { title: 'Ghi chú', dataIndex: 'note', responsive: ['xl'], ellipsis: true, render: (v: string | null) => v ?? '—' },
  ]
  return (
    <>
      <div className="flex flex-col gap-3 pb-4 md:flex-row">
        <Select<InventoryTransactionType>
          aria-label="Lọc loại giao dịch"
          placeholder="Mọi loại giao dịch"
          allowClear
          value={type}
          onChange={(v) => { setType(v); setPage(0) }}
          options={(Object.keys(TRANSACTION_TYPE_CONFIG) as InventoryTransactionType[]).map((t) => ({ value: t, label: TRANSACTION_TYPE_CONFIG[t].label }))}
          className="md:w-52"
        />
        <DatePicker.RangePicker
          aria-label="Khoảng thời gian"
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          onChange={(v) => { setRange(v?.[0] && v[1] ? [v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')] : null); setPage(0) }}
        />
      </div>
      {error && !loading ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Table<InventoryTransaction>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data?.content}
          loading={loading}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: loading ? ' ' : <EmptyState compact title="Chưa có giao dịch kho" /> }}
          pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1) }}
        />
      )}
    </>
  )
}

/** Kho linh kiện. KTV chỉ xem danh sách (không thấy giá nhập, không có sổ kho). */
export function InventoryPage() {
  const role = useAppSelector((s) => s.auth.user!.role)
  const canManage = role === 'ADMIN' || role === 'STAFF'
  return (
    <>
      <PageHeader title="Kho linh kiện" description="Tồn kho, nhập kho, kiểm kê và lịch sử biến động. Dòng đỏ = tồn thấp hơn mức tối thiểu." />
      <Card styles={{ body: { paddingTop: 8 } }}>
        {canManage ? (
          <Tabs items={[
            { key: 'parts', label: 'Linh kiện', children: <PartsTab /> },
            { key: 'transactions', label: 'Sổ kho', children: <TransactionsTab /> },
          ]} />
        ) : (
          <div className="pt-4"><PartsTab /></div>
        )}
      </Card>
    </>
  )
}
