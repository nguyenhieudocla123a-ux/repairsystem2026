import { lazy } from 'react'

const RELOAD_FLAG = 'rf-3d-chunk-reload'

/**
 * Tải lười cảnh 3D (three.js ở chunk riêng) + tự phục hồi khi chunk tải lỗi.
 * Lỗi kiểu "Failed to fetch dynamically imported module" xảy ra khi trang đang mở giữ đường dẫn chunk cũ
 * (vừa deploy bản mới / dev server khởi động lại). Cách xử lý chuẩn: tải lại trang MỘT lần để lấy chunk mới;
 * nếu vẫn lỗi thì ném lỗi cho Scene3DBoundary ẩn cảnh 3D (trang vẫn dùng được).
 */
export const RepairScene3D = lazy(async () => {
  try {
    const mod = await import('./RepairScene3D')
    sessionStorage.removeItem(RELOAD_FLAG)
    return mod
  } catch (error) {
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
      return new Promise<never>(() => undefined) // chờ trang tải lại
    }
    throw error
  }
})
