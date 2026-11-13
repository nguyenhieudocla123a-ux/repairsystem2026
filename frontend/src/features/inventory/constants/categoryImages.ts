/**
 * Ảnh mặc định theo nhóm linh kiện (khi linh kiện chưa có ảnh thật).
 * Nguồn: Adobe Stock – ảnh miễn phí có giấy phép, số trong tên file là mã ảnh Adobe Stock (xem docs/parts-and-warranty-research.md).
 * Mỗi nhóm một ảnh riêng, không dùng chung – thẻ loại nào cũng nhận ra được ngay.
 */
const img = (id: string) => `/images/parts/${id}.webp`

export const CATEGORY_IMAGES: Record<string, string> = {
  SCREEN: img('281943481'),
  GLASS: img('1188182214'),
  TOUCH: img('265251382'),
  BATTERY: img('158213122'),
  CHARGE_PORT: img('323549871'),
  CAMERA_REAR: img('553890779'),
  CAMERA_FRONT: img('761141142'),
  CAMERA_GLASS: img('280888152'),
  SPEAKER: img('503707369'),
  EARPIECE: img('318581066'),
  MICROPHONE: img('326346059'),
  VIBRATOR: img('317094156'),
  BUTTON: img('416575305'),
  BIOMETRIC: img('346423168'),
  SIM_TRAY: img('527687613'),
  ANTENNA: img('434112746'),
  SENSOR: img('266617869'),
  BACK_GLASS: img('509055934'),
  HOUSING: img('506962945'),
  FLEX: img('432145164'),
  SCREEN_CABLE: img('482712207'),
  IC: img('331628108'),
  MAINBOARD: img('122255882'),
  HINGE: img('372191128'),
  TOUCHPAD: img('379514824'),
  WEBCAM: img('455711789'),
  PORT: img('235072440'),
  KEYBOARD: img('557749555'),
  ADAPTER: img('523613191'),
  RAM: img('392438035'),
  STORAGE: img('302430502'),
  FAN: img('233209848'),
  WIFI: img('163666965'),
  CPU: img('789604860'),
  VGA: img('395168135'),
  PSU: img('437044686'),
  CASE: img('238589219'),
  OTHER: img('135103523'),
}

export function categoryImage(code: string | null | undefined): string {
  return (code && CATEGORY_IMAGES[code]) || CATEGORY_IMAGES.OTHER
}
