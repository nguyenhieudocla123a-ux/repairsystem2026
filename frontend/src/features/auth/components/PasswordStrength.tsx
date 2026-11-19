import { passwordLevel, type PasswordLevel } from '../schemas'

const LEVELS: Record<Exclude<PasswordLevel, 0>, { label: string; bar: string; text: string }> = {
  1: { label: 'Yếu', bar: 'bg-red-500', text: 'text-red-500' },
  2: { label: 'Trung bình', bar: 'bg-amber-400', text: 'text-amber-400' },
  3: { label: 'Mạnh', bar: 'bg-emerald-500', text: 'text-emerald-500' },
}

/** Thanh độ mạnh mật khẩu 3 nấc đỏ / vàng / xanh. Yêu cầu chưa đạt hiện dưới dạng lỗi của ô mật khẩu. */
export function PasswordStrength({ value }: { value: string }) {
  const level = passwordLevel(value)
  if (level === 0) return null
  const cfg = LEVELS[level]
  return (
    <div className="-mt-3 mb-5 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= level ? cfg.bar : 'bg-border'}`} />
        ))}
      </div>
      <span className={`w-20 text-right text-xs font-medium ${cfg.text}`}>
        <span className="sr-only">Độ mạnh mật khẩu: </span>{cfg.label}
      </span>
    </div>
  )
}
