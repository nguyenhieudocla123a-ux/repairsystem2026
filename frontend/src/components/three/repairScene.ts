import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Cảnh 3D trang trí cho trang công khai: một chiếc điện thoại đang "được sửa" (màn hình hiển thị tiến độ phiếu)
 * cùng các linh kiện bay quanh – bánh răng, khiên bảo hành, chip, pin, ốc vít.
 *
 * Quy tắc hiệu năng (ui-ux-pro-max – stack threejs):
 * - Mọi geometry/material tạo MỘT lần trước vòng lặp; vòng lặp chỉ đổi transform.
 * - Vòng lặp dùng renderer.setAnimationLoop → tạm dừng (null) khi tab ẩn hoặc canvas ra khỏi màn hình.
 * - dispose() giải phóng toàn bộ geometry, material, texture, môi trường PMREM và renderer.
 * - Giảm chuyển động: chỉ vẽ một khung hình tĩnh, không có vòng lặp.
 */
export interface RepairSceneOptions {
  reducedMotion: boolean
}

export interface RepairSceneHandle {
  dispose: () => void
}

const SKY = new THREE.Color('#38BDF8')
const AMBER = new THREE.Color('#F59E0B')

/** Vẽ giao diện màn hình điện thoại lên canvas 2D → dùng làm texture. */
function drawScreen(canvas: HTMLCanvasElement) {
  const w = 512
  const h = 1024
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#0B1A2E')
  bg.addColorStop(1, '#06101F')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const font = (weight: number, size: number) => `${weight} ${size}px 'Inter Variable', Inter, 'Segoe UI', sans-serif`
  ctx.fillStyle = '#7DD3FC'
  ctx.font = font(600, 26)
  ctx.fillText('RepairFlow', 48, 92)
  ctx.fillStyle = '#94A3B8'
  ctx.font = font(500, 22)
  ctx.fillText('Phiếu RO-2026-000123', 48, 132)

  // Vòng tiến độ 75%
  const cx = w / 2
  const cy = 360
  const r = 150
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(148,163,184,0.18)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  ring.addColorStop(0, '#38BDF8')
  ring.addColorStop(1, '#0369A1')
  ctx.strokeStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.75)
  ctx.stroke()
  ctx.fillStyle = '#F8FAFC'
  ctx.font = font(700, 84)
  ctx.textAlign = 'center'
  ctx.fillText('75%', cx, cy + 28)
  ctx.fillStyle = '#94A3B8'
  ctx.font = font(500, 26)
  ctx.fillText('Đang sửa chữa', cx, cy + 76)
  ctx.textAlign = 'left'

  const steps: [string, 'done' | 'active' | 'todo'][] = [
    ['Tiếp nhận thiết bị', 'done'],
    ['Kiểm tra & báo giá', 'done'],
    ['Khách đã duyệt', 'done'],
    ['Đang thay màn hình', 'active'],
    ['Bàn giao & bảo hành', 'todo'],
  ]
  steps.forEach(([label, state], i) => {
    const y = 620 + i * 72
    ctx.fillStyle = state === 'todo' ? 'rgba(148,163,184,0.25)' : state === 'active' ? '#F59E0B' : '#38BDF8'
    ctx.beginPath()
    ctx.arc(64, y - 8, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = state === 'todo' ? '#64748B' : '#E2E8F0'
    ctx.font = font(state === 'active' ? 600 : 500, 26)
    ctx.fillText(label, 96, y)
  })
}

function gearShape(teeth: number, rOuter: number, rInner: number, rHole: number) {
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts: [number, number][] = [
      [rInner, a],
      [rOuter, a + step * 0.15],
      [rOuter, a + step * 0.45],
      [rInner, a + step * 0.6],
    ]
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r
      if (i === 0 && j === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
  }
  shape.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0, rHole, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function shieldShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0.62)
  s.bezierCurveTo(0.22, 0.5, 0.42, 0.48, 0.5, 0.46)
  s.bezierCurveTo(0.5, 0.05, 0.36, -0.36, 0, -0.62)
  s.bezierCurveTo(-0.36, -0.36, -0.5, 0.05, -0.5, 0.46)
  s.bezierCurveTo(-0.42, 0.48, -0.22, 0.5, 0, 0.62)
  return s
}

interface Floater {
  obj: THREE.Object3D
  base: THREE.Vector3
  phase: number
  spin: THREE.Vector3
}

export function createRepairScene(container: HTMLElement, { reducedMotion }: RepairSceneOptions): RepairSceneHandle | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch {
    return null // máy không hỗ trợ WebGL → component hiển thị nền tĩnh
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.2, 9.5)

  // Ánh sáng: key trắng, rim xanh phía sau, điểm hổ phách phía dưới – tạo chiều sâu trên nền navy
  scene.add(new THREE.HemisphereLight('#BAE6FD', '#0B1220', 0.5))
  const key = new THREE.DirectionalLight('#FFFFFF', 1.6)
  key.position.set(3, 4, 6)
  scene.add(key)
  const rim = new THREE.PointLight(SKY, 40, 20)
  rim.position.set(-3.5, 2, -2.5)
  scene.add(rim)
  const warm = new THREE.PointLight(AMBER, 14, 12)
  warm.position.set(3, -2.5, 2)
  scene.add(warm)

  const root = new THREE.Group()
  // Cụm 3D lệch phải, chừa chỗ cho tiêu đề bên trái
  root.scale.setScalar(0.8)
  root.position.set(1.05, 0.05, 0)
  scene.add(root)

  // --- Điện thoại
  const phone = new THREE.Group()
  const bodyGeo = new RoundedBoxGeometry(2.3, 4.6, 0.26, 6, 0.32)
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#1E293B', metalness: 0.7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 })
  phone.add(new THREE.Mesh(bodyGeo, bodyMat))
  const screenCanvas = document.createElement('canvas')
  drawScreen(screenCanvas)
  const screenTex = new THREE.CanvasTexture(screenCanvas)
  screenTex.colorSpace = THREE.SRGBColorSpace
  screenTex.anisotropy = 4
  const screenGeo = new THREE.PlaneGeometry(2.06, 4.32)
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  const screen = new THREE.Mesh(screenGeo, screenMat)
  screen.position.z = 0.135
  phone.add(screen)
  phone.rotation.set(-0.08, -0.42, 0.06)
  root.add(phone)
  // Font web có thể tải xong sau khi vẽ lần đầu → vẽ lại để chữ tiếng Việt dùng đúng font
  document.fonts?.ready.then(() => {
    drawScreen(screenCanvas)
    screenTex.needsUpdate = true
    if (reducedMotion) renderer.render(scene, camera)
  })

  // --- Linh kiện bay quanh
  const metal = new THREE.MeshStandardMaterial({ color: '#CBD5E1', metalness: 0.95, roughness: 0.25 })
  const skyMat = new THREE.MeshPhysicalMaterial({ color: '#0EA5E9', metalness: 0.2, roughness: 0.2, clearcoat: 1, emissive: '#0369A1', emissiveIntensity: 0.25 })
  const darkMat = new THREE.MeshStandardMaterial({ color: '#0F172A', metalness: 0.4, roughness: 0.5 })
  const amberMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.6, roughness: 0.3 })

  const extrude = { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 24 }
  const gearGeo = new THREE.ExtrudeGeometry(gearShape(12, 0.62, 0.5, 0.2), extrude)
  gearGeo.center()
  const smallGearGeo = new THREE.ExtrudeGeometry(gearShape(9, 0.36, 0.28, 0.1), extrude)
  smallGearGeo.center()
  const shieldGeo = new THREE.ExtrudeGeometry(shieldShape(), { ...extrude, depth: 0.14 })
  shieldGeo.center()
  const chipGeo = new RoundedBoxGeometry(0.8, 0.8, 0.12, 3, 0.06)
  const pinGeo = new THREE.BoxGeometry(0.08, 0.16, 0.04)
  const batteryGeo = new RoundedBoxGeometry(0.5, 1.0, 0.18, 4, 0.08)
  const capGeo = new THREE.BoxGeometry(0.22, 0.08, 0.1)
  const screwShaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.42, 16)
  const screwHeadGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24)

  const chip = new THREE.Group()
  chip.add(new THREE.Mesh(chipGeo, darkMat))
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const pin = new THREE.Mesh(pinGeo, amberMat)
      pin.position.set(-0.27 + i * 0.18, side * 0.46, 0)
      chip.add(pin)
    }
  }
  const battery = new THREE.Group()
  battery.add(new THREE.Mesh(batteryGeo, skyMat))
  const cap = new THREE.Mesh(capGeo, metal)
  cap.position.y = 0.54
  battery.add(cap)
  const makeScrew = () => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(screwShaftGeo, metal))
    const head = new THREE.Mesh(screwHeadGeo, metal)
    head.position.y = 0.24
    g.add(head)
    return g
  }

  const floaters: Floater[] = []
  const addFloater = (obj: THREE.Object3D, pos: [number, number, number], spin: [number, number, number]) => {
    obj.position.set(...pos)
    root.add(obj)
    floaters.push({ obj, base: obj.position.clone(), phase: Math.random() * Math.PI * 2, spin: new THREE.Vector3(...spin) })
  }
  addFloater(new THREE.Mesh(gearGeo, metal), [1.9, 1.75, 0.6], [0.1, 0.25, 0.5])
  addFloater(new THREE.Mesh(smallGearGeo, amberMat), [2.15, 0.55, -0.6], [0.2, -0.3, -0.8])
  addFloater(new THREE.Mesh(shieldGeo, skyMat), [-2.1, 0.9, 0.8], [0, 0.5, 0])
  addFloater(chip, [-2.2, -1.4, 0.2], [0.3, 0.4, 0.1])
  addFloater(battery, [1.8, -1.7, 0.9], [0.2, 0.3, 0.25])
  addFloater(makeScrew(), [-0.9, 2.5, 1.2], [0.6, 0.2, 0.4])
  addFloater(makeScrew(), [0.9, -2.6, 1.0], [0.4, 0.5, 0.2])

  // --- Hạt sáng nền
  const COUNT = 260
  const positions = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const r = 4 + Math.random() * 5
    const t = Math.random() * Math.PI * 2
    const p = Math.acos(2 * Math.random() - 1)
    positions.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.7, r * Math.sin(p) * Math.sin(t) - 3], i * 3)
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const dustMat = new THREE.PointsMaterial({ color: '#7DD3FC', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)

  // --- Kích thước theo khung chứa
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Khung hẹp/dọc → lùi camera để cả cụm vẫn nằm trọn
    camera.position.z = w / h < 0.9 ? 13 : 10.5
    camera.updateProjectionMatrix()
    renderer.domElement.style.width = `${w}px`
    renderer.domElement.style.height = `${h}px`
    if (reducedMotion) renderer.render(scene, camera)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  // --- Tương tác: nghiêng theo con trỏ (parallax nhẹ)
  const pointer = new THREE.Vector2()
  const onPointer = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect()
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1)
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  const timer = new THREE.Timer()
  timer.connect(document)
  const animate = (timestamp?: number) => {
    timer.update(timestamp)
    const t = timer.getElapsed()
    const dt = Math.min(timer.getDelta(), 0.05)
    root.rotation.y += (pointer.x * 0.25 + Math.sin(t * 0.25) * 0.12 - root.rotation.y) * 0.04
    root.rotation.x += (pointer.y * 0.12 - root.rotation.x) * 0.04
    phone.position.y = Math.sin(t * 0.8) * 0.08
    for (const f of floaters) {
      f.obj.position.y = f.base.y + Math.sin(t * 0.9 + f.phase) * 0.14
      f.obj.rotation.x += f.spin.x * dt
      f.obj.rotation.y += f.spin.y * dt
      f.obj.rotation.z += f.spin.z * dt
    }
    dust.rotation.y += dt * 0.02
    renderer.render(scene, camera)
  }

  // --- Chỉ chạy khi thấy được: tab hiện + canvas trong viewport
  let visibleOnScreen = true
  const sync = () => renderer.setAnimationLoop(!reducedMotion && visibleOnScreen && !document.hidden ? animate : null)
  const io = new IntersectionObserver(([entry]) => {
    visibleOnScreen = entry.isIntersecting
    sync()
  })
  io.observe(container)
  document.addEventListener('visibilitychange', sync)
  if (reducedMotion) renderer.render(scene, camera)
  else sync()

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', onPointer)
      timer.dispose()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
      })
      for (const m of [bodyMat, screenMat, metal, skyMat, darkMat, amberMat, dustMat]) m.dispose()
      for (const g of [pinGeo, screwShaftGeo, screwHeadGeo]) g.dispose()
      screenTex.dispose()
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
