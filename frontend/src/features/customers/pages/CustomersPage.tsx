import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Input, Table, Tag, type TableProps } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/utils/format'
import { toSortParam } from '@/utils/params'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { customersApi, type CustomerResponse } from '../customersApi'

const SORT_FIELDS = new Set(['fullName', 'code', 'createdAt'])

export function CustomersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [sort, setSort] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const q = useDebouncedValue(keyword)
  const [creating, setCreating] = useState(false)

  const { data, loading, error, reload } = useAsyncData(() => customersApi.search({ page, size, sort, q }), [page, size, sort, q])

  const columns: TableProps<CustomerResponse>['columns'] = [
    { title: 'Mã', dataIndex: 'code', sorter: true, width: 120, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    {
      title: 'Khách hàng',
      dataIndex: 'fullName',
      sorter: true,
      render: (_, c) => (
        <div className="min-w-0">
          <div className="font-medium text-text">{c.fullName}</div>
          <div className="text-xs text-text-secondary">{c.email ?? '—'}</div>
        </div>
      ),
    },
    { title: 'Số điện thoại', dataIndex: 'phone', render: (v: string) => <span className="tabular-nums">{v}</span> },
    { title: 'Địa chỉ', dataIndex: 'address', responsive: ['xl'], ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: 'Tài khoản',
      dataIndex: 'hasAccount',
      responsive: ['md'],
      render: (v: boolean) => (v ? <Tag icon={<UserOutlined />} color="green">Đã có</Tag> : <span className="text-text-muted">Chưa có</span>),
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', sorter: true, responsive: ['lg'], render: formatDate },
  ]

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description="Hồ sơ khách hàng, thiết bị và lịch sử sửa chữa."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Thêm khách hàng</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="border-b border-border p-4">
          <Input
            aria-label="Tìm khách hàng"
            placeholder="Tìm theo tên, số điện thoại, email, mã KH..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(0)
            }}
            className="md:max-w-md"
          />
        </div>
        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<CustomerResponse>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            onRow={(c) => ({ onClick: () => navigate(`/customers/${c.id}`), className: 'cursor-pointer' })}
            locale={{
              emptyText: loading ? ' ' : q ? (
                <EmptyState compact title="Không tìm thấy khách hàng" description="Thử tìm bằng số điện thoại hoặc mã khách hàng." />
              ) : (
                <EmptyState
                  compact
                  title="Chưa có khách hàng"
                  action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Thêm khách hàng</Button>}
                />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: data?.totalElements ?? 0,
              showSizeChanger: true,
              showTotal: (t) => `${t} khách hàng`,
              className: '!px-4',
            }}
            onChange={(p, _f, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter
              setSort(toSortParam(s?.field, s?.order, SORT_FIELDS))
              setPage((p.current ?? 1) - 1)
              setSize(p.pageSize ?? 20)
            }}
          />
        )}
      </Card>
      {creating && (
        <CustomerFormModal
          onClose={() => setCreating(false)}
          onSaved={(c) => {
            setCreating(false)
            navigate(`/customers/${c.id}`)
          }}
        />
      )}
    </>
  )
}
