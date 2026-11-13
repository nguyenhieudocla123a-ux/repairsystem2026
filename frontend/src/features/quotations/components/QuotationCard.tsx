import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons'
import { App, Button, Card, Input, Space, Table, Tag } from 'antd'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { PART_GRADE_CONFIG } from '@/features/inventory/inventoryApi'
import { QUOTATION_STATUS_CONFIG } from '@/features/repairs/constants/status'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { quotationsApi, type Quotation, type QuotationItem } from '../quotationsApi'

export interface QuotationCardProps {
  quotation: Quotation
  /** 'staff' quản lý nháp & xác nhận thay khách; 'customer' tự đồng ý / từ chối */
  viewer: 'staff' | 'customer' | 'readonly'
  onEdit?: () => void
  /** Sau mọi thao tác làm đổi trạng thái phiếu → trang cha tải lại phiếu + báo giá */
  onChanged: () => void
}

/** Một phiên bản báo giá: bảng dòng, tổng tiền, và các hành động hợp lệ theo trạng thái & người xem. */
export function QuotationCard({ quotation: q, viewer, onEdit, onChanged }: QuotationCardProps) {
  const { modal, message } = App.useApp()
  const muted = q.status === 'SUPERSEDED'

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      message.success(success)
      onChanged()
    } catch (e) {
      message.error(getErrorMessage(e))
      throw e
    }
  }

  const respond = (approve: boolean) => {
    let note = ''
    const onBehalf = viewer === 'staff'
    modal.confirm({
      title: approve ? `Đồng ý báo giá ${formatMoneyShort(q.totalAmount)}?` : 'Từ chối báo giá?',
      content: (
        <div className="flex flex-col gap-2">
          {approve && !onBehalf && <p className="m-0">Cửa hàng sẽ tiến hành sửa chữa theo báo giá này.</p>}
          {!approve && !onBehalf && <p className="m-0">Bạn có thể nhận lại máy hoặc chờ cửa hàng gửi báo giá khác.</p>}
          <Input.TextArea
            aria-label="Ghi chú"
            rows={3}
            placeholder={onBehalf ? 'Bắt buộc: khách xác nhận thế nào? VD "Khách đồng ý qua điện thoại lúc 10h"' : approve ? 'Lời nhắn cho cửa hàng (không bắt buộc)' : 'Lý do (không bắt buộc), VD: giá cao'}
            onChange={(e) => (note = e.target.value)}
          />
        </div>
      ),
      okText: approve ? 'Đồng ý sửa' : 'Từ chối',
      okButtonProps: { danger: !approve },
      cancelText: 'Đóng',
      onOk: () => {
        if (onBehalf && !note.trim()) {
          message.warning('Vui lòng ghi chú cách khách xác nhận')
          return Promise.reject(new Error('note required'))
        }
        return run(
          () => (approve ? quotationsApi.approve(q.id, note || undefined) : quotationsApi.reject(q.id, note || undefined)),
          approve ? 'Đã xác nhận đồng ý báo giá' : 'Đã từ chối báo giá',
        )
      },
    })
  }

  const send = () =>
    modal.confirm({
      title: `Gửi báo giá v${q.versionNo} cho khách?`,
      content: <>Tổng <MoneyText value={q.totalAmount} className="font-semibold" />. Phiếu sẽ chuyển sang "Chờ khách xác nhận" và không sửa báo giá này được nữa.</>,
      okText: 'Gửi cho khách',
      cancelText: 'Đóng',
      onOk: () => run(() => quotationsApi.send(q.id), 'Đã gửi báo giá cho khách'),
    })

  const remove = () =>
    modal.confirm({
      title: `Xóa báo giá nháp v${q.versionNo}?`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: () => run(() => quotationsApi.remove(q.id), 'Đã xóa báo giá nháp'),
    })

  const actions =
    q.status === 'DRAFT' && viewer === 'staff' ? (
      <Space wrap>
        <Button icon={<EditOutlined />} onClick={onEdit}>Sửa</Button>
        <Button danger icon={<DeleteOutlined />} aria-label="Xóa báo giá nháp" onClick={remove} />
        <Button type="primary" icon={<SendOutlined />} onClick={send}>Gửi cho khách</Button>
      </Space>
    ) : q.status === 'SENT' && viewer !== 'readonly' ? (
      <Space wrap>
        <Button icon={<CloseOutlined />} onClick={() => respond(false)}>{viewer === 'staff' ? 'Khách từ chối' : 'Từ chối'}</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={() => respond(true)}>{viewer === 'staff' ? 'Khách đồng ý' : 'Đồng ý sửa'}</Button>
      </Space>
    ) : null

  return (
    <Card
      size="small"
      className={muted ? 'opacity-60' : q.status === 'SENT' ? '!border-warning' : ''}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Báo giá v{q.versionNo} <StatusTag value={q.status} config={QUOTATION_STATUS_CONFIG} />
        </span>
      }
      extra={<MoneyText value={q.totalAmount} className="text-base font-semibold" />}
    >
      <Table<QuotationItem>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={q.items}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'Hạng mục',
            dataIndex: 'description',
            render: (v: string, i) => (
              <div>
                <span>{v} {i.itemType === 'LABOR' && <span className="text-xs text-text-muted">(tiền công)</span>}</span>
                {i.itemType === 'PART' && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    {i.partGrade && <Tag color={PART_GRADE_CONFIG[i.partGrade].color} className="!m-0">{PART_GRADE_CONFIG[i.partGrade].label}</Tag>}
                    {i.warrantyMonths !== null && (
                      <span className={i.warrantyMonths > 0 ? 'text-success' : 'text-text-muted'}>
                        <SafetyCertificateOutlined /> {i.warrantyMonths > 0 ? `Bảo hành ${i.warrantyMonths} tháng` : 'Không bảo hành'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ),
          },
          { title: 'SL', dataIndex: 'quantity', align: 'right', width: 60 },
          { title: 'Đơn giá', dataIndex: 'unitPrice', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Thành tiền', dataIndex: 'lineTotal', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        ]}
        summary={() => (
          <>
            {q.discount > 0 && (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right">Giảm giá</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><MoneyText value={-q.discount} /></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3} align="right"><strong>Tổng cộng</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><MoneyText value={q.totalAmount} className="font-semibold" /></Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )}
      />
      <div className="mt-3 flex flex-col gap-1 text-sm text-text-secondary">
        {q.note && <div>Ghi chú: <span className="text-text">{q.note}</span></div>}
        {q.validUntil && q.status === 'SENT' && <div>Hiệu lực đến {formatDate(q.validUntil)}</div>}
        {q.sentAt && <div>Gửi lúc {formatDateTime(q.sentAt)}{viewer === 'staff' && ` · lập bởi ${q.createdByName}`}</div>}
        {q.respondedAt && (
          <div>
            Phản hồi lúc {formatDateTime(q.respondedAt)}
            {viewer === 'staff' && q.respondedByName && ` · ${q.respondedByName}`}
            {q.customerResponseNote && <>: <span className="text-text">"{q.customerResponseNote}"</span></>}
          </div>
        )}
      </div>
      {actions && <div className="mt-4 flex justify-end">{actions}</div>}
    </Card>
  )
}

function formatMoneyShort(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}
