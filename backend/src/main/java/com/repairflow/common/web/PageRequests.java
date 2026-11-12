package com.repairflow.common.web;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Chỉ cho phép sắp xếp theo các field được khai báo. Nếu không kiểm tra, client có thể sort theo field bất kỳ
 * (VD passwordHash) hoặc gây lỗi 500 với field không tồn tại.
 */
public final class PageRequests {

    private PageRequests() {
    }

    public static Pageable withAllowedSort(Pageable pageable, Set<String> allowed, Sort defaultSort) {
        for (Sort.Order order : pageable.getSort()) {
            if (!allowed.contains(order.getProperty())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Không hỗ trợ sắp xếp theo '" + order.getProperty() + "'. Cho phép: " + allowed);
            }
        }
        if (pageable.getSort().isUnsorted()) {
            return org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                    defaultSort);
        }
        return pageable;
    }
}
