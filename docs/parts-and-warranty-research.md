# Linh kiện thiết bị điện tử & chính sách bảo hành theo linh kiện – tìm hiểu (2026-11-13)

Mục tiêu: xác định **những linh kiện cửa hàng sửa chữa cần quản lý** cho từng loại thiết bị RepairFlow hỗ trợ
(`PHONE, TABLET, LAPTOP, DESKTOP, SMARTWATCH`) và **bảo hành nên tính theo từng linh kiện** thế nào.

> Nguồn: chính sách công khai của các chuỗi sửa chữa tại VN (24hStore, Điện Thoại Vui…) và chính sách hãng (ASUS, Acer…),
> truy cập 13/11/2026. Con số là **mức tham khảo của thị trường**, mỗi cửa hàng tự quyết – không phải quy định pháp luật.

## 1. Hiện trạng RepairFlow (vì sao "chưa rõ ràng")

| Chỗ | Hiện tại | Vấn đề |
|---|---|---|
| `parts.category` | chữ tự do, DB đang có 1 linh kiện / 1 nhóm ("Màn hình") | không có danh mục chuẩn, không biết linh kiện dùng cho loại máy nào |
| Bảo hành | `warranties.months` – **một con số cho cả phiếu** (1–24 tháng) | thay màn hình + pin + loa trong một phiếu thì không thể bảo hành khác nhau |
| Điều khoản | `warranties.terms` – chữ tự do | không có điều kiện từ chối chuẩn (vào nước, rơi vỡ, rách tem…) |
| Chất lượng linh kiện | không có | khách không biết linh kiện chính hãng hay thay thế → tranh chấp bảo hành |

## 2. Danh mục linh kiện theo loại thiết bị

Mã nhóm (đề xuất) dùng làm khoá ổn định; tên tiếng Việt để hiển thị.

### 2.1 Điện thoại (PHONE)
| Mã nhóm | Linh kiện | Ghi chú |
|---|---|---|
| SCREEN | Màn hình nguyên cụm (OLED/LCD) | lỗi hay gặp nhất |
| GLASS | Mặt kính (ép kính) | dịch vụ ép kính, giữ màn gốc |
| TOUCH | Cảm ứng rời | máy đời cũ / máy tính bảng |
| BATTERY | Pin | linh kiện hao mòn |
| CHARGE_PORT | Cụm chân sạc / cáp sạc | thường kèm mic chính |
| CAMERA_REAR | Camera sau | |
| CAMERA_FRONT | Camera trước | |
| CAMERA_GLASS | Kính camera sau | |
| SPEAKER | Loa ngoài | |
| EARPIECE | Loa trong (loa thoại) | |
| MICROPHONE | Mic | |
| VIBRATOR | Rung (Taptic Engine) | |
| BUTTON | Nút nguồn / âm lượng (cáp nút) | |
| BIOMETRIC | Face ID / Touch ID / vân tay | iPhone: thường chỉ sửa được ở hãng/khó, bảo hành rất ngắn |
| BACK_GLASS | Kính lưng | |
| HOUSING | Vỏ / khung sườn | |
| SIM_TRAY | Khay SIM | |
| ANTENNA | Cáp sóng / ăng-ten, NFC, cuộn sạc không dây | |
| FLEX | Cáp nối (flex) | |
| IC | IC sạc, IC nguồn, IC âm thanh… | sửa trên main |
| MAINBOARD | Mainboard (thay) | |
| (dịch vụ) | Sửa main, vệ sinh, cài phần mềm | là công, không phải linh kiện |

### 2.2 Máy tính bảng (TABLET)
Như điện thoại, nhấn mạnh **cảm ứng rời (TOUCH)** và **ép cảm ứng**; thêm *chuông/loa*, *cổng sạc*, *bút (Pencil) – phụ kiện*.

### 2.3 Laptop (LAPTOP)
| Mã nhóm | Linh kiện |
|---|---|
| SCREEN | Tấm màn hình (panel) / màn nguyên cụm cảm ứng |
| SCREEN_CABLE | Cáp màn hình |
| HINGE | Bản lề |
| HOUSING | Vỏ (mặt A/B/C/D) |
| KEYBOARD | Bàn phím |
| TOUCHPAD | Touchpad / trackpad |
| BATTERY | Pin |
| ADAPTER | Sạc (adapter) |
| CHARGE_PORT | Cổng sạc / DC jack / USB-C sạc |
| RAM | RAM |
| STORAGE | SSD / HDD |
| FAN | Quạt tản nhiệt (+ keo tản nhiệt – dịch vụ) |
| WIFI | Card Wi-Fi / Bluetooth |
| SPEAKER | Loa |
| WEBCAM | Webcam |
| PORT | Cổng USB / HDMI / audio |
| MAINBOARD | Mainboard (thay / sửa) |

### 2.4 Máy tính bàn (DESKTOP)
CPU · MAINBOARD · RAM · STORAGE (SSD/HDD) · VGA (card đồ hoạ) · PSU (nguồn) · FAN/tản nhiệt · CASE · (màn hình rời, bàn phím, chuột là thiết bị riêng).

### 2.5 Đồng hồ thông minh (SMARTWATCH)
SCREEN · GLASS · TOUCH · BATTERY · HOUSING · BUTTON (nút / núm xoay) · SENSOR (cảm biến nhịp tim) · MAINBOARD. Dây đeo là phụ kiện.

## 3. Chất lượng / nguồn gốc linh kiện (ảnh hưởng trực tiếp bảo hành)

| Mã | Ý nghĩa | Ví dụ thị trường |
|---|---|---|
| OEM | Chính hãng (linh kiện hãng / có giấy tờ) | |
| ORIGINAL_USED | Zin tháo máy | bảo hành thường ngắn hơn |
| AFTERMARKET | Linh kiện thay thế có thương hiệu | GENA, Pisen, Deji, Kars, EK… |
| GENERIC | Linh kiện thay thế không thương hiệu | |

iPhone đời mới có thể báo "linh kiện không xác định" khi thay pin/màn/camera không chính hãng → nên ghi rõ loại linh kiện trên báo giá.

## 4. Mức bảo hành phổ biến theo linh kiện (tham khảo thị trường)

| Linh kiện | Điện thoại / máy tính bảng | Laptop | Ghi chú |
|---|---|---|---|
| Màn hình | 6–12 tháng (có nơi bảo hành vĩnh viễn cho iPhone, bao vỡ kính 1 lần 30–45 ngày) | 6–12 tháng | thường tách: lỗi hiển thị vs lỗi cảm ứng; bụi/bọt/hở keo bảo hành dài |
| Mặt kính / cảm ứng | 6 tháng cảm ứng; vỡ kính chỉ 30 ngày | – | |
| Pin | 12 tháng (6–24 tuỳ thương hiệu) | 12 tháng (hãng: pin 1 năm) | hao mòn; một số nơi kèm điều kiện chu kỳ sạc / dung lượng |
| Camera, loa, mic, chân sạc, rung | 6–12 tháng (có nơi vĩnh viễn) | 3–6 tháng (linh kiện khác) | |
| Nút vật lý | 6 tháng | – | |
| Face ID / Touch ID | ~1 tháng | – | |
| Bàn phím | – | 12 tháng (đến 24) | |
| RAM | – | 36 tháng (có nơi đến 10 năm) | |
| SSD / ổ cứng | – | 12–36 tháng | không chịu trách nhiệm dữ liệu |
| Sạc adapter | – | ~14 tháng | |
| Kính lưng / vỏ | màu sắc 6–12 tháng; bao vỡ 30–45 ngày | – | |
| Thay mainboard | 3–6 tháng (đến 12) | 3–6 tháng | |
| Sửa mainboard (công) | 3 tháng | 3 tháng | |
| Linh kiện thay trong thời gian bảo hành của hãng | bảo hành phần còn lại | | (chính sách GIGABYTE) |

**Hình thức:** đa số áp dụng **1 đổi 1** linh kiện lỗi trong thời hạn; một số nơi giảm giá lần sửa sau khi đã hết bảo hành.

## 5. Điều kiện từ chối bảo hành phổ biến

Áp dụng chung: vào nước / ẩm / hoá chất · rơi vỡ, va đập, móp méo · **tem bảo hành rách / tẩy xoá / mất** ·
bên thứ ba can thiệp · tự ý tháo mở · hết hạn · côn trùng (laptop/PC) · sai nguồn điện, thiên tai.
Riêng: **pin** cháy nổ / phồng do tác động ngoài · **màn hình** ngấm nước, cấn, chảy mực, sọc do va đập, vỡ kính gây lỗi
hiển thị · **ổ cứng/RAM** cháy, biến dạng, mất tem; không bảo hành dữ liệu · **Face ID** chỉ bảo hành rất ngắn.

## 6. Thay đổi RepairFlow (đã làm – V9, TD-76/77)

1. **Danh mục nhóm linh kiện** `part_categories`: mã (SCREEN, BATTERY…), tên, áp dụng cho loại thiết bị nào,
   **thời hạn bảo hành mặc định (tháng)**, mô tả phạm vi bảo hành, điều kiện từ chối riêng. Nạp sẵn danh mục ở mục 2
   (đây là dữ liệu tham chiếu, không phải dữ liệu giả); cửa hàng sửa con số tháng theo chính sách của mình.
2. **Linh kiện** `parts`: thêm `category_id` (thay chữ tự do), `device_type`, `grade` (OEM/ORIGINAL_USED/AFTERMARKET/GENERIC),
   `brand`, `compatible_models`, `warranty_months` (ghi đè mặc định của nhóm nếu cần).
3. **Bảo hành theo từng dòng**: bảng `warranty_items` – mỗi linh kiện/dịch vụ trên phiếu có hạn riêng
   (lấy từ linh kiện → nhóm → mặc định của cửa hàng), phiếu bảo hành hiển thị từng dòng "Màn hình GENA – đến 13/05/2027".
   Tra cứu bảo hành công khai trả từng dòng còn/hết hạn.
4. **Điều khoản chuẩn**: điều kiện từ chối chung + theo nhóm, in trên phiếu bảo hành; yêu cầu bảo hành chọn
   **linh kiện nào** bị lỗi để kiểm tra đúng hạn của linh kiện đó.
5. Báo giá hiển thị loại linh kiện + thời hạn bảo hành từng dòng **trước khi khách duyệt** (minh bạch).

## 7. Ảnh linh kiện

Ảnh mặc định theo nhóm: 38 ảnh **Adobe Stock miễn phí** (đã lấy giấy phép qua Adobe connector), mỗi nhóm một ảnh riêng
không trùng nhau ("Loa trong" dùng ảnh bộ linh kiện điện thoại có loa trong), lưu ở
`frontend/public/images/parts/<mã Adobe Stock>.webp` (480×360). Bảng nhóm → ảnh: `frontend/src/features/inventory/constants/categoryImages.ts`.
Mã ảnh: 281943481, 1188182214, 265251382, 158213122, 323549871, 553890779, 761141142, 280888152, 503707369, 318581066,
326346059, 317094156, 416575305, 346423168, 509055934, 506962945, 527687613, 434112746, 432145164, 331628108,
122255882, 482712207, 372191128, 557749555, 379514824, 523613191, 392438035, 302430502, 233209848, 163666965,
455711789, 235072440, 789604860, 395168135, 437044686, 238589219, 266617869, 135103523.

## Nguồn
- [24hStore – Chính sách bảo hành sửa chữa](https://24hstore.vn/chinh-sach-bao-hanh-sua-chua-ct75)
- [Điện Thoại Vui – Chính sách bảo hành](https://dienthoaivui.com.vn/chinh-sach-bao-hanh)
- [Điện Thoại Vui – iPhone báo linh kiện không xác định](https://dienthoaivui.com.vn/tin-tuc/linh-kien-khong-xac-dinh)
- [Di Động Việt – Chính sách bảo hành ASUS](https://didongviet.vn/dchannel/chinh-sach-bao-hanh-asus/)
- [GIGABYTE/AORUS – Chính sách bảo hành laptop](https://www.aorus.com/vn/support/consumer/warranty/Laptop)
- [GearVN – Nâng cấp RAM có mất bảo hành không](https://gearvn.com/blogs/thu-thuat-giai-dap/nang-cap-ram-co-mat-bao-hanh-khong)
- [Thế Giới Di Động – Bảng giá sửa chữa](https://www.thegioididong.com/bang-gia-sua-chua)
- [Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15](https://binhphuoc.gov.vn/uploads/binhphuoc/news/2024_04/luat19_2023.pdf)
