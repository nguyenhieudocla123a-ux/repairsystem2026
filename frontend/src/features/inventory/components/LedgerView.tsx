import { ArrowDownOutlined, ArrowUpOutlined, DatabaseOutlined, RollbackOutlined, SwapOutlined } from '@ant-design/icons'
import { DatePicker, Select, Table, Tag, type TableProps } from 'antd'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { useAsyncData } from '@/hooks/useAsyncData'
import { formatDateTime } from '@/utils/format'
import { TRANSACTION_TYPE_CONFIG, inventoryApi, type InventoryTransaction, type InventoryTransactionType } from '../inventoryApi'
import { PartImage } from './PartImage'

function SummaryTile({ icon, label, quantity, value, tone }: { icon: ReactNode; label: string; quantity: ReactNode; value?: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-base ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-base font-semibold text-text tabular-nums">{quantity}</div>
        {value !== undefined && <MoneyText value={value} className="text-xs text-text-muted" />}
      </div>
    </div>
  )
}

/**
 * Sổ kho đầy đủ: tổng hợp (nhập / xuất / hoàn / điều chỉnh + giá trị, giá trị tồn hiện tại) và từng dòng biến động
 * kèm ảnh linh kiện, đơn giá, thành tiền, tồn sau giao dịch. partId cố định → lịch sử của một linh kiện.
 */
export function LedgerView({ partId: fixedPartId, compact = false }: { partId?: number; compact?: boolean }) {
  const [page, setPage] = useState(0)
  const [type, setType] = useState<InventoryTransactionType>()
  const [range, setRange] = useState<[string, string] | null>(null)
  const [pickedPart, setPickedPart] = useState<number>()
  const partId = fixedPartId ?? pickedPart
  const parts = useAsyncData(() => (fixedPartId ? Promise.resolve([]) : inventoryApi.options()), [fixedPartId])
  const filter = { partId, type, from: range?.[0], to: range?.[1] }
  const summary = useAsyncData(() => inventoryApi.summary(filter), [partId, type, range])
  const { data, loading, error, reload } = useAsyncData(
    () => inventoryApi.transactions({ page, size: compact ? 10 : 20, ...filter }),
    [page, partId, type, range],
  )

  const columns: TableProps<InventoryTransaction>['columns'] = [
    { title: 'Thời gian', dataIndex: 'createdAt', render: formatDateTime },
    { title: 'Loại', dataIndex: 'type', render: (t: InventoryTransactionType) => <Tag color={TRANSACTION_TYPE_CONFIG[t].color}>{TRANSACTION_TYPE_CONFIG[t].label}</Tag> },
    ...(fixedPartId
      ? []
      : [{
          title: 'Linh kiện',
          render: (_: unknown, t: InventoryTransaction) => (
            <span className="flex items-center gap-2">
              <PartImage partId={t.partId} categoryCode={t.partCategoryCode} version={t.partImageUpdatedAt} size={32} />
              <span className="min-w-0">
                <span className="block max-w-56 truncate">{t.partName}</span>
                <span className="font-mono text-xs text-text-muted">{t.partSku}</span>
              </span>
            </span>
          ),
        }]),
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      align: 'right',
      render: (q: number, t) => {
        const signed = t.type === 'EXPORT' ? -q : q
        return <span className={`tabular-nums font-semibold ${signed < 0 ? 'text-error' : 'text-success'}`}>{signed > 0 ? `+${signed}` : signed}</span>
      },
    },
    { title: 'Đơn giá', dataIndex: 'unitCost', align: 'right', responsive: ['md'], render: (v: number | null) => <MoneyText value={v} /> },
    {
      title: 'Thành tiền',
      align: 'right',
      responsive: ['lg'],
      render: (_, t) => (t.unitCost === null ? '—' : <MoneyText value={Math.abs(t.quantity) * t.unitCost} />),
    },
    { title: 'Tồn sau', dataIndex: 'balanceAfter', align: 'right', render: (v: number, t) => <span className="tabular-nums">{v} <span className="text-text-muted">{t.partUnit}</span></span> },
    {
      title: 'Liên quan',
      responsive: ['md'],
      render: (_, t) => (t.repairOrderCode ? <Link to={`/repairs/${t.repairOrderId}`} className="font-mono text-xs">{t.repairOrderCode}</Link> : t.supplierName ?? '—'),
    },
    { title: 'Người thực hiện', dataIndex: 'createdByName', responsive: ['lg'] },
    { title: 'Ghi chú', dataIndex: 'note', responsive: ['xl'], ellipsis: true, render: (v: string | null) => v ?? '—' },
  ]

  const s = summary.data
  return (
    <>
      <div className={`mb-4 grid gap-3 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'}`}>
        <SummaryTile icon={<ArrowDownOutlined />} tone="bg-tone-success-bg text-tone-success-fg" label="Nhập kho" quantity={s ? `+${s.importQuantity}` : '…'} value={s?.importValue} />
        <SummaryTile icon={<ArrowUpOutlined />} tone="bg-tone-primary-bg text-tone-primary-fg" label="Xuất cho phiếu" quantity={s ? `−${s.exportQuantity}` : '…'} value={s?.exportValue} />
        <SummaryTile icon={<RollbackOutlined />} tone="bg-tone-info-bg text-tone-info-fg" label="Hoàn kho" quantity={s ? `+${s.returnQuantity}` : '…'} value={s?.returnValue} />
        {!compact && <SummaryTile icon={<SwapOutlined />} tone="bg-tone-warning-bg text-tone-warning-fg" label="Điều chỉnh kiểm kê" quantity={s ? (s.adjustmentQuantity > 0 ? `+${s.adjustmentQuantity}` : s.adjustmentQuantity) : '…'} />}
        <SummaryTile icon={<DatabaseOutlined />} tone="bg-tone-neutral-bg text-tone-neutral-fg" label={partId ? 'Tồn hiện tại' : 'Tồn kho hiện tại'} quantity={s ? s.stockQuantity : '…'} value={s?.stockValue} />
      </div>

      <div className="flex flex-col gap-3 pb-4 md:flex-row md:flex-wrap">
        {!fixedPartId && (
          <Select<number>
            aria-label="Lọc linh kiện"
            placeholder="Tất cả linh kiện"
            allowClear
            showSearch={{ optionFilterProp: 'search' }}
            value={pickedPart}
            loading={parts.loading}
            onChange={(v) => { setPickedPart(v); setPage(0) }}
            options={(parts.data ?? []).map((p) => ({ value: p.id, search: `${p.sku} ${p.name}`, label: `${p.sku} · ${p.name}` }))}
            className="md:w-72"
          />
        )}
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
        {s && <span className="self-center text-sm text-text-secondary md:ml-auto">{s.transactionCount} giao dịch</span>}
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
          pagination={{ current: page + 1, pageSize: compact ? 10 : 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1) }}
        />
      )}
    </>
  )
}
