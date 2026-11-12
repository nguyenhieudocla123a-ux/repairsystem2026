import { useEffect, useRef } from 'react'
import { createRepairScene, type RepairSceneHandle } from './repairScene'

/**
 * Khung React cho cảnh 3D (trang trí – aria-hidden). Được import bằng React.lazy nên three.js
 * nằm ở chunk riêng, chỉ tải trên trang công khai.
 * Cảnh tạo MỘT lần theo layout; bật/tạm dừng chuyển động qua handle.setAnimate (không dựng lại cảnh).
 */
export default function RepairScene3D({ className = '', layout = 'hero', paused = false }: { className?: string; layout?: 'hero' | 'banner'; paused?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const handle = useRef<RepairSceneHandle | null>(null)
  const pausedRef = useRef(paused)

  // Đặt TRƯỚC effect tạo cảnh: lần gắn đầu tiên ref đã có giá trị đúng; các lần sau chỉ bật/tắt vòng lặp
  useEffect(() => {
    pausedRef.current = paused
    handle.current?.setAnimate(!paused)
  }, [paused])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    handle.current = createRepairScene(el, { animate: !pausedRef.current, layout })
    return () => {
      handle.current?.dispose()
      handle.current = null
    }
  }, [layout])

  return <div ref={ref} aria-hidden="true" className={className} />
}
