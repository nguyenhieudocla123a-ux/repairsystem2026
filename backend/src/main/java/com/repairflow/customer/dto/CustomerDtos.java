package com.repairflow.customer.dto;

import com.repairflow.common.validation.StrongPassword;
import com.repairflow.common.validation.VietnamesePhone;
import com.repairflow.customer.entity.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

/** DTO module khách hàng – docs/api-specification.md §4. */
public final class CustomerDtos {

    private CustomerDtos() {
    }

    public record CustomerRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(min = 2, max = 150, message = "Họ tên từ 2 đến 150 ký tự")
            String fullName,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @VietnamesePhone String phone,
            @Email(message = "Email không hợp lệ") @Size(max = 255) String email,
            @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự") String address,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String note) {
    }

    public record CustomerResponse(Long id, String code, String fullName, String phone, String email, String address,
                                   String note, boolean hasAccount, Instant createdAt) {

        public static CustomerResponse from(Customer c) {
            return new CustomerResponse(c.getId(), c.getCode(), c.getFullName(), c.getPhone(), c.getEmail(),
                    c.getAddress(), c.getNote(), c.getUser() != null, c.getCreatedAt());
        }
    }

    public record CustomerDetailResponse(Long id, String code, String fullName, String phone, String email,
                                         String address, String note, boolean hasAccount, Instant createdAt,
                                         long deviceCount, long repairOrderCount, BigDecimal totalSpent) {

        public static CustomerDetailResponse of(Customer c, long devices, long orders, BigDecimal spent) {
            return new CustomerDetailResponse(c.getId(), c.getCode(), c.getFullName(), c.getPhone(), c.getEmail(),
                    c.getAddress(), c.getNote(), c.getUser() != null, c.getCreatedAt(), devices, orders, spent);
        }
    }

    /** Thông tin khách rút gọn nhúng trong phiếu sửa chữa / thiết bị. */
    public record CustomerBrief(Long id, String code, String fullName, String phone, String email) {

        public static CustomerBrief from(Customer c) {
            return new CustomerBrief(c.getId(), c.getCode(), c.getFullName(), c.getPhone(), c.getEmail());
        }
    }

    /** Kích hoạt tài khoản cổng khách cho hồ sơ có sẵn (STAFF làm tại quầy, khách tự đổi mật khẩu sau). */
    public record ActivateAccountRequest(
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255) String email,
            @StrongPassword String password) {
    }
}
