import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createTechnician } from './technician'

/**
 * Cảnh 3D "bàn sửa chữa" theo hướng chân thực: một chiếc điện thoại (khung titan, mặt kính phản chiếu,
 * viền + "đảo" camera trước, nút bấm, cụm 3 camera sau, cổng USB-C) đang hiển thị tiến độ phiếu, cùng các
 * linh kiện đã tháo ra lơ lửng xung quanh (pin có nhãn, bo mạch có chip, cụm camera, ốc vít, khay SIM).
 * Toàn bộ dựng bằng hình học thủ tục – không tải file mô hình ngoài (không lo bản quyền, không thêm request).
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
  ctx.restore()
}

/** Nhãn pin Li-ion (chữ in, ký hiệu cảnh báo, mã vạch) – để khối pin trông như linh kiện thật. */
function drawBatteryLabel(canvas: HTMLCanvasElement) {
  canvas.width = 512
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#16181C'
  ctx.fillRect(0, 0, 512, 1024)
  ctx.fillStyle = '#E5E7EB'
  ctx.font = FONT(700, 54)
  ctx.fillText('Li-ion', 48, 140)
  ctx.font = FONT(500, 34)
  ctx.fillStyle = '#CBD5E1'
  ;['3.87V', '3279mAh', '12.68Wh'].forEach((t, i) => ctx.fillText(t, 48, 220 + i * 52))
  ctx.fillStyle = '#9CA3AF'
  ctx.font = FONT(500, 22)
  ;['Rechargeable Li-ion battery', 'Do not puncture or heat', 'Repair part · RF-BAT-13'].forEach((t, i) => ctx.fillText(t, 48, 440 + i * 36))
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(110, 640)
  ctx.lineTo(60, 730)
  ctx.lineTo(160, 730)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = '#F59E0B'
  ctx.fillRect(106, 668, 8, 34)
  ctx.fillRect(106, 710, 8, 8)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 3 === 0 ? '#E5E7EB' : '#6B7280'
    ctx.fillRect(48 + i * 10, 820, i % 4 === 0 ? 6 : 3, 120)
  }
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
    // Vùng nhìn thấy ≈ ±2,9 × ±3,1: tiêu đề chiếm góc trên-trái, dải thẻ chiếm ~25% dưới → cụm nằm giữa-phải
    root.scale.setScalar(0.55)
    root.position.set(1.3, 0.62, 0)
  } else {
    root.scale.setScalar(0.62)
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

  phone.rotation.set(-0.06, -0.35, 0.05)
  phone.position.x = -0.95
  root.add(phone)

  // Font web có thể tải xong sau lần vẽ đầu → vẽ lại để chữ tiếng Việt đúng font
  document.fonts?.ready.then(() => {
    if (disposed) return
    drawScreen(screenCanvas)
    screenTex.needsUpdate = true
    if (!playing) renderOnce()
  })

  // ------------------------------------------------------------------ Linh kiện tháo rời
  // Pin dạng túi (pouch) bọc foil + nhãn + tab kết nối
  const battery = new THREE.Group()
  battery.add(new THREE.Mesh(g(new RoundedBoxGeometry(1.0, 1.95, 0.09, 4, 0.06)), foil))
  const labelCanvas = document.createElement('canvas')
  drawBatteryLabel(labelCanvas)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  labelTex.colorSpace = THREE.SRGBColorSpace
  labelTex.anisotropy = 4
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.55, metalness: 0.05 })
  const label = new THREE.Mesh(g(new THREE.PlaneGeometry(0.86, 1.72)), labelMat)
  label.position.z = 0.047
  battery.add(label)
  const tab = new THREE.Mesh(g(new THREE.BoxGeometry(0.34, 0.24, 0.02)), flexMat)
  tab.position.set(0.18, 1.07, 0.02)
  battery.add(tab)

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

  // Khay SIM
  const simTray = new THREE.Group()
  simTray.add(new THREE.Mesh(g(new RoundedBoxGeometry(0.22, 0.9, 0.035, 3, 0.03)), titanium))
  const simCard = new THREE.Mesh(g(new RoundedBoxGeometry(0.15, 0.2, 0.012, 2, 0.01)), gold)
  simCard.position.set(0, 0.05, 0.02)
  simTray.add(simCard)

  const floaters: Floater[] = []
  const addFloater = (obj: THREE.Object3D, pos: [number, number, number], rot: [number, number, number], spin: [number, number, number]) => {
    obj.position.set(...pos)
    obj.rotation.set(...rot)
    root.add(obj)
    floaters.push({ obj, base: obj.position.clone(), phase: Math.random() * Math.PI * 2, spin: new THREE.Vector3(...spin) })
  }
  addFloater(battery, [-3.35, -1.3, -0.6], [0.15, 0.55, -0.12], [0, 0.12, 0])
  addFloater(camModule, [0.75, 3.15, -0.4], [0.3, -0.5, 0.2], [0.05, 0.15, 0])
  addFloater(makeScrew(), [-0.5, 3.05, 0.9], [0.6, 0, 0.5], [0.2, 0.6, 0])
  addFloater(makeScrew(), [0.45, -2.75, 1.0], [-0.4, 0, -0.7], [0.3, 0.5, 0])
  addFloater(simTray, [-2.75, 1.9, 0.6], [0.2, 0.3, 0.9], [0, 0.2, 0.1])

  // Anh thợ đứng bên phải, quay về phía máy (và hơi hướng ra người xem)
  const tech = createTechnician()
  tech.group.position.set(1.45, -PH / 2 - 0.42, 0.55)
  tech.group.rotation.y = -0.95
  tech.group.scale.setScalar(1.12)
  root.add(tech.group)
  const techShadowTex = makeShadowTexture()
  const techShadowMat = new THREE.MeshBasicMaterial({ map: techShadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
  const techShadow = new THREE.Mesh(g(new THREE.PlaneGeometry(1.9, 0.9)), techShadowMat)
  techShadow.rotation.x = -Math.PI / 2
  techShadow.position.set(1.45, -PH / 2 - 0.41, 0.55)
  root.add(techShadow)

  // Bóng mềm dưới điện thoại
  const shadowTex = makeShadowTexture()
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 })
  const shadow = new THREE.Mesh(g(new THREE.PlaneGeometry(3.6, 1.1)), shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(-0.95, -PH / 2 - 0.55, 0)
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
    // Điện thoại xoay rất nhẹ (anh thợ đang làm việc trên máy); cả cụm đung đưa chậm để có chiều sâu
    phone.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.12
    root.rotation.y = Math.sin(t * 0.18) * 0.06
    tech.update(t)
    phone.position.y = Math.sin(t * 0.7) * 0.06
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
  const io = new IntersectionObserver(([entry]) => {
    visibleOnScreen = entry.isIntersecting
    sync()
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
      tech.dispose()
      timer.dispose()
      for (const geo of geos) geo.dispose()
      for (const m of [titanium, backGlass, plateauGlass, lensRing, lensGlass, blackPlastic, glassCoat, foil, pcb, shieldCan, chipMat, gold, screwMat, flexMat, flashMat, screenMat, labelMat, shadowMat, dustMat, techShadowMat]) m.dispose()
      for (const t of [screenTex, labelTex, shadowTex, techShadowTex]) t.dispose()
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
