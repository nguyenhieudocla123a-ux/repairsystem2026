import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Nhân vật "anh thợ sửa chữa" 3D dựng thủ tục (không tải mô hình ngoài): mũ lưỡi trai, áo liền quần,
 * đai đồ nghề, tay áo xắn, tay phải cầm tua vít. Khung xương đơn giản bằng các Group lồng nhau
 * (vai → khuỷu → cổ tay) để xoay khớp.
 *
 * Chuyển động (update mỗi frame): vặn tua vít theo nhịp (đưa tay vào – vặn – rút ra), thở, đầu gật nhẹ
 * theo nhịp làm việc và thỉnh thoảng nhìn ra phía người xem, chớp mắt, tia lửa nhỏ ở đầu tua vít khi vặn.
 */
export interface Technician {
  group: THREE.Group
  update: (t: number) => void
  dispose: () => void
}

const SKIN = '#E8B894'
const NAVY = '#1E3A5F'
const NAVY_DARK = '#16304F'
const CAP = '#0369A1'

export function createTechnician(): Technician {
  const geos: THREE.BufferGeometry[] = []
  const g = <T extends THREE.BufferGeometry>(geo: T) => {
    geos.push(geo)
    return geo
  }
  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.62, metalness: 0 }),
    suit: new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.78, metalness: 0.02 }),
    suitDark: new THREE.MeshStandardMaterial({ color: NAVY_DARK, roughness: 0.8 }),
    cap: new THREE.MeshStandardMaterial({ color: CAP, roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: '#2A1E16', roughness: 0.85 }),
    eye: new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.3 }),
    shoe: new THREE.MeshStandardMaterial({ color: '#1A1C20', roughness: 0.6 }),
    belt: new THREE.MeshStandardMaterial({ color: '#7A4F2A', roughness: 0.7 }),
    buckle: new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 1, roughness: 0.3 }),
    amber: new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: '#D3D7DC', metalness: 1, roughness: 0.22 }),
    grip: new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.7 }),
    patch: new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.5, emissive: '#0EA5E9', emissiveIntensity: 0.15 }),
    spark: new THREE.MeshBasicMaterial({ color: '#FFD27A', transparent: true, opacity: 0, toneMapped: false }),
  }

  const root = new THREE.Group()

  // ---------------------------------------------------------------- Chân + giày
  const legGeo = g(new THREE.CapsuleGeometry(0.16, 0.86, 6, 16))
  const shoeGeo = g(new RoundedBoxGeometry(0.32, 0.2, 0.52, 3, 0.08))
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, mats.suit)
    leg.position.set(side * 0.21, 0.75, 0)
    root.add(leg)
    const shoe = new THREE.Mesh(shoeGeo, mats.shoe)
    shoe.position.set(side * 0.21, 0.1, 0.08)
    root.add(shoe)
  }

  // ---------------------------------------------------------------- Thân (thở bằng scale)
  const torso = new THREE.Group()
  torso.position.y = 1.32
  root.add(torso)
  const body = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.44, 0.62, 8, 20)), mats.suit)
  body.position.y = 0.52
  body.scale.set(1, 1, 0.78)
  torso.add(body)
  // Đai đồ nghề + khóa + túi đồ
  const belt = new THREE.Mesh(g(new THREE.TorusGeometry(0.43, 0.055, 8, 32)), mats.belt)
  belt.rotation.x = Math.PI / 2
  belt.scale.set(1, 0.78, 1)
  belt.position.y = 0.06
  torso.add(belt)
  const buckle = new THREE.Mesh(g(new RoundedBoxGeometry(0.14, 0.1, 0.04, 2, 0.015)), mats.buckle)
  buckle.position.set(0, 0.06, 0.345)
  torso.add(buckle)
  const pouch = new THREE.Mesh(g(new RoundedBoxGeometry(0.2, 0.22, 0.12, 2, 0.03)), mats.belt)
  pouch.position.set(0.36, -0.06, 0.18)
  pouch.rotation.y = 0.6
  torso.add(pouch)
  // Túi ngực + logo xanh
  const pocket = new THREE.Mesh(g(new RoundedBoxGeometry(0.2, 0.18, 0.03, 2, 0.02)), mats.suitDark)
  pocket.position.set(-0.17, 0.72, 0.33)
  torso.add(pocket)
  const patch = new THREE.Mesh(g(new THREE.CircleGeometry(0.06, 20)), mats.patch)
  patch.position.set(0.17, 0.74, 0.345)
  torso.add(patch)
  // Bút cài túi
  const pen = new THREE.Mesh(g(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8)), mats.amber)
  pen.position.set(-0.12, 0.84, 0.35)
  torso.add(pen)

  // ---------------------------------------------------------------- Đầu (gật / quay)
  const neck = new THREE.Mesh(g(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 12)), mats.skin)
  neck.position.y = 1.18
  torso.add(neck)
  const head = new THREE.Group()
  head.position.y = 1.5
  torso.add(head)
  const skull = new THREE.Mesh(g(new THREE.SphereGeometry(0.34, 32, 24)), mats.skin)
  skull.scale.set(1, 1.08, 1)
  head.add(skull)
  // Tóc phía sau + mũ lưỡi trai
  const hair = new THREE.Mesh(g(new THREE.SphereGeometry(0.352, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62)), mats.hair)
  hair.rotation.x = -0.35
  head.add(hair)
  const capTop = new THREE.Mesh(g(new THREE.SphereGeometry(0.36, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)), mats.cap)
  capTop.position.y = 0.06
  head.add(capTop)
  const brim = new THREE.Mesh(g(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 28, 1, false, -Math.PI / 2, Math.PI)), mats.cap)
  brim.scale.set(1.15, 1, 1.25)
  brim.position.set(0, 0.07, 0.25)
  head.add(brim)
  const button = new THREE.Mesh(g(new THREE.SphereGeometry(0.035, 10, 8)), mats.cap)
  button.position.y = 0.42
  head.add(button)
  // Tai, mắt, mũi, miệng
  const earGeo = g(new THREE.SphereGeometry(0.07, 12, 10))
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, mats.skin)
    ear.position.set(side * 0.33, -0.02, 0)
    ear.scale.set(0.6, 1, 1)
    head.add(ear)
  }
  const eyeGeo = g(new THREE.SphereGeometry(0.042, 12, 10))
  const eyes: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, mats.eye)
    eye.position.set(side * 0.12, 0.0, 0.31)
    head.add(eye)
    eyes.push(eye)
  }
  const browGeo = g(new RoundedBoxGeometry(0.11, 0.025, 0.02, 2, 0.01))
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, mats.hair)
    brow.position.set(side * 0.12, 0.08, 0.315)
    brow.rotation.z = side * -0.12
    head.add(brow)
  }
  const nose = new THREE.Mesh(g(new THREE.SphereGeometry(0.05, 12, 10)), mats.skin)
  nose.position.set(0, -0.06, 0.34)
  head.add(nose)
  const mouth = new THREE.Mesh(g(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI)), mats.eye)
  mouth.position.set(0, -0.15, 0.3)
  mouth.rotation.set(0.15, 0, Math.PI)
  head.add(mouth)

  // ---------------------------------------------------------------- Tay (vai → khuỷu → bàn tay)
  const upperGeo = g(new THREE.CapsuleGeometry(0.12, 0.42, 6, 14))
  const foreGeo = g(new THREE.CapsuleGeometry(0.1, 0.38, 6, 14))
  const handGeo = g(new THREE.SphereGeometry(0.12, 16, 12))
  const makeArm = (side: 1 | -1) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.52, 0.86, 0)
    torso.add(shoulder)
    const upper = new THREE.Mesh(upperGeo, mats.suit)
    upper.position.y = -0.3
    shoulder.add(upper)
    const elbow = new THREE.Group()
    elbow.position.y = -0.6
    shoulder.add(elbow)
    // Tay áo xắn tới khuỷu → cẳng tay để da
    const cuff = new THREE.Mesh(g(new THREE.TorusGeometry(0.115, 0.04, 8, 18)), mats.suitDark)
    cuff.rotation.x = Math.PI / 2
    elbow.add(cuff)
    const fore = new THREE.Mesh(foreGeo, mats.skin)
    fore.position.y = -0.27
    elbow.add(fore)
    const hand = new THREE.Group()
    hand.position.y = -0.56
    elbow.add(hand)
    hand.add(new THREE.Mesh(handGeo, mats.skin))
    return { shoulder, elbow, hand }
  }
  const right = makeArm(-1) // tay phải của nhân vật (bên trái người xem khi nhìn thẳng)
  const left = makeArm(1)

  // Tua vít trong tay phải: cán lục giác hổ phách (thấy rõ khi xoay) + vòng cao su + thân thép
  const screwdriver = new THREE.Group()
  const handle = new THREE.Mesh(g(new THREE.CylinderGeometry(0.075, 0.085, 0.34, 6)), mats.amber)
  screwdriver.add(handle)
  const gripBand = new THREE.Mesh(g(new THREE.CylinderGeometry(0.088, 0.088, 0.08, 6)), mats.grip)
  gripBand.position.y = -0.1
  screwdriver.add(gripBand)
  const shaft = new THREE.Mesh(g(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 10)), mats.steel)
  shaft.position.y = -0.42
  screwdriver.add(shaft)
  const tip = new THREE.Mesh(g(new THREE.ConeGeometry(0.03, 0.08, 4)), mats.steel)
  tip.position.y = -0.71
  tip.rotation.x = Math.PI
  screwdriver.add(tip)
  // Tia lửa nhỏ ở đầu tua vít
  const sparkGeo = g(new THREE.SphereGeometry(0.03, 6, 6))
  const sparks: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(sparkGeo, mats.spark)
    sp.position.y = -0.76
    screwdriver.add(sp)
    sparks.push(sp)
  }
  // Lớp ngoài định hướng (nối dài cẳng tay, hơi chúc xuống), lớp trong xoay quanh trục thân tua vít khi vặn
  const screwdriverMount = new THREE.Group()
  screwdriverMount.rotation.x = 0.35
  screwdriverMount.position.y = -0.02
  screwdriverMount.add(screwdriver)
  right.hand.add(screwdriverMount)

  // ---------------------------------------------------------------- Tư thế gốc
  // Tay phải: giơ ra trước, khuỷu gập – tua vít chĩa về phía trước; tay trái: đỡ máy ở thấp hơn
  const pose = {
    rShoulderX: -1.05,
    rShoulderZ: 0.25,
    rElbowX: -0.75,
    lShoulderX: -0.75,
    lShoulderZ: -0.2,
    lElbowX: -0.9,
  }

  const update = (t: number) => {
    // Nhịp làm việc 2,6 giây: đưa vào (0–0,25) – vặn (0,25–0,75) – rút ra (0,75–1)
    const cycle = (t % 2.6) / 2.6
    const reach = cycle < 0.25 ? cycle / 0.25 : cycle < 0.75 ? 1 : 1 - (cycle - 0.75) / 0.25
    const ease = reach * reach * (3 - 2 * reach)
    const twisting = cycle >= 0.25 && cycle < 0.75

    right.shoulder.rotation.x = pose.rShoulderX - ease * 0.18
    right.shoulder.rotation.z = pose.rShoulderZ
    right.elbow.rotation.x = pose.rElbowX + ease * 0.22
    // Vặn: cổ tay xoay qua lại nhanh khi đang vặn
    const twist = twisting ? Math.sin((cycle - 0.25) * Math.PI * 10) : 0
    right.hand.rotation.y = twist * 0.9
    screwdriver.rotation.y = twist * 1.2

    // Tay trái giữ máy, rung nhẹ theo nhịp vặn
    left.shoulder.rotation.x = pose.lShoulderX + Math.sin(t * 1.3) * 0.03
    left.shoulder.rotation.z = pose.lShoulderZ
    left.elbow.rotation.x = pose.lElbowX + (twisting ? Math.sin(t * 16) * 0.015 : 0)

    // Thở + dồn trọng tâm
    const breath = Math.sin(t * 1.9)
    body.scale.set(1 + breath * 0.012, 1 + breath * 0.018, 0.78 + breath * 0.01)
    torso.rotation.z = Math.sin(t * 0.6) * 0.025
    torso.rotation.x = 0.06 + ease * 0.05 // nghiêng người về phía máy khi vặn

    // Đầu: nhìn vào việc, gật nhẹ khi vặn; mỗi ~9 giây ngẩng lên nhìn ra phía người xem
    const look = Math.max(0, Math.sin((t / 9) * Math.PI * 2) - 0.85) / 0.15
    head.rotation.x = 0.28 - look * 0.32 + (twisting ? Math.sin(t * 8) * 0.02 : 0)
    head.rotation.y = 0.25 - look * 0.6

    // Chớp mắt mỗi 3,4 giây
    const blink = t % 3.4 < 0.12 ? 0.12 : 1
    for (const e of eyes) e.scale.y = blink

    // Tia lửa: lóe lên rồi bay ra khi đang vặn
    sparks.forEach((sp, i) => {
      const p = ((t * 2.2 + i / sparks.length) % 1)
      const on = twisting && p < 0.6
      mats.spark.opacity = twisting ? 0.95 : 0
      sp.visible = on
      if (on) {
        const a = i * 1.7 + t * 3
        sp.position.set(Math.cos(a) * p * 0.22, -0.76 - p * 0.12, Math.sin(a) * p * 0.22)
        sp.scale.setScalar(1 - p)
      }
    })
  }
  update(0.6)

  return {
    group: root,
    update,
    dispose() {
      for (const geo of geos) geo.dispose()
      for (const m of Object.values(mats)) m.dispose()
    },
  }
}
