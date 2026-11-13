package com.repairflow.config;

import com.repairflow.device.entity.DeviceType;
import com.repairflow.inventory.entity.InventoryTransaction;
import com.repairflow.inventory.entity.InventoryTransactionType;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.inventory.entity.PartGrade;
import com.repairflow.inventory.repository.InventoryTransactionRepository;
import com.repairflow.inventory.repository.PartCategoryRepository;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kho linh kiện MẪU – CHỈ ở profile dev (không bao giờ chạy ở production), để xem/thử giao diện khi kho thật còn trống.
 * <ul>
 *   <li>Phủ đủ 38 nhóm linh kiện; SKU bắt đầu bằng {@code DEMO-} để phân biệt với hàng thật.</li>
 *   <li>Giá là giá THAM KHẢO thị trường VN, chỉ dùng cho demo.</li>
 *   <li>Mỗi linh kiện có đúng một dòng sổ kho "Tồn đầu kỳ" → tồn kho luôn khớp sổ kho như hàng nhập thật.</li>
 *   <li>Chạy lại an toàn: SKU đã tồn tại thì bỏ qua. Tắt bằng {@code DEMO_INVENTORY=false}.</li>
 * </ul>
 */
@Slf4j
@Component
@Profile("dev")
@Order(20) // sau DemoDataSeeder (cần tài khoản ADMIN làm người nhập kho)
@RequiredArgsConstructor
public class DemoInventorySeeder implements ApplicationRunner {

    public static final String SKU_PREFIX = "DEMO-";
    static final String NOTE = "Tồn đầu kỳ – dữ liệu mẫu (chỉ môi trường dev)";
    static final String SUPPLIER = "Dữ liệu mẫu";

    /** Linh kiện mẫu: giá tính theo nghìn đồng cho gọn. */
    record DemoPart(String sku, String name, String category, DeviceType device, PartGrade grade, String brand,
                    String models, long costK, long priceK, int quantity, int minStock, String unit) {

        DemoPart(String sku, String name, String category, DeviceType device, PartGrade grade, String brand,
                 String models, long costK, long priceK, int quantity, int minStock) {
            this(sku, name, category, device, grade, brand, models, costK, priceK, quantity, minStock, "cái");
        }
    }

    private static final DeviceType PHONE = DeviceType.PHONE;
    private static final DeviceType TABLET = DeviceType.TABLET;
    private static final DeviceType LAPTOP = DeviceType.LAPTOP;
    private static final DeviceType DESKTOP = DeviceType.DESKTOP;
    private static final DeviceType WATCH = DeviceType.SMARTWATCH;
    private static final PartGrade OEM = PartGrade.OEM;
    private static final PartGrade USED = PartGrade.ORIGINAL_USED;
    private static final PartGrade AFTER = PartGrade.AFTERMARKET;
    private static final PartGrade GENERIC = PartGrade.GENERIC;

    static final List<DemoPart> PARTS = List.of(
            // ---------------- Điện thoại
            new DemoPart("DEMO-LCD-IP13", "Màn hình iPhone 13 (OLED)", "SCREEN", PHONE, AFTER, "GENA", "iPhone 13", 1650, 2490, 6, 2),
            new DemoPart("DEMO-LCD-IP11", "Màn hình iPhone 11 (LCD)", "SCREEN", PHONE, AFTER, "GENA", "iPhone 11", 750, 1190, 8, 2),
            new DemoPart("DEMO-LCD-SSA54", "Màn hình Samsung Galaxy A54", "SCREEN", PHONE, OEM, "Samsung", "Galaxy A54 5G", 1900, 2790, 3, 1),
            new DemoPart("DEMO-GLS-IP14PM", "Mặt kính iPhone 14 Pro Max (ép kính)", "GLASS", PHONE, GENERIC, null, "iPhone 14 Pro Max", 120, 450, 15, 5),
            new DemoPart("DEMO-TCH-OPA57", "Cảm ứng OPPO A57", "TOUCH", PHONE, AFTER, null, "OPPO A57", 180, 390, 5, 2),
            new DemoPart("DEMO-BAT-IP11", "Pin iPhone 11 Pisen", "BATTERY", PHONE, AFTER, "Pisen", "iPhone 11", 380, 690, 12, 3),
            new DemoPart("DEMO-BAT-IP13", "Pin iPhone 13 Pisen", "BATTERY", PHONE, AFTER, "Pisen", "iPhone 13", 480, 890, 10, 3),
            new DemoPart("DEMO-BAT-SSA52", "Pin Samsung Galaxy A52 Deji", "BATTERY", PHONE, AFTER, "Deji", "Galaxy A52", 260, 550, 6, 2),
            new DemoPart("DEMO-CHG-IP12", "Cụm chân sạc iPhone 12", "CHARGE_PORT", PHONE, USED, "Apple", "iPhone 12", 220, 490, 7, 2),
            new DemoPart("DEMO-CHG-RN11", "Chân sạc Type-C Redmi Note 11", "CHARGE_PORT", PHONE, GENERIC, null, "Redmi Note 11", 60, 250, 20, 5),
            new DemoPart("DEMO-CAM-IP12R", "Camera sau iPhone 12", "CAMERA_REAR", PHONE, USED, "Apple", "iPhone 12", 650, 1190, 3, 1),
            new DemoPart("DEMO-CAM-IP12F", "Camera trước iPhone 12", "CAMERA_FRONT", PHONE, USED, "Apple", "iPhone 12", 350, 690, 4, 1),
            new DemoPart("DEMO-CGL-IP13", "Kính camera sau iPhone 13", "CAMERA_GLASS", PHONE, GENERIC, null, "iPhone 13, 13 mini", 30, 150, 25, 5),
            new DemoPart("DEMO-SPK-IP11", "Loa ngoài iPhone 11", "SPEAKER", PHONE, USED, "Apple", "iPhone 11", 120, 290, 6, 2),
            new DemoPart("DEMO-EAR-IP12", "Loa trong iPhone 12", "EARPIECE", PHONE, USED, "Apple", "iPhone 12, 12 Pro", 150, 350, 5, 2),
            new DemoPart("DEMO-MIC-SSA32", "Mic Samsung Galaxy A32", "MICROPHONE", PHONE, GENERIC, null, "Galaxy A32", 40, 180, 10, 3),
            new DemoPart("DEMO-VIB-IPX", "Rung Taptic iPhone X", "VIBRATOR", PHONE, USED, "Apple", "iPhone X", 150, 350, 4, 1),
            new DemoPart("DEMO-BTN-IP11", "Cáp nút nguồn iPhone 11", "BUTTON", PHONE, AFTER, null, "iPhone 11", 90, 250, 8, 2),
            new DemoPart("DEMO-FID-IPX", "Cụm Face ID iPhone X", "BIOMETRIC", PHONE, USED, "Apple", "iPhone X", 600, 1500, 2, 1),
            new DemoPart("DEMO-BGL-IP13", "Kính lưng iPhone 13", "BACK_GLASS", PHONE, AFTER, null, "iPhone 13", 150, 550, 9, 3),
            new DemoPart("DEMO-HSG-IP11", "Vỏ iPhone 11 (khung + lưng)", "HOUSING", PHONE, AFTER, null, "iPhone 11", 450, 990, 3, 1),
            new DemoPart("DEMO-SIM-IP12", "Khay SIM iPhone 12", "SIM_TRAY", PHONE, GENERIC, null, "iPhone 12", 20, 80, 30, 5),
            new DemoPart("DEMO-ANT-IP11", "Cáp sóng iPhone 11", "ANTENNA", PHONE, USED, "Apple", "iPhone 11", 80, 250, 5, 2),
            new DemoPart("DEMO-FLX-SSA51", "Cáp nối màn hình Samsung Galaxy A51", "FLEX", PHONE, GENERIC, null, "Galaxy A51", 60, 200, 8, 2),
            new DemoPart("DEMO-IC-1610A3", "IC sạc 1610A3 (iPhone)", "IC", PHONE, GENERIC, null, "iPhone 8 – X", 45, 350, 10, 3),
            new DemoPart("DEMO-MB-IP11", "Mainboard iPhone 11 64GB", "MAINBOARD", PHONE, USED, "Apple", "iPhone 11", 2200, 3500, 1, 1),
            // ---------------- Máy tính bảng
            new DemoPart("DEMO-LCD-IPAD9", "Màn hình iPad Gen 9", "SCREEN", TABLET, AFTER, null, "iPad 10.2\" Gen 9", 1100, 1890, 3, 1),
            new DemoPart("DEMO-TCH-IPAD9", "Cảm ứng iPad Gen 9", "TOUCH", TABLET, AFTER, null, "iPad 10.2\" Gen 9", 320, 650, 4, 1),
            new DemoPart("DEMO-BAT-IPAD9", "Pin iPad Gen 9", "BATTERY", TABLET, AFTER, "Pisen", "iPad 10.2\" Gen 7/8/9", 450, 890, 3, 1),
            // ---------------- Laptop
            new DemoPart("DEMO-LCD-156FHD", "Màn hình laptop 15.6\" FHD IPS 30 pin", "SCREEN", LAPTOP, AFTER, "BOE", "Dell, Asus, Acer, Lenovo 15.6\"", 1350, 1990, 4, 1),
            new DemoPart("DEMO-CBL-DELL3511", "Cáp màn hình Dell Inspiron 15 3511", "SCREEN_CABLE", LAPTOP, GENERIC, null, "Inspiron 15 3511, 3515", 120, 350, 5, 2),
            new DemoPart("DEMO-HNG-ASVB15", "Bản lề Asus VivoBook 15", "HINGE", LAPTOP, GENERIC, null, "VivoBook 15 X515", 150, 400, 4, 1),
            new DemoPart("DEMO-KB-DELL15", "Bàn phím Dell Inspiron 15 3000", "KEYBOARD", LAPTOP, AFTER, null, "Inspiron 15 3000 series", 250, 550, 6, 2),
            new DemoPart("DEMO-TP-HP15", "Touchpad HP Pavilion 15", "TOUCHPAD", LAPTOP, USED, "HP", "Pavilion 15", 280, 650, 2, 1),
            new DemoPart("DEMO-BAT-DELL3511", "Pin Dell Inspiron 3511 (3 cell)", "BATTERY", LAPTOP, AFTER, null, "Inspiron 15 3511, 3520", 650, 1190, 4, 1),
            new DemoPart("DEMO-ADP-65WC", "Sạc laptop 65W USB-C", "ADAPTER", LAPTOP, AFTER, null, "Laptop sạc USB-C PD", 280, 550, 8, 2),
            new DemoPart("DEMO-DC-ASUS", "Jack nguồn DC laptop Asus", "CHARGE_PORT", LAPTOP, GENERIC, null, "Asus X441, X540", 40, 250, 10, 3),
            new DemoPart("DEMO-RAM-8G3200", "RAM laptop DDR4 8GB 3200MHz Kingston", "RAM", LAPTOP, OEM, "Kingston", "Laptop DDR4 SO-DIMM", 420, 650, 10, 3),
            new DemoPart("DEMO-RAM-16G3200", "RAM laptop DDR4 16GB 3200MHz Kingston", "RAM", LAPTOP, OEM, "Kingston", "Laptop DDR4 SO-DIMM", 850, 1250, 5, 2),
            new DemoPart("DEMO-SSD-512NV2", "SSD NVMe M.2 512GB Kingston NV2", "STORAGE", LAPTOP, OEM, "Kingston", "Khe M.2 2280 NVMe", 850, 1190, 6, 2),
            new DemoPart("DEMO-FAN-LENIP3", "Quạt tản nhiệt Lenovo IdeaPad 3", "FAN", LAPTOP, AFTER, null, "IdeaPad 3 15IIL05", 150, 390, 5, 2),
            new DemoPart("DEMO-WIFI-AX200", "Card Wi-Fi Intel AX200", "WIFI", LAPTOP, OEM, "Intel", "Khe M.2 2230", 250, 450, 4, 1),
            new DemoPart("DEMO-WEB-HP15", "Webcam laptop HP 15", "WEBCAM", LAPTOP, USED, "HP", "HP 15-dw", 120, 350, 3, 1),
            new DemoPart("DEMO-USB-ACA5", "Bo mạch cổng USB Acer Aspire 5", "PORT", LAPTOP, USED, "Acer", "Aspire 5 A515", 150, 400, 3, 1),
            new DemoPart("DEMO-SPK-DELL15", "Loa laptop Dell Inspiron 15", "SPEAKER", LAPTOP, USED, "Dell", "Inspiron 15 3000 series", 120, 300, 3, 1),
            // ---------------- Máy tính bàn
            new DemoPart("DEMO-CPU-I512400F", "CPU Intel Core i5-12400F", "CPU", DESKTOP, OEM, "Intel", "Socket LGA1700", 2700, 3190, 3, 1),
            new DemoPart("DEMO-VGA-GTX1650", "Card đồ hoạ GTX 1650 4GB", "VGA", DESKTOP, OEM, null, "Khe PCIe x16", 3100, 3690, 2, 1),
            new DemoPart("DEMO-PSU-550W", "Nguồn 550W 80 Plus Bronze", "PSU", DESKTOP, OEM, null, "ATX", 750, 990, 4, 1),
            new DemoPart("DEMO-CASE-ATX", "Vỏ case ATX mid tower", "CASE", DESKTOP, GENERIC, null, "Mainboard ATX / mATX", 450, 690, 3, 1),
            new DemoPart("DEMO-MB-H610M", "Mainboard H610M DDR4", "MAINBOARD", DESKTOP, OEM, null, "Socket LGA1700", 1650, 1990, 2, 1),
            // ---------------- Đồng hồ thông minh
            new DemoPart("DEMO-LCD-AW6", "Màn hình Apple Watch S6 44mm", "SCREEN", WATCH, AFTER, null, "Apple Watch Series 6 44mm", 1800, 2690, 2, 1),
            new DemoPart("DEMO-BAT-AW6", "Pin Apple Watch S6 44mm", "BATTERY", WATCH, AFTER, null, "Apple Watch Series 6 44mm", 300, 650, 3, 1),
            new DemoPart("DEMO-GLS-AW6", "Mặt kính Apple Watch S6 44mm", "GLASS", WATCH, GENERIC, null, "Apple Watch Series 6 44mm", 150, 450, 4, 1),
            new DemoPart("DEMO-BTN-AWCROWN", "Núm xoay Digital Crown Apple Watch", "BUTTON", WATCH, USED, "Apple", "Apple Watch Series 4 – 6", 250, 590, 2, 1),
            new DemoPart("DEMO-HSG-AW6", "Vỏ nhôm Apple Watch S6 44mm", "HOUSING", WATCH, AFTER, null, "Apple Watch Series 6 44mm", 450, 890, 2, 1),
            new DemoPart("DEMO-SNS-AW6", "Cảm biến nhịp tim Apple Watch S6", "SENSOR", WATCH, USED, "Apple", "Apple Watch Series 6", 350, 790, 2, 1),
            // ---------------- Vật tư khác
            new DemoPart("DEMO-OTH-SCREWIP", "Bộ ốc vít iPhone (đủ dòng)", "OTHER", PHONE, GENERIC, null, "iPhone 7 – 14", 20, 50, 50, 10, "bộ"),
            new DemoPart("DEMO-OTH-B7000", "Keo dán B7000 15ml", "OTHER", null, GENERIC, null, null, 25, 50, 20, 5, "tuýp"));

    private final PartRepository partRepository;
    private final PartCategoryRepository categoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final UserRepository userRepository;

    @Value("${app.demo.inventory:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("DEMO_INVENTORY=false → bỏ qua kho linh kiện mẫu");
            return;
        }
        seed();
    }

    /** Tạo các linh kiện mẫu còn thiếu; trả về số linh kiện vừa tạo. */
    @Transactional
    public int seed() {
        User admin = userRepository.findAll().stream().filter(u -> u.getRole() == Role.ADMIN).findFirst().orElse(null);
        if (admin == null) {
            log.info("Chưa có tài khoản ADMIN → bỏ qua kho linh kiện mẫu");
            return 0;
        }
        Map<String, PartCategory> byCode = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(PartCategory::getCode, Function.identity()));
        int created = 0;
        for (DemoPart d : PARTS) {
            if (partRepository.existsBySkuIgnoreCase(d.sku())) {
                continue;
            }
            PartCategory category = byCode.get(d.category());
            if (category == null) {
                log.warn("Thiếu nhóm {} → bỏ qua {}", d.category(), d.sku());
                continue;
            }
            Part part = new Part(d.sku(), d.name());
            part.setCategory(category);
            part.setDeviceType(d.device());
            part.setGrade(d.grade());
            part.setBrand(d.brand());
            part.setCompatibleModels(d.models());
            part.setUnit(d.unit());
            part.setCostPrice(BigDecimal.valueOf(d.costK() * 1000));
            part.setSellingPrice(BigDecimal.valueOf(d.priceK() * 1000));
            part.setMinStockLevel(d.minStock());
            part.increaseStock(d.quantity());
            partRepository.save(part);

            InventoryTransaction tx = new InventoryTransaction(part, InventoryTransactionType.IMPORT, d.quantity(), admin);
            tx.setUnitCost(part.getCostPrice());
            tx.setSupplierName(SUPPLIER);
            tx.setNote(NOTE);
            transactionRepository.save(tx);
            created++;
        }
        if (created > 0) {
            log.info("Đã tạo {} linh kiện mẫu (SKU {}*) kèm sổ kho tồn đầu kỳ", created, SKU_PREFIX);
        }
        return created;
    }
}
