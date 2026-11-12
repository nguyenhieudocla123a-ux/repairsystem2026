import { SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, App, Button, Descriptions, Input, Modal, Skeleton, Tag, Timeline } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/ErrorState'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { CLAIM_STATUS_CONFIG, warrantiesApi } from '../warrantiesApi'
import { WarrantyStatusBadge } from './WarrantyStatusBadge'

/** Chi tiết bảo hành + lịch sử yêu cầu bảo hành + tạo yêu cầu mới (khách hoặc nhân viên). */
export function WarrantyDetailModal({ warrantyId, viewer, onClose, onChanged }: { warrantyId: number; viewer: 'staff' | 'customer'; onClose: () => void; onChanged?: () => void }) {
  const { message } = App.useApp()
  const { data, loading, error, reload } = useAsyncData(() => warrantiesApi.get(warrantyId), [warrantyId])
  const [issue, setIssue] = useState('')
  const [sending, setSending] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  const submitClaim = async () => {
    if (!issue.trim()) return setClaimError('Vui lòng mô tả lỗi cần bảo hành')
    setSending(true)
    setClaimError(null)
    try {
      const c = await warrantiesApi.createClaim(warrantyId, issue)
      message.success(viewer === 'customer' ? `Đã gửi yêu cầu ${c.code}. Cửa hàng sẽ liên hệ bạn.` : `Đã tạo yêu cầu ${c.code}`)
      setIssue('')
      reload()
      onChanged?.()
    } catch (e) {
      setClaimError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const w = data?.warranty
  return (
    <Modal open width={680} title={<span className="flex items-center gap-2"><SafetyCertificateOutlined /> Bảo hành {w?.code ?? ''}</span>} footer={null} onCancel={onClose}>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data || !w ? (
        <Skeleton active />
      ) : (
        <div className="flex flex-col gap-5">
          <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
            <Descriptions.Item label="Tình trạng" span={2}><WarrantyStatusBadge valid={w.valid} voided={w.status === 'VOID'} daysRemaining={w.daysRemaining} /></Descriptions.Item>
            <Descriptions.Item label="Thiết bị" span={2}>
              {w.device.name} · {DEVICE_TYPE_LABELS[w.device.deviceType]}{w.device.serialNumber && <span className="font-mono text-xs"> · {w.device.serialNumber}</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Hiệu lực">{formatDate(w.startDate)} → {formatDate(w.endDate)}</Descriptions.Item>
            <Descriptions.Item label="Thời hạn">{w.months} tháng</Descriptions.Item>
            <Descriptions.Item label="Phiếu sửa chữa" span={2}>
              <Link to={viewer === 'customer' ? `/my/repairs/${w.repairOrderId}` : `/repairs/${w.repairOrderId}`} onClick={onClose} className="font-mono">{w.repairOrderCode}</Link>
              {viewer === 'staff' && <span> · {w.customerName}</span>}
            </Descriptions.Item>
            {w.terms && <Descriptions.Item label="Điều kiện" span={2}>{w.terms}</Descriptions.Item>}
            {w.voidReason && <Descriptions.Item label="Lý do hủy" span={2}>{w.voidReason}</Descriptions.Item>}
          </Descriptions>

          <section aria-label="Lịch sử yêu cầu bảo hành">
            <h3 className="mt-0 mb-3 text-base font-semibold">Lịch sử yêu cầu bảo hành</h3>
            {data.claims.length ? (
              <Timeline
                items={data.claims.map((c) => ({
                  color: c.status === 'REJECTED' ? 'red' : c.status === 'RESOLVED' ? 'green' : 'blue',
                  children: (
                    <div className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{c.code}</span>
                        <Tag color={CLAIM_STATUS_CONFIG[c.status].color} className="m-0">{CLAIM_STATUS_CONFIG[c.status].label}</Tag>
                        <span className="text-xs text-text-muted">{formatDateTime(c.createdAt)}</span>
                      </span>
                      <span>{c.issueDescription}</span>
                      {c.repairOrderCode && (
                        <span className="text-sm">Phiếu bảo hành: <Link to={viewer === 'customer' ? `/my/repairs/${c.repairOrderId}` : `/repairs/${c.repairOrderId}`} onClick={onClose} className="font-mono">{c.repairOrderCode}</Link></span>
                      )}
                      {c.resolutionNote && <span className="text-sm text-text-secondary">Ghi chú xử lý: {c.resolutionNote}</span>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <p className="m-0 text-text-secondary">Chưa có yêu cầu bảo hành nào.</p>
            )}
          </section>

          {data.canClaim ? (
            <section aria-label="Gửi yêu cầu bảo hành" className="rounded-lg bg-tone-neutral-bg p-4">
              <h3 className="mt-0 mb-2 text-base font-semibold">{viewer === 'customer' ? 'Gửi yêu cầu bảo hành' : 'Tiếp nhận yêu cầu bảo hành'}</h3>
              {claimError && <Alert type="error" showIcon title={claimError} className="mb-3" role="alert" />}
              <Input.TextArea aria-label="Mô tả lỗi cần bảo hành" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="VD: Màn hình lại bị sọc sau 2 tuần" maxLength={2000} showCount />
              <div className="mt-3 flex justify-end">
                <Button type="primary" loading={sending} onClick={submitClaim}>Gửi yêu cầu</Button>
              </div>
            </section>
          ) : (
            w.valid && <Alert type="info" showIcon title="Bảo hành này đang có một yêu cầu chưa xử lý xong." />
          )}
        </div>
      )}
    </Modal>
  )
}
