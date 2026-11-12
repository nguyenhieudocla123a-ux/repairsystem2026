import { useEffect, type RefObject } from 'react'

/**
 * Ghi vị trí con trỏ (so với phần tử) vào biến CSS `--mx`, `--my` (px) và `--mo` (1 khi con trỏ ở gần, 0 khi xa).
 * CSS dùng các biến này để vẽ đèn rọi / viền sáng theo chuột – không re-render React, gộp sự kiện theo từng frame.
 * Là chuyển động do người dùng chủ động gây ra nên vẫn bật khi hệ điều hành đặt "giảm chuyển động".
 * Chỉ áp dụng cho con trỏ chuột/bút (thiết bị cảm ứng không có hover).
 */
export function usePointerVars(ref: RefObject<HTMLElement | null>, nearPx = 160) {
  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let frame = 0
    let last: PointerEvent | null = null
    const apply = () => {
      frame = 0
      if (!last) return
      const r = el.getBoundingClientRect()
      const x = last.clientX - r.left
      const y = last.clientY - r.top
      // khoảng cách từ con trỏ tới khung phần tử (0 khi ở trong)
      const dx = Math.max(r.left - last.clientX, 0, last.clientX - r.right)
      const dy = Math.max(r.top - last.clientY, 0, last.clientY - r.bottom)
      const near = Math.max(0, 1 - Math.hypot(dx, dy) / nearPx)
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
      el.style.setProperty('--mo', near.toFixed(3))
    }
    const onMove = (e: PointerEvent) => {
      last = e
      if (!frame) frame = requestAnimationFrame(apply)
    }
    const onLeave = () => el.style.setProperty('--mo', '0')
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, nearPx])
}
