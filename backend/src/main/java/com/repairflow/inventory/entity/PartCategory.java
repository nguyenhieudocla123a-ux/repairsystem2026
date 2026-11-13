package com.repairflow.inventory.entity;

import com.repairflow.common.audit.BaseEntity;
import com.repairflow.device.entity.DeviceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Nhóm linh kiện chuẩn (màn hình, pin, RAM…): loại thiết bị áp dụng + bảo hành mặc định + phạm vi / điều kiện từ chối.
 * Danh mục nạp sẵn ở V9 theo mức phổ biến của thị trường; cửa hàng (ADMIN) tự chỉnh số tháng theo chính sách riêng.
 */
@Entity
@Table(name = "part_categories")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PartCategory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    /** Lưu dạng "PHONE,TABLET" – danh sách ngắn, cố định, không cần bảng nối. */
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Column(name = "device_types", nullable = false)
    private String deviceTypes;

    @Column(name = "default_warranty_months", nullable = false)
    private int defaultWarrantyMonths;

    @Column(name = "warranty_scope", columnDefinition = "text")
    private String warrantyScope;

    @Column(columnDefinition = "text")
    private String exclusions;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    private Long version;

    public PartCategory(String code, String name, Collection<DeviceType> deviceTypes, int defaultWarrantyMonths) {
        this.code = code;
        this.name = name;
        setDeviceTypes(deviceTypes);
        this.defaultWarrantyMonths = defaultWarrantyMonths;
    }

    public Set<DeviceType> getDeviceTypes() {
        if (deviceTypes == null || deviceTypes.isBlank()) {
            return EnumSet.noneOf(DeviceType.class);
        }
        return Arrays.stream(deviceTypes.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(DeviceType::valueOf).collect(Collectors.toCollection(() -> EnumSet.noneOf(DeviceType.class)));
    }

    public void setDeviceTypes(Collection<DeviceType> types) {
        this.deviceTypes = EnumSet.copyOf(types).stream().map(Enum::name).collect(Collectors.joining(","));
    }

    public boolean appliesTo(DeviceType type) {
        return type == null || getDeviceTypes().contains(type);
    }
}
