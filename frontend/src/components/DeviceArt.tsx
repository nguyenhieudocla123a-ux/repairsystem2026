import type { ReactElement } from 'react'
import type { DeviceType } from '@/types/enums'

/**
 * Hình minh họa thiết bị & linh kiện (SVG tự vẽ, cùng một phong cách: khối bo tròn, nét mảnh, màu theo token).
 * Trang trí → aria-hidden; tên thiết bị/linh kiện luôn có chữ đi kèm.
 */

const BODY = '#1E293B'
const EDGE = '#475569'
const SCREEN_A = '#0C4A6E'
const SCREEN_B = '#0B1A2E'
const SKY = '#38BDF8'
const AMBER = 'var(--rf-accent)'

function Screen({ x, y, w, h, r = 2, id }: { x: number; y: number; w: number; h: number; r?: number; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1={x} y1={y} x2={x + w} y2={y + h} gradientUnits="userSpaceOnUse">
          <stop stopColor={SCREEN_A} />
          <stop offset="1" stopColor={SCREEN_B} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id})`} />
      {/* vệt sáng phản chiếu */}
      <path d={`M${x + w * 0.55} ${y} L${x + w} ${y} L${x + w} ${y + h * 0.35} Z`} fill="#fff" opacity=".07" />
    </>
  )
}

const DEVICE_DRAW: Record<DeviceType, (id: string) => ReactElement> = {
  PHONE: (id) => (
    <>
      <rect x="17" y="6" width="30" height="52" rx="6" fill={BODY} stroke={EDGE} strokeWidth="1.5" />
      <Screen x={20.5} y={10} w={23} h={43} r={3} id={id} />
      <rect x="28" y="12" width="8" height="2" rx="1" fill={BODY} />
      <circle cx="32" cy="34" r="6" stroke={SKY} strokeWidth="2" opacity=".85" fill="none" />
    </>
  ),
  LAPTOP: (id) => (
    <>
      <rect x="10" y="14" width="44" height="29" rx="3" fill={BODY} stroke={EDGE} strokeWidth="1.5" />
      <Screen x={13} y={17} w={38} h={23} id={id} />
      <path d="M17 34h6l3-4 4 3 5-6 4 3 5-5" stroke={SKY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 45h54l-3 5H8l-3-5Z" fill="#334155" />
      <rect x="27" y="45" width="10" height="1.6" rx=".8" fill="#64748B" />
    </>
  ),
  TABLET: (id) => (
    <>
      <rect x="12" y="8" width="40" height="48" rx="5" fill={BODY} stroke={EDGE} strokeWidth="1.5" />
      <Screen x={15.5} y={11.5} w={33} h={41} r={2.5} id={id} />
      <rect x="19" y="16" width="12" height="9" rx="1.5" fill={SKY} opacity=".7" />
      <rect x="33" y="16" width="12" height="9" rx="1.5" fill="#94A3B8" opacity=".45" />
      <rect x="19" y="27" width="26" height="3" rx="1.5" fill="#94A3B8" opacity=".45" />
      <rect x="19" y="32" width="18" height="3" rx="1.5" fill="#94A3B8" opacity=".35" />
    </>
  ),
  DESKTOP: (id) => (
    <>
      <rect x="7" y="9" width="50" height="34" rx="3" fill={BODY} stroke={EDGE} strokeWidth="1.5" />
      <Screen x={10} y={12} w={44} h={28} id={id} />
      <rect x="15" y="17" width="16" height="3" rx="1.5" fill={SKY} opacity=".85" />
      <rect x="15" y="23" width="24" height="2.5" rx="1.25" fill="#94A3B8" opacity=".45" />
      <path d="M28 43h8l2 8h-12l2-8Z" fill="#334155" />
      <rect x="20" y="51" width="24" height="3" rx="1.5" fill="#475569" />
    </>
  ),
  SMARTWATCH: (id) => (
    <>
      <path d="M24 4h16l2 12H22l2-12ZM22 48h20l-2 12H24l-2-12Z" fill="#334155" />
      <rect x="17" y="14" width="30" height="36" rx="9" fill={BODY} stroke={EDGE} strokeWidth="1.5" />
      <Screen x={21} y={18} w={22} h={28} r={6} id={id} />
      <circle cx="32" cy="32" r="7" stroke={SKY} strokeWidth="2" fill="none" strokeDasharray="30 14" />
      <rect x="47" y="27" width="3" height="8" rx="1.5" fill={AMBER} />
    </>
  ),
  OTHER: () => (
    <>
      <path d="M32 8 54 19v26L32 56 10 45V19L32 8Z" fill="#334155" stroke={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 19 32 30l22-11M32 30v26" stroke="#64748B" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <path d="M21 13.5 43 24.5" stroke={AMBER} strokeWidth="3" />
    </>
  ),
}

export interface ArtProps {
  /** Cạnh ô vuông (px) */
  size?: number
  className?: string
}

/** Ô hình thiết bị theo loại: nền xanh nhạt bo góc + hình thiết bị. */
export function DeviceArt({ type, size = 44, className = '' }: ArtProps & { type: DeviceType }) {
  const id = `rf-dev-${type}-${size}`
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-slate-100 ring-1 ring-slate-200/80 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.86} height={size * 0.86} fill="none">
        {DEVICE_DRAW[type](id)}
      </svg>
    </span>
  )
}

/** Avatar chữ cái đầu (tên tiếng Việt: lấy tên – từ cuối). Màu cố định theo tên để mỗi người một màu ổn định. */
const AVATAR_TONES = ['from-sky-400 to-sky-700', 'from-teal-400 to-teal-700', 'from-amber-400 to-amber-600', 'from-rose-400 to-rose-600', 'from-slate-400 to-slate-600', 'from-cyan-400 to-cyan-700']

export function InitialAvatar({ name, size = 36, className = '' }: { name: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/)
  const letter = (parts[parts.length - 1]?.[0] ?? '?').toUpperCase()
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${AVATAR_TONES[hash % AVATAR_TONES.length]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </span>
  )
}
