import { useEffect, useState } from 'react'
import { http } from '@/services/http'
import { InitialAvatar } from './DeviceArt'

/**
 * Ảnh đại diện người dùng. Ảnh nằm sau API có xác thực (Bearer) nên <img src> không gọi trực tiếp được:
 * tải bằng axios dạng blob → object URL, cache theo (userId, phiên bản) cho cả phiên làm việc.
 * Chưa có ảnh / đang tải / lỗi → avatar chữ cái đầu (không bao giờ trống).
 */
const cache = new Map<string, Promise<string | null>>()

function loadAvatar(userId: number, version: string): Promise<string | null> {
  const key = `${userId}:${version}`
  let p = cache.get(key)
  if (!p) {
    p = http
      .get<Blob>(`/users/${userId}/avatar`, { params: { v: version }, responseType: 'blob' })
      .then((r) => URL.createObjectURL(r.data))
      .catch(() => {
        cache.delete(key) // lỗi tạm thời → lần sau thử lại
        return null
      })
    cache.set(key, p)
  }
  return p
}

export interface UserAvatarProps {
  userId: number
  name: string
  /** avatarUpdatedAt từ API; null = chưa có ảnh */
  version: string | null | undefined
  size?: number
  className?: string
}

export function UserAvatar({ userId, name, version, size = 36, className = '' }: UserAvatarProps) {
  const key = version ? `${userId}:${version}` : null
  // Ảnh đã tải gắn với khóa (người dùng, phiên bản) → đổi người/ảnh thì tự coi như chưa có, không cần reset state
  const [loaded, setLoaded] = useState<{ key: string; src: string | null } | null>(null)

  useEffect(() => {
    if (!key || !version) return
    let active = true
    loadAvatar(userId, version).then((url) => active && setLoaded({ key, src: url }))
    return () => {
      active = false
    }
  }, [key, userId, version])

  const src = key && loaded?.key === key ? loaded.src : null
  if (!src) return <InitialAvatar name={name} size={size} className={className} />
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
