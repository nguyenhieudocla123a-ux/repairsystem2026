import { SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Descriptions, Input } from 'antd'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import { WarrantyStatusBadge } from '../components/WarrantyStatusBadge'
import { warrantiesApi, type PublicWarrantyCheck } from '../warrantiesApi'

/**
 * Tra cứu bảo hành công khai (không cần đăng nhập) – GET /public/warranty-check.
 * Backend chỉ trả model + serial đã che + thời hạn, không có dữ liệu cá nhân; giới hạn 10 lần/phút/IP.
 */
export function PublicWarrantyCheckPage() {
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState<PublicWarrantyCheck | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const k = keyword.trim()
    if (k.length < 4) return setError('Nhập ít nhất 4 ký tự: mã bảo hành, mã phiếu sửa hoặc serial')
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await warrantiesApi.publicCheck(k))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="mt-0 mb-2 text-2xl font-bold">Tra cứu bảo hành</h1>
      <p className="mt-0 mb-6 text-text-secondary">Nhập mã bảo hành (WR-…), mã phiếu sửa chữa (RO-…) hoặc số serial in trên thiết bị.</p>
      <form onSubmit={submit} className="flex gap-2" role="search">
        <Input size="large" aria-label="Mã bảo hành, mã phiếu hoặc serial" placeholder="VD WR-2026-000001" value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<SearchOutlined className="text-text-muted" />} autoFocus />
        <Button size="large" type="primary" htmlType="submit" loading={loading}>Tra cứu</Button>
      </form>

      <div aria-live="polite" className="mt-6">
        {error && <Alert type="error" showIcon title={error} role="alert" />}
        {result && (
          <Descriptions column={1} size="small" bordered title={<span className="font-mono">{result.warrantyCode}</span>}>
            <Descriptions.Item label="Tình trạng"><WarrantyStatusBadge valid={result.valid} voided={false} daysRemaining={result.daysRemaining} /></Descriptions.Item>
            <Descriptions.Item label="Thiết bị">{result.deviceModel}</Descriptions.Item>
            {result.serialMasked && <Descriptions.Item label="Serial"><span className="font-mono">{result.serialMasked}</span></Descriptions.Item>}
            <Descriptions.Item label="Hiệu lực">{formatDate(result.startDate)} → {formatDate(result.endDate)}</Descriptions.Item>
            {result.items.length > 0 && (
              <Descriptions.Item label="Từng hạng mục">
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {result.items.map((i, idx) => (
                    <li key={`${i.description}-${idx}`} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{i.description}</span>
                      <span className={`text-sm ${i.valid ? 'text-success' : 'text-text-muted'}`}>{i.valid ? 'còn đến' : 'hết hạn'} {formatDate(i.endDate)}</span>
                    </li>
                  ))}
                </ul>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </div>

      <p className="mt-8 text-center text-text-secondary">
        Muốn gửi yêu cầu bảo hành? <Link to="/login">Đăng nhập</Link> để vào mục Bảo hành của tôi.
      </p>
    </>
  )
}
