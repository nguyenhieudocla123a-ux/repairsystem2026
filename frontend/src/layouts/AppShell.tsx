import { Drawer, Grid, Layout } from 'antd'
import { useState, type ReactNode } from 'react'
import type { Role } from '@/types/enums'
import { AppHeader, type BreadcrumbEntry } from './AppHeader'
import { Sidebar } from './Sidebar'

const { Sider, Content } = Layout

export interface AppShellProps {
  role: Role
  userName: string
  breadcrumbs: BreadcrumbEntry[]
  selectedPath: string
  unreadCount?: number
  onNavigate: (path: string) => void
  onQuickSearch: (keyword: string) => void
  onLogout: () => void
  notificationContent?: ReactNode
  children: ReactNode
}

/**
 * Khung ứng dụng: sidebar 240px (≥1200px) / 72px (768–1199px) / Drawer (<768px) + header + nội dung.
 */
export function AppShell(props: AppShellProps) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const collapsed = userCollapsed ?? !screens.xl

  const navigate = (path: string) => {
    setDrawerOpen(false)
    props.onNavigate(path)
  }

  const sidebar = (isCollapsed: boolean) => (
    <Sidebar
      role={props.role}
      userName={props.userName}
      collapsed={isCollapsed}
      selectedPath={props.selectedPath}
      onNavigate={navigate}
    />
  )

  return (
    <Layout className="min-h-screen">
      <a
        href="#main-content"
        className="focus-ring absolute -top-20 left-2 z-50 rounded-md bg-primary px-3 py-2 text-white focus:top-2"
      >
        Bỏ qua tới nội dung chính
      </a>

      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={260}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          {sidebar(false)}
        </Drawer>
      ) : (
        <Sider
          width={240}
          collapsedWidth={72}
          collapsed={collapsed}
          trigger={null}
          className="!sticky top-0 h-screen overflow-hidden"
        >
          {sidebar(collapsed)}
        </Sider>
      )}

      {/* min-w-0: flex child mặc định min-width:auto → bảng/thành phần rộng sẽ đẩy cả trang tràn ngang */}
      <Layout className="min-w-0">
        <AppHeader
          breadcrumbs={props.breadcrumbs}
          userName={props.userName}
          role={props.role}
          sidebarCollapsed={isMobile ? !drawerOpen : collapsed}
          unreadCount={props.unreadCount ?? 0}
          showQuickSearch={props.role !== 'CUSTOMER'}
          onToggleSidebar={() => (isMobile ? setDrawerOpen(true) : setUserCollapsed(!collapsed))}
          onNavigate={navigate}
          onQuickSearch={props.onQuickSearch}
          onLogout={props.onLogout}
          notificationContent={props.notificationContent}
        />
        <Content id="main-content" tabIndex={-1} className="rf-content outline-none">
          <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6">{props.children}</div>
        </Content>
      </Layout>
    </Layout>
  )
}
