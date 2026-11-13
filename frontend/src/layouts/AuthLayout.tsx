import { BellOutlined, FileProtectOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, ConfigProvider, Grid } from 'antd'
import { Suspense, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { CircuitTraces } from '@/components/CircuitTraces'
import { RepairScene3D } from '@/components/three/lazyRepairScene'
import { Scene3DBoundary } from '@/components/three/Scene3DBoundary'
import { antdPublicDarkTheme } from '@/theme/antdTheme'

const CURRENT_YEAR = new Date().getFullYear()
const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <BellOutlined />, title: 'Cập nhật tức thì', text: 'Khách nhận thông báo ngay khi phiếu đổi trạng thái' },
  { icon: <FileProtectOutlined />, title: 'Báo giá minh bạch', text: 'Khách xem và xác nhận báo giá trực tuyến' },
  { icon: <SafetyCertificateOutlined />, title: 'Bảo hành rõ ràng', text: 'Tra cứu bằng mã phiếu hoặc số serial' },
]

/** Nền navy dùng chung toàn trang công khai. */
const brandBg = 'bg-[radial-gradient(110%_80%_at_25%_25%,#0C4A6E_0%,#0B1220_55%,#070B14_100%)]'

/**
 * Bố cục trang công khai: MỘT nền navy liền mạch (không chia đôi nền sáng/tối).
 * Cột trái (≥1024px): mạch điện phát sáng + cảnh 3D anh thợ + điện thoại luôn chuyển động, tiêu đề, 3 thẻ tính năng; cột phải: thẻ form kính mờ.
 */
export function AuthLayout() {
  const screens = Grid.useBreakpoint()
  return (
    <div className={`relative min-h-screen text-white ${brandBg}`}>
      {/* Mạch điện phát sáng quanh trang, xung sáng chạy dọc đường mạch */}
      <CircuitTraces className="pointer-events-none fixed inset-0 h-full w-full" />
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]">
        {/* ---------------- Cột trái: cảnh 3D ---------------- */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(70%_60%_at_60%_45%,#000,transparent)]"
          />
          {screens.lg && (
            <Scene3DBoundary>
              <Suspense fallback={null}>
                <RepairScene3D className="absolute inset-0" />
              </Suspense>
            </Scene3DBoundary>
          )}
          {/* Chỉ tối ở góc tiêu đề và mép dưới – không che anh thợ */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_38%_at_0%_10%,rgb(7_11_20/0.85),transparent),linear-gradient(0deg,rgb(7_11_20/0.85)_0%,transparent_30%)]"
          />

          <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
            <Link to="/login" className="flex w-fit items-center gap-3 text-white no-underline">
              <img src="/favicon.svg" alt="" className="size-10" />
              <span className="text-xl font-bold tracking-tight">RepairFlow</span>
            </Link>
            <div className="mt-10 max-w-md">
              <p className="m-0 text-sm font-semibold tracking-[0.14em] text-sky-300 uppercase">Sửa chữa &amp; bảo hành thiết bị</p>
              <h2 className="mt-3 mb-0 text-4xl leading-[1.15] font-bold tracking-tight xl:text-[44px]">
                Mỗi chiếc máy, một quy trình <span className="text-sky-300">rõ ràng</span>.
              </h2>
            </div>
            <ul className="mt-auto grid list-none gap-3 p-0 xl:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                  <span aria-hidden="true" className="mb-2 flex size-9 items-center justify-center rounded-xl bg-sky-400/15 text-lg text-sky-300">
                    {f.icon}
                  </span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-slate-300">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ---------------- Cột form ---------------- */}
        <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:py-10 lg:pr-10 lg:pl-4 xl:pr-14">
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link to="/login" className="flex w-fit items-center gap-2.5 text-white no-underline lg:hidden">
              <img src="/favicon.svg" alt="" className="size-9" />
              <span className="text-lg font-bold">RepairFlow</span>
            </Link>
            <ConfigProvider theme={antdPublicDarkTheme}>
              <Link to="/warranty-check" className="no-underline">
                <Button icon={<SafetyCertificateOutlined />}>Tra cứu bảo hành</Button>
              </Link>
            </ConfigProvider>
          </div>

          <main className="flex flex-1 items-center justify-center py-8">
            <div className="rf-glass-card w-full max-w-[460px] rounded-3xl p-6 sm:p-9">
              <ConfigProvider theme={antdPublicDarkTheme}>
                <div className="rf-dark">
                  <Outlet />
                </div>
              </ConfigProvider>
            </div>
          </main>

          <footer className="text-center text-xs text-slate-500">© {CURRENT_YEAR} RepairFlow</footer>
        </div>
      </div>
    </div>
  )
}
