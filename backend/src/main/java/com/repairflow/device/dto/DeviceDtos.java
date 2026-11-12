package com.repairflow.device.dto;

import com.repairflow.device.entity.Device;
import com.repairflow.device.entity.DeviceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** DTO module thiết bị – docs/api-specification.md §5. */
public final class DeviceDtos {

    private DeviceDtos() {
    }

    /** customerId bắt buộc với STAFF/ADMIN; bị bỏ qua ở API /me/devices (lấy từ người đăng nhập). */
    public record DeviceRequest(
            Long customerId,
            @NotBlank(message = "Vui lòng nhập tên thiết bị") @Size(max = 150, message = "Tên tối đa 150 ký tự") String name,
            @NotNull(message = "Vui lòng chọn loại thiết bị") DeviceType deviceType,
            @Size(max = 100, message = "Thương hiệu tối đa 100 ký tự") String brand,
            @Size(max = 100, message = "Model tối đa 100 ký tự") String model,
            @Size(max = 100, message = "Serial tối đa 100 ký tự")
            @Pattern(regexp = "^[A-Za-z0-9\\-_/ ]*$", message = "Serial chỉ gồm chữ, số và - _ /")
            String serialNumber,
            @Size(max = 50, message = "Màu tối đa 50 ký tự") String color,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String note) {
    }

    public record DeviceResponse(Long id, Long customerId, String customerName, String customerCode, String name,
                                 DeviceType deviceType, String brand, String model, String serialNumber, String color,
                                 String note, Instant createdAt) {

        public static DeviceResponse from(Device d) {
            return new DeviceResponse(d.getId(), d.getCustomer().getId(), d.getCustomer().getFullName(),
                    d.getCustomer().getCode(), d.getName(), d.getDeviceType(), d.getBrand(), d.getModel(),
                    d.getSerialNumber(), d.getColor(), d.getNote(), d.getCreatedAt());
        }
    }

    /** Thông tin thiết bị rút gọn nhúng trong phiếu / yêu cầu sửa chữa. */
    public record DeviceSummary(Long id, String name, DeviceType deviceType, String brand, String model,
                                String serialNumber) {

        public static DeviceSummary from(Device d) {
            return new DeviceSummary(d.getId(), d.getName(), d.getDeviceType(), d.getBrand(), d.getModel(),
                    d.getSerialNumber());
        }
    }
}
