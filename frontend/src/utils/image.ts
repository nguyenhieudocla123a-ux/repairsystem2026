/**
 * Chuẩn bị ảnh đại diện ở client: cắt vuông giữa ảnh, thu về tối đa `size`×`size`, nén WebP (JPEG nếu trình duyệt
 * không hỗ trợ). Ảnh gửi lên thường chỉ 20–60 KB thay vì vài MB ảnh gốc từ điện thoại.
 * Đọc qua <img> + canvas cũng loại bỏ metadata EXIF (vị trí GPS…) khỏi ảnh gốc.
 */
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024

export async function prepareAvatar(file: File, size = 512): Promise<Blob> {
  if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
    throw new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP')
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error('Ảnh gốc tối đa 10 MB')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Không đọc được ảnh'))
      el.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const target = Math.min(size, side)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = target
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, target, target)
    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88))
    const blob = (await toBlob('image/webp')) ?? (await toBlob('image/jpeg'))
    if (!blob) throw new Error('Không nén được ảnh')
    // Một số trình duyệt trả PNG khi không hỗ trợ WebP → ép JPEG cho nhẹ
    return blob.type === 'image/png' ? ((await toBlob('image/jpeg')) ?? blob) : blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
