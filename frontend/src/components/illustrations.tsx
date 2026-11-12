/**
 * Minh họa SVG tự vẽ (không ảnh ngoài) – nhẹ, sắc nét mọi kích thước, màu lấy từ token qua CSS variables.
 * Tất cả là trang trí → aria-hidden; nội dung thật nằm ở chữ đi kèm.
 */

const P = 'var(--rf-primary)'
const SKY = '#38BDF8'
const AMBER = 'var(--rf-accent)'
const LINE = '#CBD5E1'
const SOFT = '#E0F2FE'

/** Trạng thái trống: khay hồ sơ trống + kính lúp. */
export function EmptyIllustration({ className = 'h-24 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true" fill="none">
      <ellipse cx="80" cy="108" rx="52" ry="6" fill="#E2E8F0" />
      <path d="M30 58 44 30h72l14 28v40a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V58Z" fill="#fff" stroke={LINE} strokeWidth="2" />
      <path d="M30 58h30l6 10h28l6-10h30" stroke={LINE} strokeWidth="2" />
      <rect x="54" y="38" width="52" height="6" rx="3" fill={SOFT} />
      <rect x="60" y="48" width="40" height="5" rx="2.5" fill={SOFT} />
      <circle cx="116" cy="40" r="15" fill="#fff" stroke={P} strokeWidth="4" />
      <path d="m127 51 12 12" stroke={P} strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="22" r="3" fill={AMBER} />
      <circle cx="134" cy="18" r="2" fill={SKY} />
    </svg>
  )
}

/** Banner dashboard: bàn làm việc với laptop, điện thoại, cờ lê và bánh răng. */
export function WorkbenchIllustration({ className = 'h-40 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 180" className={className} aria-hidden="true" fill="none">
      <circle cx="170" cy="86" r="78" fill="url(#wb-glow)" />
      {/* Laptop */}
      <rect x="70" y="42" width="140" height="88" rx="8" fill="#0F172A" stroke="#334155" strokeWidth="2" />
      <rect x="78" y="50" width="124" height="72" rx="4" fill="url(#wb-screen)" />
      <rect x="88" y="62" width="50" height="6" rx="3" fill="#7DD3FC" opacity=".9" />
      <rect x="88" y="74" width="34" height="5" rx="2.5" fill="#94A3B8" opacity=".6" />
      <path d="M88 108h12l8-10 10 6 12-16 10 8 12-12" stroke={SKY} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="182" cy="86" r="16" stroke="#1E3A5F" strokeWidth="6" />
      <path d="M182 70a16 16 0 0 1 15 21" stroke={AMBER} strokeWidth="6" strokeLinecap="round" />
      <path d="M56 130h168l-10 12H66l-10-12Z" fill="#334155" />
      {/* Điện thoại */}
      <rect x="214" y="70" width="38" height="70" rx="7" fill="#1E293B" stroke="#475569" strokeWidth="2" />
      <rect x="219" y="77" width="28" height="54" rx="3" fill="#0B1A2E" />
      <path d="m226 104 5 5 9-11" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Cờ lê */}
      <g transform="rotate(-35 40 120)">
        <rect x="34" y="96" width="10" height="52" rx="5" fill="#CBD5E1" />
        <path d="M27 92a13 13 0 1 1 24 0l-6-4h-12l-6 4Z" fill="#CBD5E1" />
      </g>
      {/* Bánh răng */}
      <g transform="translate(236 34)">
        <circle r="13" fill={AMBER} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-3" y="-18" width="6" height="8" rx="1.5" fill={AMBER} transform={`rotate(${i * 45})`} />
        ))}
        <circle r="5" fill="#0B1220" />
      </g>
      <circle cx="40" cy="40" r="3" fill={SKY} />
      <circle cx="262" cy="160" r="2.5" fill={SKY} />
      <defs>
        <radialGradient id="wb-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(170 86) scale(78)">
          <stop stopColor={SKY} stopOpacity=".35" />
          <stop offset="1" stopColor={SKY} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wb-screen" x1="78" y1="50" x2="202" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C2440" />
          <stop offset="1" stopColor="#06101F" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Trang 404: điện thoại "lạc đường" với màn hình 404 và con ốc rơi ra. */
export function LostDeviceIllustration({ className = 'h-48 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none">
      <ellipse cx="100" cy="186" rx="56" ry="7" fill="#E2E8F0" />
      <g transform="rotate(-8 100 96)">
        <rect x="60" y="20" width="80" height="150" rx="14" fill="#1E293B" stroke="#475569" strokeWidth="3" />
        <rect x="68" y="32" width="64" height="124" rx="6" fill="url(#ld-screen)" />
        <text x="100" y="98" textAnchor="middle" fontSize="26" fontWeight="700" fill="#E0F2FE" fontFamily="Inter Variable, Inter, sans-serif">404</text>
        <path d="M76 52l18 22-10 14 22 30" stroke={SKY} strokeWidth="1.5" opacity=".7" />
        <rect x="88" y="138" width="24" height="5" rx="2.5" fill={P} />
      </g>
      <g transform="translate(152 150) rotate(30)">
        <rect x="-2.5" y="-2" width="5" height="18" rx="2" fill="#94A3B8" />
        <rect x="-7" y="-6" width="14" height="5" rx="2" fill="#CBD5E1" />
      </g>
      <circle cx="40" cy="60" r="4" fill={AMBER} />
      <circle cx="166" cy="42" r="3" fill={SKY} />
      <defs>
        <linearGradient id="ld-screen" x1="68" y1="32" x2="132" y2="156" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C4A6E" />
          <stop offset="1" stopColor="#0B1220" />
        </linearGradient>
      </defs>
    </svg>
  )
}
