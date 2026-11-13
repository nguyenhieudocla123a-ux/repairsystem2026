import { useEffect, useState } from 'react'
import { http } from '@/services/http'
import { categoryImage } from '../constants/categoryImages'

/**
 * Ảnh linh kiện: ảnh thật cửa hàng tải lên (API có xác thực → tải blob → object URL, cache theo phiên bản),
 * chưa có / đang tải / lỗi → ảnh mặc định theo nhóm (file tĩnh). Không bao giờ để ô ảnh trống.
 */
const cache = new Map<string, Promise<string | null>>()

function loadPartImage(partId: number, version: string): Promise<string | null> {
  const key = `${partId}:${version}`
  let p = cache.get(key)
  if (!p) {
    p = http
      .get<Blob>(`/parts/${partId}/image`, { params: { v: version }, responseType: 'blob' })
      .then((r) => URL.createObjectURL(r.data))
      .catch(() => {
        cache.delete(key)
        return null
      })
    cache.set(key, p)
  }
  return p
}

export interface PartImageProps {
  partId?: number | null
  categoryCode: string | null | undefined
  /** imageUpdatedAt từ API; null = chưa có ảnh thật */
  version?: string | null
  size?: number
  className?: string
  alt?: string
}

export function PartImage({ partId, categoryCode, version, size = 48, className = '', alt = '' }: PartImageProps) {
  const key = partId && version ? `${partId}:${version}` : null
  const [loaded, setLoaded] = useState<{ key: string; src: string | null } | null>(null)

  useEffect(() => {
    if (!key || !partId || !version) return
    let active = true
    loadPartImage(partId, version).then((url) => active && setLoaded({ key, src: url }))
    return () => {
      active = false
    }
  }, [key, partId, version])

  const own = key && loaded?.key === key ? loaded.src : null
  return (
    <img
      src={own ?? categoryImage(categoryCode)}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading="lazy"
      width={size}
      height={size}
      className={`shrink-0 rounded-lg bg-white object-cover ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
