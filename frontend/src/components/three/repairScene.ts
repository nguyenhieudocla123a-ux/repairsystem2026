import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Cảnh "kỹ thuật viên sửa điện thoại" phong cách neon công nghệ:
 * - Bên trái: anh thợ (ảnh 3D render từ Adobe Stock #1677010084, đã tách nền bằng Photoshop API, nhãn áo đổi
 *   thành REPAIRFLOW) – thở, đung đưa nhẹ, quầng sáng xanh phía sau; trên máy tính bảng nổi một bảng hologram
 *   chẩn đoán (4 hạng mục chạy dần, % tiến độ, sóng tín hiệu) với chùm sáng hắt lên và hạt sáng bay lên.
 * - Vệt quét chạy dọc màn hình điện thoại, đồng bộ với % chẩn đoán.
 * - Bên phải: điện thoại 3D (khung titan, kính phản chiếu, cụm camera…) với màn hình cắt lớp – nửa giao diện
 *   theo dõi phiếu, nửa lộ bo mạch/pin; cụm camera và bo mạch văng ra, tia lửa bắn ở góc máy,
 *   hai vệt sáng năng lượng xoáy quanh máy.
 * Điện thoại và linh kiện dựng bằng hình học thủ tục (không tải mô hình ngoài).
 *
 * Quy tắc hiệu năng (ui-ux-pro-max – stack threejs):
 * - Mọi geometry/material/texture tạo MỘT lần; vòng lặp chỉ đổi transform.
 * - setAnimationLoop → dừng khi tab ẩn hoặc canvas ra khỏi màn hình; dispose() giải phóng hết tài nguyên GPU.
 * - Trang công khai luôn có chuyển động (yêu cầu của chủ sản phẩm) nhưng có nút tạm dừng → setAnimate(false)
 *   dừng vòng lặp và giữ nguyên khung hình hiện tại (WCAG 2.2.2).
 */
export interface RepairSceneOptions {
  /** false = đứng yên (người dùng bấm tạm dừng) */
  animate: boolean
  /** hero: panel lớn trang công khai (cụm lệch phải chừa chỗ tiêu đề) · banner: khung thấp trong dashboard */
  layout?: 'hero' | 'banner'
}

export interface RepairSceneHandle {
  setAnimate: (on: boolean) => void
  dispose: () => void
}

// Kích thước điện thoại (đơn vị cảnh ≈ 3,2 cm) – tỉ lệ gần với một máy 6,1 inch
const PW = 2.3
const PH = 4.72
const PD = 0.25
const PR = 0.36

const FONT = (weight: number, size: number) => `${weight} ${size}px 'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif`

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Mặt trước: viền đen + màn hình bo góc + "đảo" camera + giao diện theo dõi sửa chữa của app. */
function drawScreen(canvas: HTMLCanvasElement) {
  const W = 1024
  const H = Math.round((W * PH) / PW)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const R = (PR / PW) * W
  ctx.fillStyle = '#050608'
  roundRect(ctx, 0, 0, W, H, R)
  ctx.fill()
  const b = 26
  ctx.save()
  roundRect(ctx, b, b, W - 2 * b, H - 2 * b, R - b)
  ctx.clip()
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0B1628')
  bg.addColorStop(1, '#050B16')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Thanh trạng thái
  ctx.fillStyle = '#F8FAFC'
  ctx.font = FONT(600, 34)
  ctx.fillText('9:41', 96, 104)
  for (let i = 0; i < 4; i++) ctx.fillRect(W - 250 + i * 14, 98 - 8 - i * 6, 9, 8 + i * 6)
  ctx.strokeStyle = '#F8FAFC'
  ctx.lineWidth = 3
  roundRect(ctx, W - 170, 76, 60, 28, 7)
  ctx.stroke()
  ctx.fillRect(W - 166, 80, 40, 20)
  ctx.fillRect(W - 107, 85, 4, 10)
  // "Đảo" camera trước
  ctx.fillStyle = '#000'
  roundRect(ctx, W / 2 - 150, 52, 300, 74, 37)
  ctx.fill()
  ctx.fillStyle = '#0D1B2A'
  ctx.beginPath()
  ctx.arc(W / 2 + 104, 89, 14, 0, Math.PI * 2)
  ctx.fill()

  // Đầu app
  ctx.fillStyle = '#7DD3FC'
  ctx.font = FONT(700, 40)
  ctx.fillText('RepairFlow', 84, 232)
  ctx.fillStyle = '#94A3B8'
  ctx.font = FONT(500, 30)
  ctx.fillText('Theo dõi sửa chữa', 84, 280)

  // Thẻ phiếu
  ctx.fillStyle = 'rgba(148,163,184,0.10)'
  roundRect(ctx, 64, 330, W - 128, 150, 28)
  ctx.fill()
  ctx.fillStyle = '#E2E8F0'
  ctx.font = FONT(600, 34)
  ctx.fillText('RO-2026-000123', 104, 395)
  ctx.fillStyle = '#94A3B8'
  ctx.font = FONT(500, 28)
  ctx.fillText('Thay màn hình · Bảo hành 6 tháng', 104, 442)

  // Vòng tiến độ
  const cx = W / 2
  const cy = 790
  const r = 220
  ctx.lineCap = 'round'
  ctx.lineWidth = 34
  ctx.strokeStyle = 'rgba(148,163,184,0.16)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  ring.addColorStop(0, '#38BDF8')
  ring.addColorStop(1, '#0369A1')
  ctx.strokeStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.5)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F8FAFC'
  ctx.font = FONT(700, 120)
  ctx.fillText('75%', cx, cy + 36)
  ctx.fillStyle = '#94A3B8'
  ctx.font = FONT(500, 32)
  ctx.fillText('Đang sửa chữa', cx, cy + 96)
  ctx.textAlign = 'left'

  // Các bước
  const steps: [string, 'done' | 'active' | 'todo'][] = [
    ['Tiếp nhận thiết bị', 'done'],
    ['Kiểm tra & báo giá', 'done'],
    ['Khách đã duyệt', 'done'],
    ['Đang thay màn hình', 'active'],
    ['Bàn giao & kích hoạt bảo hành', 'todo'],
  ]
  steps.forEach(([label, state], i) => {
    const y = 1140 + i * 96
    if (i < steps.length - 1) {
      ctx.fillStyle = state === 'done' ? '#0369A1' : 'rgba(148,163,184,0.25)'
      ctx.fillRect(106, y + 4, 4, 76)
    }
    ctx.fillStyle = state === 'todo' ? '#1E293B' : state === 'active' ? '#F59E0B' : '#38BDF8'
    ctx.beginPath()
    ctx.arc(108, y - 10, 17, 0, Math.PI * 2)
    ctx.fill()
    if (state === 'done') {
      ctx.strokeStyle = '#06111F'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(99, y - 10)
      ctx.lineTo(106, y - 3)
      ctx.lineTo(118, y - 18)
      ctx.stroke()
    }
    ctx.fillStyle = state === 'todo' ? '#64748B' : '#E2E8F0'
    ctx.font = FONT(state === 'active' ? 650 : 500, 34)
    ctx.fillText(label, 150, y)
  })

  // Nút cuối màn hình
  const by = H - 300
  const grad = ctx.createLinearGradient(64, by, W - 64, by)
  grad.addColorStop(0, '#0EA5E9')
  grad.addColorStop(1, '#0369A1')
  ctx.fillStyle = grad
  roundRect(ctx, 64, by, W - 128, 110, 30)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = FONT(600, 36)
  ctx.textAlign = 'center'
  ctx.fillText('Xem chi tiết phiếu', W / 2, by + 68)
  ctx.textAlign = 'left'
  // Thanh home
  ctx.fillStyle = 'rgba(248,250,252,0.85)'
  roundRect(ctx, W / 2 - 140, H - 70, 280, 12, 6)
  ctx.fill()
  drawInternals(ctx, W, H)
  ctx.restore()
}

/** Nửa phải màn hình "cắt lớp": lộ bo mạch, chip, pin, cáp flex – ranh giới chéo có viền sáng xanh. */
function drawInternals(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cutTop = W * 0.66
  const cutBottom = W * 0.54
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cutTop, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W, H)
  ctx.lineTo(cutBottom, H)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = '#1A1F27'
  ctx.fillRect(0, 0, W, H)
  const pcb = ctx.createLinearGradient(cutBottom, 0, W, 0)
  pcb.addColorStop(0, '#0B3A2C')
  pcb.addColorStop(1, '#0F4A37')
  ctx.fillStyle = pcb
  roundRect(ctx, cutBottom - 40, 150, W - cutBottom - 10, H * 0.36, 26)
  ctx.fill()
  // Đường mạch vàng
  ctx.strokeStyle = 'rgba(212,162,58,0.75)'
  ctx.lineWidth = 3
  for (let i = 0; i < 14; i++) {
    const y = 190 + i * 42
    ctx.beginPath()
    ctx.moveTo(cutBottom, y)
    ctx.lineTo(cutBottom + 60 + (i % 3) * 30, y)
    ctx.lineTo(cutBottom + 90 + (i % 3) * 30, y + 24)
    ctx.lineTo(W - 40, y + 24)
    ctx.stroke()
  }
  // Nắp chống nhiễu + chip SoC + chip nhớ
  ctx.fillStyle = '#B8BEC7'
  roundRect(ctx, W * 0.7, 220, W * 0.22, 230, 10)
  ctx.fill()
  ctx.fillStyle = '#0D0F13'
  roundRect(ctx, W * 0.72, 500, 150, 150, 12)
  ctx.fill()
  ctx.fillStyle = '#2B2F36'
  ctx.font = FONT(600, 20)
  ctx.fillText('RF-A17', W * 0.72 + 30, 585)
  ctx.fillStyle = '#0D0F13'
  roundRect(ctx, W * 0.9 - 20, 520, 70, 110, 8)
  ctx.fill()
  // Pin – vỏ bạc + nhãn
  ctx.fillStyle = '#AEB4BD'
  roundRect(ctx, cutBottom - 20, H * 0.5, W - cutBottom - 30, H * 0.4, 22)
  ctx.fill()
  ctx.fillStyle = '#16181C'
  roundRect(ctx, cutBottom + 20, H * 0.53, W - cutBottom - 110, H * 0.32, 14)
  ctx.fill()
  ctx.fillStyle = '#CBD5E1'
  ctx.font = FONT(700, 34)
  ctx.fillText('Li-ion', cutBottom + 50, H * 0.53 + 70)
  ctx.font = FONT(500, 22)
  ctx.fillText('3.87V · 3279mAh', cutBottom + 50, H * 0.53 + 110)
  // Cáp flex cam
  ctx.fillStyle = '#C9852B'
  ctx.fillRect(W * 0.86, H * 0.36, 26, H * 0.15)
  ctx.fillRect(W * 0.86, H * 0.36, 90, 22)
  // Ốc vít
  for (const [x, y] of [[cutBottom + 30, 170], [W - 50, 170], [W - 50, H * 0.47], [W - 50, H - 90]]) {
    ctx.fillStyle = '#5B6270'
    ctx.beginPath()
    ctx.arc(x, y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2B2F36'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x - 7, y)
    ctx.lineTo(x + 7, y)
    ctx.moveTo(x, y - 7)
    ctx.lineTo(x, y + 7)
    ctx.stroke()
  }
  ctx.restore()
  // Ranh giới cắt: viền sáng xanh
  ctx.save()
  ctx.shadowColor = '#22D3EE'
  ctx.shadowBlur = 24
  ctx.strokeStyle = '#67E8F9'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(cutTop, 0)
  ctx.lineTo(cutBottom, H)
  ctx.stroke()
  ctx.restore()
}

/** Bảng chẩn đoán hologram (vẽ lại khi tiến độ đổi): khung góc, tiêu đề, 4 hạng mục kiểm tra, % và sóng tín hiệu. */
const HOLO_ITEMS = ['Màn hình', 'Pin', 'Camera', 'Bo mạch'] as const
function drawHologram(canvas: HTMLCanvasElement, progress: number, t: number) {
  const W = 512
  const H = 340
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  // Nền kính xanh mờ + viền
  ctx.fillStyle = 'rgba(8,47,73,0.35)'
  roundRect(ctx, 6, 6, W - 12, H - 12, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(103,232,249,0.55)'
  ctx.lineWidth = 2
  roundRect(ctx, 6, 6, W - 12, H - 12, 18)
  ctx.stroke()
  // Góc khung sáng
  ctx.strokeStyle = '#A5F3FC'
  ctx.lineWidth = 4
  for (const [x, y, dx, dy] of [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]]) {
    ctx.beginPath()
    ctx.moveTo(x, y + dy * 34)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * 34, y)
    ctx.stroke()
  }
  ctx.fillStyle = '#A5F3FC'
  ctx.font = FONT(700, 22)
  ctx.fillText('CHẨN ĐOÁN THIẾT BỊ', 30, 46)
  ctx.fillStyle = 'rgba(165,243,252,0.7)'
  ctx.font = FONT(500, 17)
  ctx.fillText('RO-2026-000123 · iPhone', 30, 72)
  // % tổng
  const pct = Math.round(progress * 100)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#E0F2FE'
  ctx.font = FONT(700, 48)
  ctx.fillText(`${pct}%`, W - 30, 70)
  ctx.textAlign = 'left'
  // 4 hạng mục: thanh chạy lần lượt, xong thì ✓
  HOLO_ITEMS.forEach((label, i) => {
    const y = 108 + i * 46
    const local = Math.min(Math.max(progress * HOLO_ITEMS.length - i, 0), 1)
    ctx.fillStyle = 'rgba(224,242,254,0.9)'
    ctx.font = FONT(500, 19)
    ctx.fillText(label, 30, y + 16)
    ctx.fillStyle = 'rgba(103,232,249,0.18)'
    roundRect(ctx, 150, y + 2, 270, 14, 7)
    ctx.fill()
    if (local > 0) {
      const grd = ctx.createLinearGradient(150, 0, 420, 0)
      grd.addColorStop(0, '#0EA5E9')
      grd.addColorStop(1, '#67E8F9')
      ctx.fillStyle = grd
      roundRect(ctx, 150, y + 2, Math.max(14, 270 * local), 14, 7)
      ctx.fill()
    }
    ctx.fillStyle = local >= 1 ? '#4ADE80' : 'rgba(165,243,252,0.6)'
    ctx.font = FONT(700, 19)
    ctx.fillText(local >= 1 ? '✓ OK' : local > 0 ? '…' : '', 436, y + 16)
  })
  // Sóng tín hiệu
  ctx.strokeStyle = 'rgba(103,232,249,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 30; x <= W - 30; x += 4) {
    const y = 306 + Math.sin(x * 0.06 + t * 6) * 8 * Math.sin(x * 0.013 + t)
    if (x === 30) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/** Dải dọc: trong suốt → xanh → vạch sáng ở mép trên (vệt quét màn hình điện thoại). */
function makeScanTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const ctx = c.getContext('2d')!
  const grd = ctx.createLinearGradient(0, 128, 0, 0)
  grd.addColorStop(0, 'rgba(34,211,238,0)')
  grd.addColorStop(0.8, 'rgba(34,211,238,0.35)')
  grd.addColorStop(0.95, 'rgba(165,243,252,1)')
  grd.addColorStop(1, 'rgba(165,243,252,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 4, 128)
  return new THREE.CanvasTexture(c)
}

/** Chùm sáng hắt lên từ máy tính bảng: sáng ở đáy, mờ dần lên trên. */
function makeConeTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const ctx = c.getContext('2d')!
  const grd = ctx.createLinearGradient(0, 128, 0, 0)
  grd.addColorStop(0, 'rgba(255,255,255,0.9)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 4, 128)
  return new THREE.CanvasTexture(c)
}

/** Quầng sáng tròn (trắng → trong suốt) – dùng cho sprite cộng màu: tia, đầu tia, tia lửa, đèn nền. */
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** Một vệt sáng mờ dần ở hai đầu (alphaMap cuộn theo trục u của ống) → ánh sáng chạy dọc vệt năng lượng. */
function makeStreakTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 4
  const ctx = c.getContext('2d')!
  const grd = ctx.createLinearGradient(0, 0, 256, 0)
  grd.addColorStop(0, 'rgb(0,0,0)')
  grd.addColorStop(0.55, 'rgb(0,0,0)')
  grd.addColorStop(0.85, 'rgb(255,255,255)')
  grd.addColorStop(0.9, 'rgb(255,255,255)')
  grd.addColorStop(1, 'rgb(0,0,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 256, 4)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  return t
}

/** Bóng mềm giả lập (texture tròn mờ) – rẻ hơn shadow map, đẹp trên nền trong suốt. */
function makeShadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(0,0,0,0.55)')
  grd.addColorStop(0.55, 'rgba(0,0,0,0.18)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}

interface Floater {
  obj: THREE.Object3D
  base: THREE.Vector3
  phase: number
  spin: THREE.Vector3
}

export function createRepairScene(container: HTMLElement, { animate: animateInitially, layout = 'hero' }: RepairSceneOptions): RepairSceneHandle | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch {
    return null // máy không hỗ trợ WebGL → component hiển thị nền tĩnh
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0.3, 11.5)

  let disposed = false
  /** Đang chạy vòng lặp chuyển động (false = người dùng bấm tạm dừng) */
  let playing = animateInitially
  const scene = new THREE.Scene()
  /** Vẽ một khung – bỏ qua nếu cảnh đã bị dispose (callback rAF / fonts.ready đến muộn). */
  const renderOnce = () => {
    if (!disposed) renderer.render(scene, camera)
  }

  // Môi trường phản chiếu kiểu studio → kim loại & kính có phản xạ thật
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
  scene.environment = envTexture
  scene.environmentIntensity = 0.9

  // Đèn studio: key trắng ấm, rim xanh phía sau (tách khối khỏi nền navy), fill hổ phách rất nhẹ
  const key = new THREE.DirectionalLight('#FFF7ED', 2.2)
  key.position.set(4, 6, 7)
  scene.add(key)
  const rim = new THREE.DirectionalLight('#7DD3FC', 2.6)
  rim.position.set(-6, 3, -5)
  scene.add(rim)
  const fill = new THREE.PointLight('#F59E0B', 6, 14)
  fill.position.set(3.5, -3, 3)
  scene.add(fill)
  scene.add(new THREE.HemisphereLight('#CBD5E1', '#0B1220', 0.35))

  const root = new THREE.Group()
  if (layout === 'hero') {
    // Vùng nhìn thấy ≈ ±2,9 × ±3,1: tiêu đề góc trên-trái, dải thẻ ~25% dưới → thợ bên trái (chân khuất sau
    // dải thẻ), điện thoại bên phải
    root.scale.setScalar(0.55)
    root.position.set(0.3, 0.2, 0)
  } else {
    root.scale.setScalar(0.5)
    root.position.set(0, -0.3, 0)
  }
  scene.add(root)

  // ------------------------------------------------------------------ Vật liệu PBR
  const titanium = new THREE.MeshPhysicalMaterial({ color: '#8E9196', metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.4 })
  const backGlass = new THREE.MeshPhysicalMaterial({ color: '#27303D', metalness: 0.1, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.25 })
  const plateauGlass = new THREE.MeshPhysicalMaterial({ color: '#323C4B', metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 })
  const lensRing = new THREE.MeshStandardMaterial({ color: '#B4B8BE', metalness: 1, roughness: 0.18 })
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: '#05070C', metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.6, iridescenceIOR: 1.6 })
  const blackPlastic = new THREE.MeshStandardMaterial({ color: '#0A0B0D', metalness: 0.2, roughness: 0.55 })
  const glassCoat = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false })
  const foil = new THREE.MeshStandardMaterial({ color: '#B9BEC6', metalness: 0.85, roughness: 0.38 })
  const pcb = new THREE.MeshStandardMaterial({ color: '#0E3B2C', metalness: 0.15, roughness: 0.6 })
  const shieldCan = new THREE.MeshStandardMaterial({ color: '#C7CCD3', metalness: 1, roughness: 0.28 })
  const chipMat = new THREE.MeshStandardMaterial({ color: '#16181D', metalness: 0.3, roughness: 0.45 })
  const gold = new THREE.MeshStandardMaterial({ color: '#D4A23A', metalness: 1, roughness: 0.3 })
  const screwMat = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 1, roughness: 0.32 })
  const flexMat = new THREE.MeshStandardMaterial({ color: '#C9852B', metalness: 0.2, roughness: 0.5 })
  const flashMat = new THREE.MeshStandardMaterial({ color: '#FFF4D6', emissive: '#FFE7B0', emissiveIntensity: 0.25, roughness: 0.3 })

  const geos: THREE.BufferGeometry[] = []
  const g = <T extends THREE.BufferGeometry>(geo: T) => {
    geos.push(geo)
    return geo
  }

  // ------------------------------------------------------------------ Điện thoại
  const phone = new THREE.Group()
  phone.add(new THREE.Mesh(g(new RoundedBoxGeometry(PW, PH, PD, 10, PR)), titanium))
  const back = new THREE.Mesh(g(new RoundedBoxGeometry(PW - 0.06, PH - 0.06, 0.02, 8, PR - 0.03)), backGlass)
  back.position.z = -PD / 2 - 0.004
  phone.add(back)

  // Mặt trước: màn hình (viền + nội dung vẽ trên canvas) + lớp kính phản chiếu môi trường
  const FW = PW - 0.04
  const FH = PH - 0.04
  const frontGeo = g(new THREE.ShapeGeometry(roundedRectShape(FW, FH, PR - 0.02), 24))
  {
    // UV theo khung chữ nhật bao quanh để texture phủ đúng
    const pos = frontGeo.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / FW + 0.5
      uv[i * 2 + 1] = pos.getY(i) / FH + 0.5
    }
    frontGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }
  const screenCanvas = document.createElement('canvas')
  drawScreen(screenCanvas)
  const screenTex = new THREE.CanvasTexture(screenCanvas)
  screenTex.colorSpace = THREE.SRGBColorSpace
  screenTex.anisotropy = 8
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  const screen = new THREE.Mesh(frontGeo, screenMat)
  screen.position.z = PD / 2 + 0.002
  phone.add(screen)
  const coat = new THREE.Mesh(frontGeo, glassCoat)
  coat.position.z = PD / 2 + 0.004
  phone.add(coat)

  // Nút bấm: nguồn (phải), nút tác vụ + âm lượng (trái)
  const addBtn = (len: number, x: number, y: number) => {
    const m = new THREE.Mesh(g(new RoundedBoxGeometry(0.05, len, 0.1, 3, 0.022)), titanium)
    m.position.set(x, y, 0)
    phone.add(m)
  }
  addBtn(0.62, PW / 2 + 0.012, 0.95)
  addBtn(0.2, -PW / 2 - 0.012, 1.45)
  addBtn(0.4, -PW / 2 - 0.012, 0.95)
  addBtn(0.4, -PW / 2 - 0.012, 0.42)
  // Cổng USB-C + lỗ loa ở cạnh dưới
  const port = new THREE.Mesh(g(new RoundedBoxGeometry(0.34, 0.03, 0.1, 3, 0.014)), blackPlastic)
  port.position.set(0, -PH / 2 - 0.006, 0)
  phone.add(port)
  const holeGeo = g(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10))
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(holeGeo, blackPlastic)
      h.position.set(side * (0.32 + i * 0.07), -PH / 2 - 0.004, 0)
      phone.add(h)
    }
  }

  // Cụm camera sau: bệ kính + 3 ống kính + đèn flash + cảm biến LiDAR
  const plateau = new THREE.Mesh(g(new RoundedBoxGeometry(1.08, 1.08, 0.06, 6, 0.26)), plateauGlass)
  plateau.position.set(-PW / 2 + 0.66, PH / 2 - 0.66, -PD / 2 - 0.03)
  phone.add(plateau)
  const ringGeo = g(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 40))
  const lensGeo = g(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 40))
  const innerGeo = g(new THREE.CylinderGeometry(0.06, 0.06, 0.014, 24))
  const lensPositions: [number, number][] = [
    [-0.23, 0.23],
    [-0.23, -0.23],
    [0.23, 0],
  ]
  for (const [dx, dy] of lensPositions) {
    const lens = new THREE.Group()
    const ringMesh = new THREE.Mesh(ringGeo, lensRing)
    ringMesh.rotation.x = Math.PI / 2
    lens.add(ringMesh)
    const glass = new THREE.Mesh(lensGeo, lensGlass)
    glass.rotation.x = Math.PI / 2
    glass.position.z = -0.052
    lens.add(glass)
    const inner = new THREE.Mesh(innerGeo, blackPlastic)
    inner.rotation.x = Math.PI / 2
    inner.position.z = -0.054
    lens.add(inner)
    lens.position.set(plateau.position.x + dx, plateau.position.y + dy, plateau.position.z - 0.05)
    phone.add(lens)
  }
  const flash = new THREE.Mesh(g(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24)), flashMat)
  flash.rotation.x = Math.PI / 2
  flash.position.set(plateau.position.x + 0.27, plateau.position.y + 0.33, plateau.position.z - 0.035)
  phone.add(flash)
  const lidar = new THREE.Mesh(g(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20)), blackPlastic)
  lidar.rotation.x = Math.PI / 2
  lidar.position.set(plateau.position.x + 0.27, plateau.position.y - 0.33, plateau.position.z - 0.035)
  phone.add(lidar)

  phone.rotation.set(-0.06, -0.42, 0.06)
  phone.position.set(2.6, 0.5, 0)
  root.add(phone)

  // Font web có thể tải xong sau lần vẽ đầu → vẽ lại để chữ tiếng Việt đúng font
  document.fonts?.ready.then(() => {
    if (disposed) return
    drawScreen(screenCanvas)
    screenTex.needsUpdate = true
    if (!playing) renderOnce()
  })

  // ------------------------------------------------------------------ Linh kiện tháo rời
  // Bo mạch chính: PCB xanh đậm, nắp chống nhiễu bạc, chip đen, chân tiếp xúc vàng
  const board = new THREE.Group()
  board.add(new THREE.Mesh(g(new RoundedBoxGeometry(0.72, 1.7, 0.045, 3, 0.04)), pcb))
  const can1 = new THREE.Mesh(g(new RoundedBoxGeometry(0.56, 0.62, 0.05, 2, 0.02)), shieldCan)
  can1.position.set(0, 0.42, 0.045)
  board.add(can1)
  const chip1 = new THREE.Mesh(g(new RoundedBoxGeometry(0.34, 0.34, 0.04, 2, 0.015)), chipMat)
  chip1.position.set(-0.08, -0.25, 0.04)
  board.add(chip1)
  const chip2 = new THREE.Mesh(g(new RoundedBoxGeometry(0.16, 0.22, 0.035, 2, 0.01)), chipMat)
  chip2.position.set(0.2, -0.3, 0.04)
  board.add(chip2)
  const padGeo = g(new THREE.BoxGeometry(0.05, 0.1, 0.012))
  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(padGeo, gold)
    pad.position.set(-0.2 + i * 0.1, -0.74, 0.03)
    board.add(pad)
  }

  // Cụm camera tháo rời (khối + 2 ống kính + cáp flex)
  const camModule = new THREE.Group()
  camModule.add(new THREE.Mesh(g(new RoundedBoxGeometry(0.62, 0.62, 0.22, 3, 0.05)), chipMat))
  const camRingGeo = g(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32))
  const camGlassGeo = g(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 32))
  for (const dy of [-0.15, 0.15]) {
    const rr = new THREE.Mesh(camRingGeo, lensRing)
    rr.rotation.x = Math.PI / 2
    rr.position.set(0, dy, 0.13)
    camModule.add(rr)
    const gl = new THREE.Mesh(camGlassGeo, lensGlass)
    gl.rotation.x = Math.PI / 2
    gl.position.set(0, dy, 0.175)
    camModule.add(gl)
  }
  const flex = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.6, 0.012)), flexMat)
  flex.position.set(0.12, -0.58, -0.05)
  camModule.add(flex)

  // Ốc vít Phillips (thân có ren giả bằng các vòng nhỏ + đầu có rãnh chữ thập)
  const shaftGeo = g(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 16))
  const threadGeo = g(new THREE.TorusGeometry(0.036, 0.008, 6, 16))
  const headGeo = g(new THREE.CylinderGeometry(0.09, 0.08, 0.05, 24))
  const slotGeo = g(new THREE.BoxGeometry(0.11, 0.012, 0.02))
  const makeScrew = () => {
    const s = new THREE.Group()
    s.add(new THREE.Mesh(shaftGeo, screwMat))
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(threadGeo, screwMat)
      t.rotation.x = Math.PI / 2
      t.position.y = -0.1 + i * 0.045
      s.add(t)
    }
    const head = new THREE.Mesh(headGeo, screwMat)
    head.position.y = 0.15
    s.add(head)
    for (const rot of [0, Math.PI / 2]) {
      const slot = new THREE.Mesh(slotGeo, blackPlastic)
      slot.position.y = 0.176
      slot.rotation.y = rot
      s.add(slot)
    }
    return s
  }

  const floaters: Floater[] = []
  const addFloater = (obj: THREE.Object3D, pos: [number, number, number], rot: [number, number, number], spin: [number, number, number]) => {
    obj.position.set(...pos)
    obj.rotation.set(...rot)
    root.add(obj)
    floaters.push({ obj, base: obj.position.clone(), phase: Math.random() * Math.PI * 2, spin: new THREE.Vector3(...spin) })
  }
  // Linh kiện "văng ra" từ góc trên-phải của máy
  addFloater(camModule, [3.95, 3.25, 0.5], [0.4, -0.6, 0.3], [0.05, 0.18, 0])
  addFloater(board, [4.15, 1.2, -0.7], [-0.15, -0.7, 0.25], [0, -0.08, 0])
  addFloater(makeScrew(), [3.3, 3.75, 0.9], [0.6, 0, 0.5], [0.2, 0.6, 0])
  addFloater(makeScrew(), [4.45, 2.55, 0.6], [-0.4, 0, -0.7], [0.3, 0.5, 0])
  addFloater(makeScrew(), [1.25, 3.4, 0.4], [0.3, 0, -0.4], [0.25, 0.55, 0])

  // ------------------------------------------------------------------ Anh thợ (ảnh Adobe Stock đã tách nền)
  const TECH_H = 5.8
  const TECH_W = (TECH_H * 432) / 1100
  const techTex = new THREE.TextureLoader().load('/images/technician.webp', () => {
    if (!playing) renderOnce()
  })
  techTex.colorSpace = THREE.SRGBColorSpace
  techTex.anisotropy = 4
  const techGeo = g(new THREE.PlaneGeometry(TECH_W, TECH_H))
  techGeo.translate(0, TECH_H / 2, 0) // gốc ở chân → đung đưa quanh bàn chân
  const techMat = new THREE.MeshBasicMaterial({ map: techTex, transparent: true, alphaTest: 0.02, toneMapped: false })
  const tech = new THREE.Mesh(techGeo, techMat)
  tech.position.set(-3.3, -4.6, 0.3)
  root.add(tech)
  // Điểm máy tính bảng trên ảnh (toạ độ ảnh 360,460 / 432×1100) → toạ độ trong root
  const tabletLocal = new THREE.Vector3(-3.3 + (360 / 432 - 0.5) * TECH_W, -4.6 + (1 - 460 / 1100) * TECH_H, 0.35)

  const glowTex = makeGlowTexture()
  const additive = (color: string, opacity: number) =>
    new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })
  // Đèn nền xanh sau lưng anh thợ (tách nhân vật khỏi nền tối)
  const backGlowMat = additive('#0EA5E9', 0.32)
  const backGlow = new THREE.Sprite(backGlowMat)
  backGlow.scale.set(5.2, 7.2, 1)
  backGlow.position.set(-3.2, -1.4, -0.6)
  root.add(backGlow)
  // Màn hình máy tính bảng phát sáng
  const tabletGlowMat = additive('#67E8F9', 0.9)
  const tabletGlow = new THREE.Sprite(tabletGlowMat)
  tabletGlow.scale.set(0.9, 0.9, 1)
  tabletGlow.position.copy(tabletLocal)
  root.add(tabletGlow)

  // ------------------------------------------------------------------ Bảng hologram chẩn đoán nổi trên máy tính bảng
  const holoCanvas = document.createElement('canvas')
  drawHologram(holoCanvas, animateInitially ? 0 : 1, 0) // đứng yên → hiển thị trạng thái "hoàn tất"
  const holoTex = new THREE.CanvasTexture(holoCanvas)
  holoTex.colorSpace = THREE.SRGBColorSpace
  const holoMat = new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
  const HOLO_W = 2.3
  const HOLO_H = (HOLO_W * 340) / 512
  const holo = new THREE.Mesh(g(new THREE.PlaneGeometry(HOLO_W, HOLO_H)), holoMat)
  const holoBase = new THREE.Vector3(tabletLocal.x + 1.45, tabletLocal.y + 1.8, 0.7)
  holo.position.copy(holoBase)
  holo.rotation.set(-0.06, 0.28, 0)
  root.add(holo)
  // Chùm sáng hình thang: hẹp ở máy tính bảng, rộng ở mép dưới bảng hologram
  const coneTex = makeConeTexture()
  const coneMat = new THREE.MeshBasicMaterial({ map: coneTex, color: '#22D3EE', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  const coneGeo = g(new THREE.BufferGeometry())
  const conePos = new Float32Array(12)
  coneGeo.setAttribute('position', new THREE.BufferAttribute(conePos, 3))
  coneGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
  coneGeo.setIndex([0, 1, 2, 0, 2, 3])
  const cone = new THREE.Mesh(coneGeo, coneMat)
  cone.frustumCulled = false
  root.add(cone)
  const holoCorner = new THREE.Vector3()
  const updateCone = () => {
    holo.updateMatrix()
    const set = (i: number, v: THREE.Vector3) => conePos.set([v.x, v.y, v.z], i * 3)
    set(0, holoCorner.set(tabletLocal.x - 0.12, tabletLocal.y + 0.05, tabletLocal.z))
    set(1, holoCorner.set(tabletLocal.x + 0.12, tabletLocal.y + 0.05, tabletLocal.z))
    set(2, holoCorner.set(HOLO_W / 2, -HOLO_H / 2, 0).applyMatrix4(holo.matrix))
    set(3, holoCorner.set(-HOLO_W / 2, -HOLO_H / 2, 0).applyMatrix4(holo.matrix))
    coneGeo.attributes.position.needsUpdate = true
  }
  updateCone()
  // Hạt sáng bay lên từ máy tính bảng vào bảng hologram
  const riseMat = additive('#A5F3FC', 0.9)
  const rising: THREE.Sprite[] = []
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(riseMat.clone())
    sp.scale.set(0.09, 0.09, 1)
    root.add(sp)
    rising.push(sp)
  }

  // ------------------------------------------------------------------ Vệt quét chạy dọc màn hình điện thoại
  const scanTex = makeScanTexture()
  const scanMat = new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
  const SCAN_H = 0.9
  const scan = new THREE.Mesh(g(new THREE.PlaneGeometry(PW - 0.1, SCAN_H)), scanMat)
  scan.position.z = PD / 2 + 0.012
  scan.visible = animateInitially // ảnh tĩnh: không có vệt quét dở dang
  phone.add(scan)
  let holoPct = -1
  let holoDrawnAt = 0

  // ------------------------------------------------------------------ Tia lửa ở góc máy (nơi linh kiện văng ra)
  const SPARKS = 90
  const sparkPos = new Float32Array(SPARKS * 3).fill(-999)
  const sparkVel = new Float32Array(SPARKS * 3)
  const sparkLife = new Float32Array(SPARKS)
  const sparkGeo = g(new THREE.BufferGeometry())
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
  const sparkMat = new THREE.PointsMaterial({ map: glowTex, color: '#FDBA74', size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const sparks = new THREE.Points(sparkGeo, sparkMat)
  sparks.frustumCulled = false
  root.add(sparks)
  const emitter = new THREE.Vector3()
  const emitterGlowMat = additive('#FDBA74', 0.9)
  const emitterGlow = new THREE.Sprite(emitterGlowMat)
  root.add(emitterGlow)
  const respawn = (i: number) => {
    sparkPos.set([emitter.x, emitter.y, emitter.z], i * 3)
    sparkVel.set([0.6 + Math.random() * 2.6, 0.4 + Math.random() * 2.4, (Math.random() - 0.5) * 1.6], i * 3)
    sparkLife[i] = 0.35 + Math.random() * 0.9
  }

  // ------------------------------------------------------------------ Vệt sáng năng lượng xoáy quanh máy
  const streakTex = makeStreakTexture()
  const ring = (rx: number, rz: number) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a * 2) * 0.15, Math.sin(a) * rz))
    }
    return new THREE.CatmullRomCurve3(pts, true)
  }
  const streakMats: THREE.MeshBasicMaterial[] = []
  const streaks: THREE.Mesh[] = []
  const rings: [number, number, number, string, number, number][] = [
    [2.3, 1.3, 0.035, '#38BDF8', 0.55, 0.3],
    [2.6, 1.5, 0.025, '#22D3EE', -0.45, -0.25],
  ]
  for (const [rx, rz, tube, color, rotZ, rotX] of rings) {
    const alpha = streakTex.clone()
    alpha.wrapS = THREE.RepeatWrapping
    alpha.repeat.set(2, 1)
    const mat = new THREE.MeshBasicMaterial({ color, alphaMap: alpha, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    streakMats.push(mat)
    const mesh = new THREE.Mesh(g(new THREE.TubeGeometry(ring(rx, rz), 240, tube, 8, true)), mat)
    mesh.position.set(2.6, 0.5, 0)
    mesh.rotation.set(rotX, 0, rotZ)
    root.add(mesh)
    streaks.push(mesh)
  }

  // Bóng mềm dưới điện thoại
  const shadowTex = makeShadowTexture()
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 })
  const shadow = new THREE.Mesh(g(new THREE.PlaneGeometry(3.6, 1.1)), shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(2.6, 0.5 - PH / 2 - 0.55, 0)
  root.add(shadow)

  // Bụi sáng rất nhẹ ở hậu cảnh (chiều sâu)
  const COUNT = 180
  const positions = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    positions.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, -4 - Math.random() * 5], i * 3)
  }
  const dustGeo = g(new THREE.BufferGeometry())
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const dustMat = new THREE.PointsMaterial({ color: '#7DD3FC', size: 0.03, transparent: true, opacity: 0.45, depthWrite: false })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)

  // ------------------------------------------------------------------ Kích thước theo khung chứa
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.position.z = layout === 'banner' ? 6.6 : w / h < 0.9 ? 14 : 11.5
    camera.updateProjectionMatrix()
    renderer.domElement.style.width = `${w}px`
    renderer.domElement.style.height = `${h}px`
    if (!playing) renderOnce()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  const timer = new THREE.Timer()
  timer.connect(document)
  const animate = (timestamp?: number) => {
    timer.update(timestamp)
    const t = timer.getElapsed()
    const dt = Math.min(timer.getDelta(), 0.05)
    // Điện thoại xoay rất nhẹ; anh thợ thở + đung đưa quanh bàn chân
    phone.rotation.y = -0.42 + Math.sin(t * 0.3) * 0.1
    phone.position.y = 0.5 + Math.sin(t * 0.7) * 0.06
    root.rotation.y = Math.sin(t * 0.18) * 0.04
    tech.scale.set(1 + Math.sin(t * 1.9) * 0.004, 1 + Math.sin(t * 1.9) * 0.007, 1)
    tech.rotation.z = Math.sin(t * 0.55) * 0.012
    backGlowMat.opacity = 0.28 + Math.sin(t * 1.3) * 0.06
    tabletGlowMat.opacity = 0.75 + Math.sin(t * 6) * 0.12

    // Chu kỳ chẩn đoán 5 giây: quét 0 → 100% trong 4 giây, giữ "hoàn tất" 1 giây
    const cyc = t % 5
    const progress = Math.min(cyc / 4, 1)
    const pct = Math.round(progress * 100)
    if (pct !== holoPct || t - holoDrawnAt > 0.1) {
      holoPct = pct
      holoDrawnAt = t
      drawHologram(holoCanvas, progress, t)
      holoTex.needsUpdate = true
    }
    holo.position.set(holoBase.x, holoBase.y + Math.sin(t * 1.2) * 0.06, holoBase.z)
    holo.rotation.y = 0.28 + Math.sin(t * 0.5) * 0.04
    holoMat.opacity = 0.88 + Math.sin(t * 31) * 0.04 + (Math.random() < 0.02 ? -0.3 : 0) // nhấp nháy kiểu hologram
    updateCone()
    coneMat.opacity = 0.28 + Math.sin(t * 3) * 0.06
    rising.forEach((sp, i) => {
      const k = (t * 0.45 + i / rising.length) % 1
      sp.position.set(
        tabletLocal.x + (holoBase.x - tabletLocal.x) * k + Math.sin(i * 2.1 + t * 2) * 0.12,
        tabletLocal.y + (holoBase.y - HOLO_H / 2 - tabletLocal.y) * k,
        tabletLocal.z + (holoBase.z - tabletLocal.z) * k,
      )
      ;(sp.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.9
    })
    // Vệt quét trên điện thoại đồng bộ với % chẩn đoán; tắt dần khi hoàn tất
    scan.position.y = -PH / 2 + SCAN_H / 2 + progress * (PH - SCAN_H)
    scanMat.opacity = cyc < 4 ? 1 : Math.max(0, 1 - (cyc - 4) * 3)

    // Tia lửa ở góc trên-phải của máy
    emitter.set(PW / 2 - 0.15, PH / 2 - 0.5, PD / 2)
    phone.localToWorld(emitter)
    root.worldToLocal(emitter)
    emitterGlow.position.copy(emitter)
    const burst = 0.6 + Math.max(0, Math.sin(t * 2.3)) * 0.4
    emitterGlowMat.opacity = burst * (0.75 + Math.random() * 0.25)
    emitterGlow.scale.setScalar(0.55 + burst * 0.35)
    for (let i = 0; i < SPARKS; i++) {
      sparkLife[i] -= dt
      if (sparkLife[i] <= 0) {
        if (Math.random() < burst * 0.35) respawn(i)
        else sparkPos[i * 3 + 1] = -999 // ẩn tới lần bắn sau
        continue
      }
      sparkVel[i * 3 + 1] -= 5.5 * dt // trọng lực
      sparkPos[i * 3] += sparkVel[i * 3] * dt
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt
    }
    sparkGeo.attributes.position.needsUpdate = true

    // Vệt sáng xoáy
    streakMats[0].alphaMap!.offset.x = -t * 0.35
    streakMats[1].alphaMap!.offset.x = t * 0.27
    streaks[0].rotation.y = t * 0.08
    streaks[1].rotation.y = -t * 0.06
    shadow.scale.setScalar(1 - Math.sin(t * 0.7) * 0.04)
    for (const f of floaters) {
      f.obj.position.y = f.base.y + Math.sin(t * 0.8 + f.phase) * 0.12
      f.obj.rotation.x += f.spin.x * dt
      f.obj.rotation.y += f.spin.y * dt
      f.obj.rotation.z += f.spin.z * dt
    }
    dust.rotation.y += dt * 0.01
    renderer.render(scene, camera)
  }

  // ------------------------------------------------------------------ Chỉ chạy khi thấy được
  let visibleOnScreen = true
  const sync = () => {
    renderer.setAnimationLoop(playing && visibleOnScreen && !document.hidden ? animate : null)
    if (!playing) {
      // Đứng yên: giữ khung hình hiện tại; vẽ thêm ở frame kế tiếp vì lần vẽ đầu có thể trước khi canvas sẵn sàng
      renderOnce()
      requestAnimationFrame(renderOnce)
    }
  }
  const io = new IntersectionObserver((entries) => {
    visibleOnScreen = entries[entries.length - 1].isIntersecting
    sync()
    if (!visibleOnScreen) {
      // Lần báo đầu có thể đến khi khung chưa được bố cục xong → kiểm tra lại bằng toạ độ thật ở frame sau
      requestAnimationFrame(() => {
        const r = container.getBoundingClientRect()
        if (!disposed && !visibleOnScreen && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) {
          visibleOnScreen = true
          sync()
        }
      })
    }
  })
  io.observe(container)
  document.addEventListener('visibilitychange', sync)
  sync()

  return {
    setAnimate(on: boolean) {
      if (on === playing || disposed) return
      playing = on
      sync()
    },
    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      timer.dispose()
      for (const geo of geos) geo.dispose()
      for (const m of [titanium, backGlass, plateauGlass, lensRing, lensGlass, blackPlastic, glassCoat, foil, pcb, shieldCan, chipMat, gold, screwMat, flexMat, flashMat, screenMat, shadowMat, dustMat, techMat, backGlowMat, tabletGlowMat, holoMat, coneMat, riseMat, scanMat, sparkMat, emitterGlowMat, ...streakMats, ...rising.map((r) => r.material)]) m.dispose()
      for (const t of [screenTex, shadowTex, techTex, glowTex, streakTex, holoTex, coneTex, scanTex, ...streakMats.map((m) => m.alphaMap!)]) t.dispose()
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
