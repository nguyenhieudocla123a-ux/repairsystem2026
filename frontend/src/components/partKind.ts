export type PartKind = 'screen' | 'battery' | 'camera' | 'port' | 'speaker' | 'keyboard' | 'board' | 'storage' | 'cable' | 'generic'

/** Đoán loại linh kiện từ danh mục/tên (chỉ để chọn hình minh họa, không ảnh hưởng nghiệp vụ). */
export function guessPartKind(...texts: (string | null | undefined)[]): PartKind {
  const t = texts.filter(Boolean).join(' ').toLowerCase()
  const rules: [PartKind, RegExp][] = [
    ['screen', /màn hình|man hinh|lcd|oled|screen|display|cảm ứng|kính/],
    ['battery', /\bpin\b|battery/],
    ['camera', /camera|cam\b/],
    ['port', /cổng|sạc|charging|port|usb|lightning/],
    ['speaker', /loa|speaker|mic/],
    ['keyboard', /bàn phím|keyboard|phím/],
    ['storage', /ssd|hdd|ổ cứng|ram|bộ nhớ|memory/],
    ['board', /main|bo mạch|ic\b|chip|board/],
    ['cable', /cáp|cable|flex|dây/],
  ]
  return rules.find(([, re]) => re.test(t))?.[0] ?? 'generic'
}
