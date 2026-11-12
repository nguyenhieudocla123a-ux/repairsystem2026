import { Menu, type MenuProps } from 'antd'
import { useMemo } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { ROLE_LABELS, routesForRole } from '@/routes/appRoutes'
import type { Role } from '@/types/enums'

export interface SidebarProps {
  role: Role
  userId: number
  avatarVersion?: string | null
  userName: string
  collapsed: boolean
  selectedPath: string
  onNavigate: (path: string) => void
}

type MenuItem = Required<MenuProps>['items'][number]

/** Sidebar trình bày thuần (presentational): nhận role & đường dẫn qua props → dễ test, dùng lại được ở UI kit. */
export function Sidebar({ role, userId, avatarVersion, userName, collapsed, selectedPath, onNavigate }: SidebarProps) {
  const items = useMemo<MenuItem[]>(() => {
    const routes = routesForRole(role).filter((r) => r.inMenu !== false)
    const result: MenuItem[] = []
    let currentGroup: string | undefined
    for (const route of routes) {
      if (route.group && route.group !== currentGroup) {
        currentGroup = route.group
        result.push({ type: 'group', key: `g-${route.group}`, label: collapsed ? null : route.group, children: [] })
      }
      const item: MenuItem = { key: route.path, icon: route.icon, label: route.label }
      const last = result[result.length - 1]
      if (route.group && last && 'children' in last && last.type === 'group') {
        ;(last.children as MenuItem[]).push(item)
      } else {
        result.push(item)
      }
    }
    return result
  }, [role, collapsed])

  const selectedKey = routesForRole(role).find((r) => selectedPath === r.path || selectedPath.startsWith(`${r.path}/`))?.path

  return (
    <nav aria-label="Điều hướng chính" className="rf-sidebar flex h-full flex-col bg-sidebar bg-[linear-gradient(180deg,#0B1220_0%,#0A1628_100%)]">
      <div className={`flex h-16 shrink-0 items-center gap-2.5 border-b border-white/5 ${collapsed ? 'justify-center' : 'px-5'}`}>
        <img src="/favicon.svg" alt="" className="size-8" />
        {!collapsed && <span className="text-[17px] font-bold tracking-tight text-white">RepairFlow</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 [scrollbar-color:rgb(255_255_255/0.15)_transparent] [scrollbar-width:thin][&_.ant-menu-item-group-title]:text-[11px] [&_.ant-menu-item-group-title]:font-semibold [&_.ant-menu-item-group-title]:tracking-wider [&_.ant-menu-item-group-title]:text-sidebar-muted [&_.ant-menu-item-group-title]:uppercase">
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onClick={({ key }) => onNavigate(key)}
          className="border-none"
        />
      </div>

      {!collapsed && (
        <div className="m-3 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
          <UserAvatar userId={userId} name={userName} version={avatarVersion} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{userName}</span>
            <span className="block text-xs text-sidebar-muted">{ROLE_LABELS[role]}</span>
          </span>
        </div>
      )}
    </nav>
  )
}
