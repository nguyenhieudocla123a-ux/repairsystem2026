import { CheckOutlined, LaptopOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Card, DatePicker, Descriptions, Form, Input, Radio, Select, Skeleton, Steps } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/PageHeader'
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'
import { CustomerSelect } from '@/features/customers/components/CustomerSelect'
import { customersApi } from '@/features/customers/customersApi'
import { DeviceFormModal } from '@/features/devices/components/DeviceFormModal'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import { TechnicianSelect } from '@/features/users/components/TechnicianSelect'
import { usersApi } from '@/features/users/usersApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import type { RepairPriority } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { REPAIR_PRIORITY_CONFIG } from '../constants/status'
import { repairRequestsApi, repairsApi, type RepairRequestResponse } from '../repairsApi'

const ACCESSORY_SUGGESTIONS = ['Sạc', 'Cáp', 'Ốp lưng', 'SIM', 'Thẻ nhớ', 'Hộp', 'Bút cảm ứng', 'Túi chống sốc']

const conditionSchema = z.object({
  reportedIssue: z.string().trim().min(1, 'Vui lòng mô tả lỗi khách báo').max(2000),
  deviceCondition: z.string().max(2000),
  accessories: z.array(z.string()),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  expectedReturnDate: z.string().optional(),
  technicianId: z.number().optional(),
})
type ConditionForm = z.infer<typeof conditionSchema>

/**
 * Wizard tiếp nhận thiết bị (docs/ui-ux-design.md §4.3).
 * - Tại quầy: chọn/tạo khách → chọn/tạo thiết bị → tình trạng → xác nhận → POST /repair-orders
 * - Từ yêu cầu online: khách & thiết bị điền sẵn → POST /repair-requests/{id}/convert
 */
export function ReceptionPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [params] = useSearchParams()
  const request = (useLocation().state as { request?: RepairRequestResponse } | null)?.request

  const [step, setStep] = useState(request ? 2 : params.get('customerId') ? 1 : 0)
  const [customerId, setCustomerId] = useState<number | undefined>(request?.customerId ?? (Number(params.get('customerId')) || undefined))
  const [deviceId, setDeviceId] = useState<number | undefined>(request?.device.id)
  const [modal, setModal] = useState<'customer' | 'device' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const customer = useAsyncData(() => (customerId ? customersApi.get(customerId) : Promise.resolve(undefined)), [customerId])
  const devices = useAsyncData(() => (customerId ? customersApi.devices(customerId) : Promise.resolve([])), [customerId])
  const technicians = useAsyncData(() => usersApi.technicians(), [])
  const device = devices.data?.find((d) => d.id === deviceId) ?? (request && request.device.id === deviceId ? request.device : undefined)

  const { control, handleSubmit, trigger, getValues, setError, formState } = useForm<ConditionForm>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { reportedIssue: request?.issueDescription ?? '', deviceCondition: '', accessories: [], priority: 'NORMAL' },
  })

  const submit = handleSubmit(async (values) => {
    setSubmitError(null)
    const body = {
      reportedIssue: values.reportedIssue,
      deviceCondition: values.deviceCondition || undefined,
      accessories: values.accessories.length ? values.accessories.join(', ') : undefined,
      priority: values.priority,
      expectedReturnDate: values.expectedReturnDate,
      technicianId: values.technicianId,
    }
    try {
      const order = request
        ? await repairRequestsApi.convert(request.id, body)
        : await repairsApi.create({ ...body, customerId: customerId!, deviceId: deviceId! })
      message.success(`Đã tạo phiếu ${order.code}`)
      navigate(`/repairs/${order.id}`, { replace: true })
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, Object.keys(conditionSchema.shape))) setSubmitError(getErrorMessage(error))
    }
  })

  const steps = [
    {
      title: 'Khách hàng',
      content: (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <CustomerSelect
                value={customerId}
                onChange={(v) => {
                  setCustomerId(v)
                  setDeviceId(undefined)
                }}
              />
            </div>
            <Button icon={<UserAddOutlined />} onClick={() => setModal('customer')}>Khách mới</Button>
          </div>
          {customer.data && (
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label="Khách hàng">{customer.data.fullName} ({customer.data.code})</Descriptions.Item>
              <Descriptions.Item label="SĐT">{customer.data.phone}</Descriptions.Item>
              <Descriptions.Item label="Thiết bị">{customer.data.deviceCount}</Descriptions.Item>
              <Descriptions.Item label="Phiếu đã sửa">{customer.data.repairOrderCount}</Descriptions.Item>
            </Descriptions>
          )}
        </div>
      ),
      canNext: Boolean(customerId),
    },
    {
      title: 'Thiết bị',
      content: devices.loading ? (
        <Skeleton active />
      ) : (
        <div className="flex flex-col gap-3">
          {devices.data?.length ? (
            <Radio.Group value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="!grid gap-3 sm:grid-cols-2">
              {devices.data.map((d) => (
                <Radio.Button
                  key={d.id}
                  value={d.id}
                  className="!h-auto !rounded-lg !border !px-4 !py-3 before:!hidden"
                  aria-label={d.name}
                >
                  <span className="flex items-start gap-3">
                    <LaptopOutlined className="mt-1 text-lg text-text-secondary" />
                    <span className="flex flex-col leading-snug">
                      <span className="font-medium text-text">{d.name}</span>
                      <span className="text-xs text-text-secondary">
                        {DEVICE_TYPE_LABELS[d.deviceType]} · {[d.brand, d.model].filter(Boolean).join(' ') || '—'}
                      </span>
                      {d.serialNumber && <span className="font-mono text-xs text-text-muted">{d.serialNumber}</span>}
                    </span>
                  </span>
                </Radio.Button>
              ))}
            </Radio.Group>
          ) : (
            <EmptyState compact title="Khách chưa có thiết bị" description="Thêm thiết bị để tiếp tục." />
          )}
          <div>
            <Button icon={<PlusOutlined />} onClick={() => setModal('device')}>Thiết bị mới</Button>
          </div>
        </div>
      ),
      canNext: Boolean(deviceId),
    },
    {
      title: 'Tình trạng',
      content: (
        <Form layout="vertical" component="div">
          <FormField control={control} name="reportedIssue" label="Lỗi khách báo" required render={(f) => <Input.TextArea {...f} rows={3} placeholder="VD: Màn hình sọc, cảm ứng không nhận" />} />
          <FormField control={control} name="deviceCondition" label="Tình trạng ngoại quan khi nhận" extra="Ghi rõ trầy xước, móp, vỡ... để tránh tranh chấp khi trả máy" render={(f) => <Input.TextArea {...f} rows={2} />} />
          <div className="grid gap-x-4 md:grid-cols-2">
            <FormField
              control={control}
              name="accessories"
              label="Phụ kiện kèm theo"
              render={(f) => (
                <Select {...f} mode="tags" placeholder="Chọn hoặc gõ thêm" options={ACCESSORY_SUGGESTIONS.map((a) => ({ value: a, label: a }))} />
              )}
            />
            <FormField
              control={control}
              name="priority"
              label="Độ ưu tiên"
              render={(f) => (
                <Select {...f} options={(Object.keys(REPAIR_PRIORITY_CONFIG) as RepairPriority[]).map((p) => ({ value: p, label: REPAIR_PRIORITY_CONFIG[p].label }))} />
              )}
            />
            <Controller
              control={control}
              name="expectedReturnDate"
              render={({ field }) => (
                <Form.Item label="Ngày hẹn trả" htmlFor="expectedReturnDate">
                  <DatePicker
                    id="expectedReturnDate"
                    className="w-full"
                    format="DD/MM/YYYY"
                    disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : undefined)}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="technicianId"
              render={({ field }) => (
                <Form.Item label="Phân công kỹ thuật viên" htmlFor="technicianId" extra="Có thể phân công sau">
                  <TechnicianSelect id="technicianId" value={field.value} onChange={field.onChange} />
                </Form.Item>
              )}
            />
          </div>
        </Form>
      ),
      canNext: true,
    },
    {
      title: 'Xác nhận',
      content: (
        <div className="flex flex-col gap-4">
          {submitError && <Alert type="error" showIcon title={submitError} role="alert" />}
          <Descriptions bordered size="small" column={1}>
            {request && <Descriptions.Item label="Từ yêu cầu online">{request.code}</Descriptions.Item>}
            <Descriptions.Item label="Khách hàng">{customer.data ? `${customer.data.fullName} · ${customer.data.phone}` : request?.customerName}</Descriptions.Item>
            <Descriptions.Item label="Thiết bị">{device?.name ?? '—'}{device?.serialNumber ? ` · ${device.serialNumber}` : ''}</Descriptions.Item>
            <Descriptions.Item label="Lỗi khách báo">{getValues('reportedIssue')}</Descriptions.Item>
            <Descriptions.Item label="Tình trạng khi nhận">{getValues('deviceCondition') || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phụ kiện">{getValues('accessories').join(', ') || 'Không'}</Descriptions.Item>
            <Descriptions.Item label="Ưu tiên">{REPAIR_PRIORITY_CONFIG[getValues('priority')].label}</Descriptions.Item>
            <Descriptions.Item label="Kỹ thuật viên">
              {technicians.data?.find((t) => t.id === getValues('technicianId'))?.fullName ?? 'Chưa phân công'}
            </Descriptions.Item>
            <Descriptions.Item label="Hẹn trả">{getValues('expectedReturnDate') ? dayjs(getValues('expectedReturnDate')).format('DD/MM/YYYY') : 'Chưa hẹn'}</Descriptions.Item>
          </Descriptions>
        </div>
      ),
      canNext: true,
    },
  ]

  const next = async () => {
    if (step === 2 && !(await trigger())) return
    setStep((s) => s + 1)
  }
  const firstStep = request ? 2 : 0

  return (
    <>
      <PageHeader
        title="Tiếp nhận thiết bị"
        description={request ? `Tiếp nhận từ yêu cầu online ${request.code} của ${request.customerName}` : 'Tạo phiếu sửa chữa khi khách mang máy tới quầy.'}
      />
      <Card>
        <Steps current={step} items={steps.map((s) => ({ title: s.title }))} className="mb-8" responsive />
        <div className="mx-auto max-w-3xl">{steps[step].content}</div>
        <div className="mx-auto mt-8 flex max-w-3xl justify-between">
          <Button disabled={step === firstStep} onClick={() => setStep((s) => s - 1)}>Quay lại</Button>
          {step < steps.length - 1 ? (
            <Button type="primary" disabled={!steps[step].canNext} onClick={next}>Tiếp tục</Button>
          ) : (
            <Button type="primary" icon={<CheckOutlined />} loading={formState.isSubmitting} onClick={submit}>Tạo phiếu sửa chữa</Button>
          )}
        </div>
      </Card>

      {modal === 'customer' && (
        <CustomerFormModal
          onClose={() => setModal(null)}
          onSaved={(c) => {
            setModal(null)
            setCustomerId(c.id)
            setDeviceId(undefined)
            setStep(1)
          }}
        />
      )}
      {modal === 'device' && customerId && (
        <DeviceFormModal
          mode="staff"
          fixedCustomerId={customerId}
          onClose={() => setModal(null)}
          onSaved={(d) => {
            setModal(null)
            devices.reload()
            setDeviceId(d.id)
          }}
        />
      )}
    </>
  )
}
