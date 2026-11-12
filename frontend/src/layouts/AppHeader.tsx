import { BellOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Badge, Breadcrumb, Button, Dropdown, Input, Popover, type MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ROLE_LABELS } from '@/routes/appRoutes'
import type { Role } from '@/types/enums'

export interface BreadcrumbEntry {
  title: string
  path?: string
}

export interface AppHeaderProps {
  breadcrumbs: BreadcrumbEntry[]
  userName: string
  role: Role
  sidebarCollapsed: boolean
  unreadCount: number
  showQuickSearch: boolean
  onToggleSidebar: () => void
  onNavigate: (path: string) => void
  onQuickSearch: (keyword: string) => void
  onLogout: () => void
  /** Nội dung popover chuông (AppLayout truyền danh sách thông báo thật) */
  notificationContent?: ReactNode
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[0] ?? '?').toUpperCase()
}

export function AppHeader(props: AppHeaderProps) {
  const { breadcrumbs, userName, role, sidebarCollapsed, unreadCount, showQuickSearch } = props

  const userMenu: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => props.onNavigate('/profile') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: props.onLogout },
  ]

  const [bellOpen, setBellOpen] = useState(false)
  const notificationPanel = props.notificationContent ?? (
    <div className="w-80">
      <div className="flex items-center justify-between border-b border-border px-1 pb-2">
        <span className="font-semibold">Thông báo</span>
        <Button type="link" size="small" onClick={() => props.onNavigate('/notifications')}>
          Xem tất cả
        </Button>
      </div>
      <EmptyState compact title="Không có thông báo mới" />
    </div>
  )

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
      <Button
        type="text"
        aria-label={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={props.onToggleSidebar}
      />

      <Breadcrumb
        className="hidden min-w-0 sm:block"
        items={breadcrumbs.map((b, i) => ({
          title:
            b.path && i < breadcrumbs.length - 1 ? (
              <a onClick={() => props.onNavigate(b.path!)}>{b.title}</a>
            ) : (
              b.title
            ),
        }))}
      />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {showQuickSearch && (
          <Input
            aria-label="Tìm nhanh mã phiếu"
            placeholder="Tìm mã phiếu, VD RO-2026-000123"
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            className="hidden w-72 lg:flex"
            onPressEnter={(e) => {
              const keyword = e.currentTarget.value.trim()
              if (keyword) props.onQuickSearch(keyword)
            }}
          />
        )}

        <Popover content={<div onClick={() => setBellOpen(false)}>{notificationPanel}</div>} trigger="click" placement="bottomRight" arrow={false} open={bellOpen} onOpenChange={setBellOpen}>
          <Button
            type="text"
            aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
            icon={
              <Badge count={unreadCount} size="small" offset={[2, -2]}>
                <BellOutlined className="text-lg" />
              </Badge>
            }
          />
        </Popover>

        <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
          <button type="button" className="focus-ring flex cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2 py-1 hover:bg-tone-neutral-bg">
            <Avatar size={32} className="bg-primary font-semibold">
              {initials(userName)}
            </Avatar>
            <span className="hidden flex-col text-left leading-tight md:flex">
              <span className="text-sm font-medium text-text">{userName}</span>
              <span className="text-xs text-text-secondary">{ROLE_LABELS[role]}</span>
            </span>
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
