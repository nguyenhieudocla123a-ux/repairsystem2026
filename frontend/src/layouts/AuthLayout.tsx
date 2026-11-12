import { BellOutlined, FileProtectOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Grid } from 'antd'
import { Suspense, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { RepairScene3D } from '@/components/three/lazyRepairScene'
import { Scene3DBoundary } from '@/components/three/Scene3DBoundary'

const CURRENT_YEAR = new Date().getFullYear()

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <BellOutlined />, title: 'Cập nhật tức thì', text: 'Khách nhận thông báo ngay khi phiếu đổi trạng thái' },
  { icon: <FileProtectOutlined />, title: 'Báo giá minh bạch', text: 'Khách xem và xác nhận báo giá trực tuyến' },
  { icon: <SafetyCertificateOutlined />, title: 'Bảo hành rõ ràng', text: 'Tra cứu bằng mã phiếu hoặc số serial' },
]

/** Nền navy dùng chung cho panel thương hiệu (desktop) và dải tiêu đề (mobile). */
const brandBg = 'bg-[radial-gradient(120%_80%_at_70%_20%,#0C4A6E_0%,#0B1220_55%,#070B14_100%)]'

/** Bố cục trang công khai: panel thương hiệu 3D (≥1024px) + vùng form. */
export function AuthLayout() {
  const screens = Grid.useBreakpoint()
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <aside className={`relative hidden overflow-hidden text-white lg:flex lg:flex-col ${brandBg}`}>
        {/* Lưới mờ tạo cảm giác "bàn kỹ thuật" */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(70%_60%_at_60%_40%,#000,transparent)]"
        />
        {screens.lg && (
          <Scene3DBoundary>
            <Suspense fallback={null}>
              <RepairScene3D className="absolute inset-0" />
            </Suspense>
          </Scene3DBoundary>
        )}
        {/* Lớp phủ: giữ tương phản cho chữ phía trên/trái và dải thẻ phía dưới */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(7_11_20/0.85)_0%,rgb(7_11_20/0.35)_45%,transparent_70%),linear-gradient(0deg,rgb(7_11_20/0.9)_0%,transparent_35%)]"
        />

        <div data-enter className="pointer-events-none relative z-10 flex h-full flex-col p-10 xl:p-14">
          <Link to="/login" className="pointer-events-auto flex w-fit items-center gap-3 text-white no-underline">
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
          <p className="mt-6 mb-0 text-sm text-slate-400">© {CURRENT_YEAR} RepairFlow</p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col bg-bg">
        {/* Mobile/tablet: dải thương hiệu gọn thay cho panel 3D (tiết kiệm pin & dữ liệu) */}
        <div className={`relative overflow-hidden lg:hidden ${brandBg} ${screens.sm ? 'h-60' : ''}`}>
          {/* Màn hình vừa (640–1023px): dải 3D phía trên form; điện thoại nhỏ: chỉ logo để tiết kiệm pin */}
          {screens.sm && !screens.lg && (
            <Scene3DBoundary>
              <Suspense fallback={null}>
                <RepairScene3D layout="banner" className="absolute inset-0" />
              </Suspense>
            </Scene3DBoundary>
          )}
          <Link to="/login" className="relative z-10 flex w-fit items-center gap-2.5 px-5 py-5 text-white no-underline">
            <img src="/favicon.svg" alt="" className="size-9" />
            <span className="text-lg font-bold">RepairFlow</span>
          </Link>
        </div>
        {/* Desktop: thanh trên cùng – lối vào tra cứu bảo hành cho khách không có tài khoản */}
        <div className="hidden items-center justify-end gap-3 px-10 pt-8 lg:flex">
          <span className="text-sm text-text-secondary">Chỉ cần kiểm tra bảo hành?</span>
          <Link to="/warranty-check" className="no-underline">
            <Button icon={<SafetyCertificateOutlined />}>Tra cứu bảo hành</Button>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center bg-[radial-gradient(rgb(15_23_42/0.06)_1px,transparent_1px)] [background-size:20px_20px] px-5 py-10 sm:px-10">
          <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-12px_rgb(15_23_42/0.14)] sm:p-9">
            <Outlet />
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-xs text-text-muted">
          <span>© {CURRENT_YEAR} RepairFlow</span>
          <span aria-hidden="true">·</span>
          <span>Quản lý sửa chữa &amp; bảo hành thiết bị</span>
        </footer>
      </main>
    </div>
  )
}
