import { CameraOutlined, DeleteOutlined } from '@ant-design/icons'
import { App, Button, Modal } from 'antd'
import { useRef, useState } from 'react'
import { getErrorMessage } from '@/utils/errors'
import { AVATAR_ACCEPT, prepareAvatar } from '@/utils/image'
import { inventoryApi, type PartResponse } from '../inventoryApi'
import { PartImage } from './PartImage'

/** Đổi / xoá ảnh linh kiện nhanh từ danh sách (ảnh nén WebP ở trình duyệt trước khi gửi). */
export function PartImageModal({ part, onClose, onSaved }: { part: PartResponse; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      const blob = await prepareAvatar(file, 640)
      if (preview) URL.revokeObjectURL(preview.url)
      setPreview({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      message.error(getErrorMessage(e))
    }
  }

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setSaving(true)
    try {
      await action()
      message.success(ok)
      onSaved()
    } catch (e) {
      message.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Ảnh linh kiện – ${part.sku}`} onCancel={onClose} maskClosable={false}
      okText="Lưu ảnh" cancelText="Hủy" okButtonProps={{ disabled: !preview }} confirmLoading={saving}
      onOk={() => preview && run(() => inventoryApi.uploadImage(part.id, preview.blob), 'Đã cập nhật ảnh linh kiện')}>
      <div className="flex flex-col items-center gap-3 py-2">
        {preview ? (
          <img src={preview.url} alt="Ảnh mới chọn" className="size-56 rounded-xl object-cover ring-1 ring-black/10" />
        ) : (
          <PartImage partId={part.id} categoryCode={part.categoryCode} version={part.imageUpdatedAt} size={224} className="rounded-xl" alt={part.name} />
        )}
        <span className="text-sm text-text-secondary">
          {preview ? 'Ảnh mới – bấm "Lưu ảnh" để áp dụng' : part.imageUpdatedAt ? 'Ảnh hiện tại của linh kiện' : 'Đang dùng ảnh mặc định của nhóm'}
        </span>
        <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} className="hidden" aria-hidden="true" tabIndex={-1}
          onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        <div className="flex gap-2">
          <Button icon={<CameraOutlined />} onClick={() => fileRef.current?.click()}>Chọn ảnh khác</Button>
          {part.imageUpdatedAt && !preview && (
            <Button danger icon={<DeleteOutlined />} loading={saving}
              onClick={() => run(() => inventoryApi.deleteImage(part.id), 'Đã xoá ảnh – dùng ảnh mặc định của nhóm')}>
              Xoá ảnh
            </Button>
          )}
        </div>
        <span className="text-xs text-text-muted">JPEG, PNG hoặc WebP · tự cắt vuông và nén trước khi tải lên</span>
      </div>
    </Modal>
  )
}
