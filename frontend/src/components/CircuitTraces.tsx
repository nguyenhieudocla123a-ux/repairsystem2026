/**
 * Nền "bo mạch" phát sáng cho panel trang công khai: các đường mạch gấp khúc 45°, nút hàn tròn,
 * và các xung sáng chạy dọc đường mạch (stroke-dasharray + animation CSS, dừng khi .rf-motion-paused).
 * Trang trí thuần → aria-hidden. Toạ độ cố định trong viewBox 840×900, co giãn theo khung (slice).
 */
const TRACES = [
  'M0 140 H120 L170 190 H330',
  'M0 520 H90 L150 460 H260 L300 420',
  'M840 80 H700 L650 130 H560',
  'M840 300 H760 L720 340 V470 L760 510 H840',
  'M60 900 V780 L110 730 H230',
  'M420 900 V820 L470 770 H600 L640 730',
  'M840 620 H720 L680 660 V760',
  'M200 0 V60 L250 110 H400',
  'M0 330 H60 L100 370 V430',
  'M560 0 V40 L600 80 H660',
]
const NODES: [number, number][] = [
  [330, 190], [300, 420], [560, 130], [720, 470], [230, 730], [640, 730], [680, 760], [400, 110], [100, 430], [660, 80],
]

export function CircuitTraces({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 840 900" preserveAspectRatio="xMidYMid slice" className={className} fill="none">
      <defs>
        <filter id="rf-trace-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Đường mạch tĩnh, mờ */}
      <g stroke="#38BDF8" strokeOpacity="0.16" strokeWidth="1.5">
        {TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* Nút hàn */}
      <g fill="#0B1220" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.5">
        {NODES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />
        ))}
      </g>
      {/* Xung sáng chạy dọc đường mạch */}
      <g stroke="#67E8F9" strokeWidth="2.5" strokeLinecap="round" filter="url(#rf-trace-glow)">
        {TRACES.map((d, i) => (
          <path key={`p-${d}`} d={d} className="rf-trace-pulse" pathLength={100} style={{ animationDelay: `${(i * 0.73) % 5}s` }} />
        ))}
      </g>
    </svg>
  )
}
