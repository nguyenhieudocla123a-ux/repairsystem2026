import { CheckCircleFilled } from '@ant-design/icons'
import { Link, Outlet } from 'react-router-dom'

const CURRENT_YEAR = new Date().getFullYear()

const HIGHLIGHTS = [
  'Theo dõi tiến độ sửa chữa theo thời gian thực',
  'Báo giá minh bạch, khách xác nhận trực tuyến',
  'Tra cứu bảo hành bằng mã phiếu hoặc serial',
]

/** Bố cục trang công khai: panel thương hiệu (ẩn trên mobile) + form. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-primary opacity-40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 size-[24rem] rounded-full bg-tone-info-fg opacity-30 blur-3xl"
        />
        <Link to="/login" className="relative flex items-center gap-3 text-white no-underline">
          <img src="/favicon.svg" alt="" className="size-10" />
          <span className="text-xl font-bold tracking-tight">RepairFlow</span>
        </Link>

        <div className="relative mt-auto mb-auto max-w-md">
          <h2 className="m-0 text-4xl leading-tight font-bold">
            Quản lý sửa chữa &amp; bảo hành thiết bị, gọn trong một nơi.
          </h2>
          <ul className="mt-8 flex list-none flex-col gap-4 p-0">
            {HIGHLIGHTS.map((text) => (
              <li key={text} className="flex items-start gap-3 text-base text-slate-300">
                <CheckCircleFilled className="mt-1 text-primary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative m-0 text-sm text-slate-400">© {CURRENT_YEAR} RepairFlow</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Link to="/login" className="mb-8 flex items-center gap-2.5 no-underline lg:hidden">
            <img src="/favicon.svg" alt="" className="size-9" />
            <span className="text-lg font-bold text-text">RepairFlow</span>
          </Link>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
