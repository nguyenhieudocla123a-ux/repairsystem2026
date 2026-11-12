import { EditOutlined, KeyOutlined, LockOutlined, MoreOutlined, PlusOutlined, SearchOutlined, UnlockOutlined } from '@ant-design/icons'
import { App, Button, Card, Dropdown, Input, Select, Table, type MenuProps, type TableProps } from 'antd'
import { useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { UserAvatar } from '@/components/UserAvatar'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Role, UserStatus } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'
import { ResetPasswordModal } from '../components/ResetPasswordModal'
import { UserFormModal } from '../components/UserFormModal'
import { INTERNAL_ROLES, ROLE_TAG_CONFIG, USER_STATUS_CONFIG } from '../constants'
import { usersApi, type UserResponse } from '../usersApi'

export interface UsersPageProps {
  title: string
  description: string
  /** Giới hạn vai trò hiển thị (trang "Nhân viên & KTV" chỉ hiện tài khoản nội bộ). */
  scopeRoles?: readonly Role[]
}

const SORT_FIELDS = new Set(['fullName', 'createdAt', 'lastLoginAt'])


/** Quản lý tài khoản – phân trang, lọc, sắp xếp đều chạy ở Backend. */
export function UsersPage({ title, description, scopeRoles }: UsersPageProps) {
  const currentUserId = useAppSelector((s) => s.auth.user!.id)
  const { modal, message } = App.useApp()

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [sort, setSort] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState<Role | undefined>()
  const [status, setStatus] = useState<UserStatus | undefined>()
  const q = useDebouncedValue(keyword)

  const [editing, setEditing] = useState<UserResponse | 'new' | null>(null)
  const [resetting, setResetting] = useState<UserResponse | null>(null)

  const roles = role ? [role] : scopeRoles ? [...scopeRoles] : undefined
  const { data, loading, error, reload } = useAsyncData(
    () => usersApi.search({ page, size, sort, q, role: roles, status }),
    [page, size, sort, q, role, status, scopeRoles],
  )

  const resetToFirstPage = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    setPage(0)
  }

  const toggleLock = (user: UserResponse) => {
    const locking = user.status === 'ACTIVE'
    modal.confirm({
      title: locking ? `Khóa tài khoản ${user.email}?` : `Mở khóa tài khoản ${user.email}?`,
      content: locking ? 'Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập cho tới khi được mở khóa.' : undefined,
      okText: locking ? 'Khóa tài khoản' : 'Mở khóa',
      okButtonProps: { danger: locking },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await usersApi.updateStatus(user.id, locking ? 'LOCKED' : 'ACTIVE')
          message.success(locking ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
          reload()
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })
  }

  const rowActions = (user: UserResponse): MenuProps['items'] => {
    const isSelf = user.id === currentUserId
    return [
      { key: 'edit', icon: <EditOutlined />, label: 'Sửa thông tin', onClick: () => setEditing(user) },
      { key: 'reset', icon: <KeyOutlined />, label: 'Đặt lại mật khẩu', onClick: () => setResetting(user) },
      { type: 'divider' },
      user.status === 'ACTIVE'
        ? { key: 'lock', icon: <LockOutlined />, label: isSelf ? 'Không thể tự khóa' : 'Khóa tài khoản', danger: true, disabled: isSelf, onClick: () => toggleLock(user) }
        : { key: 'unlock', icon: <UnlockOutlined />, label: 'Mở khóa', onClick: () => toggleLock(user) },
    ]
  }

  const sortOrder = (field: string) => {
    if (!sort?.startsWith(`${field},`)) return null
    return sort.endsWith(',asc') ? ('ascend' as const) : ('descend' as const)
  }

  const columns: TableProps<UserResponse>['columns'] = [
    {
      title: 'Người dùng',
      dataIndex: 'fullName',
      sorter: true,
      sortOrder: sortOrder('fullName'),
      render: (_, u) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar userId={u.id} name={u.fullName} version={u.avatarUpdatedAt} />
          <div className="min-w-0">
            <div className="truncate font-medium text-text">
              {u.fullName} {u.id === currentUserId && <span className="text-xs font-normal text-text-muted">(bạn)</span>}
            </div>
            <div className="truncate text-xs text-text-secondary">{u.email}</div>
          </div>
        </div>
      ),
    },
    { title: 'Số điện thoại', dataIndex: 'phone', responsive: ['lg'], render: (v: string | null) => v ?? <span className="text-text-muted">—</span> },
    { title: 'Vai trò', dataIndex: 'role', render: (r: Role) => <StatusTag value={r} config={ROLE_TAG_CONFIG} /> },
    { title: 'Trạng thái', dataIndex: 'status', responsive: ['sm'], render: (s: UserStatus) => <StatusTag value={s} config={USER_STATUS_CONFIG} /> },
    {
      title: 'Đăng nhập gần nhất',
      dataIndex: 'lastLoginAt',
      sorter: true,
      sortOrder: sortOrder('lastLoginAt'),
      responsive: ['md'],
      render: (v: string | null) => (v ? formatDateTime(v) : <span className="text-text-muted">Chưa đăng nhập</span>),
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', sorter: true, sortOrder: sortOrder('createdAt'), responsive: ['xl'], render: formatDateTime },
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, u) => (
        <Dropdown menu={{ items: rowActions(u) }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác với ${u.email}`} />
        </Dropdown>
      ),
    },
  ]

  const hasFilter = Boolean(q || role || status)
  const roleFilterOptions = (scopeRoles ?? (['ADMIN', 'STAFF', 'TECHNICIAN', 'CUSTOMER'] as const)).map((r) => ({
    value: r,
    label: ROLE_TAG_CONFIG[r].label,
  }))

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            Tạo tài khoản
          </Button>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <Input
            aria-label="Tìm theo tên, email, số điện thoại"
            placeholder="Tìm theo tên, email, số điện thoại..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => resetToFirstPage(setKeyword)(e.target.value)}
            className="md:max-w-sm"
          />
          <Select<Role>
            aria-label="Lọc vai trò"
            placeholder="Tất cả vai trò"
            allowClear
            value={role}
            onChange={resetToFirstPage(setRole)}
            options={roleFilterOptions}
            className="md:w-48"
          />
          <Select<UserStatus>
            aria-label="Lọc trạng thái"
            placeholder="Tất cả trạng thái"
            allowClear
            value={status}
            onChange={resetToFirstPage(setStatus)}
            options={[
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'LOCKED', label: 'Đã khóa' },
            ]}
            className="md:w-44"
          />
        </div>

        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<UserResponse>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: loading ? ' ' : hasFilter ? (
                <EmptyState compact title="Không có kết quả phù hợp" description="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." />
              ) : (
                <EmptyState compact title="Chưa có tài khoản nào" />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: data?.totalElements ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `${total} tài khoản`,
              className: '!px-4',
            }}
            onChange={(pagination, _filters, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter
              const field = typeof s?.field === 'string' && SORT_FIELDS.has(s.field) ? s.field : undefined
              setSort(field && s.order ? `${field},${s.order === 'ascend' ? 'asc' : 'desc'}` : undefined)
              setPage((pagination.current ?? 1) - 1)
              setSize(pagination.pageSize ?? 20)
            }}
          />
        )}
      </Card>

      {editing !== null && (
        <UserFormModal
          key={editing === 'new' ? 'new' : editing.id}
          open
          user={editing === 'new' ? undefined : editing}
          currentUserId={currentUserId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
      {resetting && <ResetPasswordModal key={resetting.id} user={resetting} onClose={() => setResetting(null)} />}
    </>
  )
}

export const STAFF_SCOPE: readonly Role[] = INTERNAL_ROLES
