package com.repairflow.customer.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.customer.entity.Customer;
import com.repairflow.customer.repository.CustomerRepository;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Tìm hồ sơ khách hàng gắn với tài khoản CUSTOMER đang đăng nhập (dùng cho các API /me/*). */
@Component
@RequiredArgsConstructor
public class CurrentCustomerResolver {

    private final CustomerRepository customerRepository;

    public Customer require(AuthenticatedUser user) {
        if (user.role() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Chức năng chỉ dành cho khách hàng");
        }
        return customerRepository.findByUserId(user.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Tài khoản chưa có hồ sơ khách hàng"));
    }

    /** Khách hàng có phải chủ của hồ sơ này không. */
    public static boolean owns(AuthenticatedUser user, Customer customer) {
        return user.role() == Role.CUSTOMER && customer.getUser() != null && customer.getUser().getId().equals(user.id());
    }
}
