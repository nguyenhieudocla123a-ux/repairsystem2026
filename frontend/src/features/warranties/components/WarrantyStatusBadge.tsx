import { CheckCircleFilled, CloseCircleFilled, StopFilled } from '@ant-design/icons'

/** Còn hạn / hết hạn / đã hủy – luôn có chữ + icon, không chỉ dựa vào màu. */
export function WarrantyStatusBadge({ valid, voided, daysRemaining }: { valid: boolean; voided: boolean; daysRemaining: number }) {
  if (voided) {
    return <span className="inline-flex items-center gap-1.5 font-medium text-text-secondary"><StopFilled aria-hidden="true" /> Đã hủy bảo hành</span>
  }
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <CheckCircleFilled aria-hidden="true" /> Còn hạn{daysRemaining >= 0 && <span className="font-normal text-text-secondary">· còn {daysRemaining} ngày</span>}
      </span>
    )
  }
  return <span className="inline-flex items-center gap-1.5 font-medium text-error"><CloseCircleFilled aria-hidden="true" /> Hết hạn</span>
}
