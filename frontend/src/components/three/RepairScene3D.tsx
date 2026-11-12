import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/theme/useReducedMotion'
import { createRepairScene } from './repairScene'

/**
 * Khung React cho cảnh 3D (trang trí – aria-hidden). Được import bằng React.lazy nên three.js (~600 KB)
 * nằm ở chunk riêng, chỉ tải trên trang công khai, không làm chậm trang nghiệp vụ.
 */
export default function RepairScene3D({ className = '', layout = 'hero' }: { className?: string; layout?: 'hero' | 'banner' }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = createRepairScene(el, { reducedMotion, layout })
    return () => handle?.dispose()
  }, [reducedMotion, layout])

  return <div ref={ref} aria-hidden="true" className={className} />
}
