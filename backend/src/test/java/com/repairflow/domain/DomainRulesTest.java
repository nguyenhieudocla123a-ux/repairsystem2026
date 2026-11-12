package com.repairflow.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.inventory.entity.Part;
import java.time.LocalDate;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** Unit test thuần (không Spring, không DB) cho các quy tắc nằm trong entity. */
class DomainRulesTest {

    @Nested
    class PartStock {

        @Test
        void decreaseWithinStock() {
            Part part = new Part("LCD-IP13", "Màn hình");
            part.increaseStock(3);

            part.decreaseStock(2);

            assertThat(part.getQuantityOnHand()).isEqualTo(1);
        }

        @Test
        void cannotExportMoreThanOnHand() {
            Part part = new Part("LCD-IP13", "Màn hình");
            part.increaseStock(1);

            assertThatThrownBy(() -> part.decreaseStock(2))
                    .isInstanceOf(BusinessException.class)
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.INSUFFICIENT_STOCK);
            assertThat(part.getQuantityOnHand()).isEqualTo(1);
        }

        @Test
        void quantityMustBePositive() {
            Part part = new Part("X", "X");
            assertThatThrownBy(() -> part.increaseStock(0)).isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> part.decreaseStock(-1)).isInstanceOf(BusinessException.class);
        }

        @Test
        void lowStockWhenAtOrBelowMinimum() {
            Part part = new Part("X", "X");
            part.setMinStockLevel(2);
            part.increaseStock(2);
            assertThat(part.isLowStock()).isTrue();

            part.increaseStock(1);
            assertThat(part.isLowStock()).isFalse();
        }
    }

    @Nested
    class WarrantyValidity {

        @Test
        void validUntilEndDateInclusive() {
            var warranty = TestWarranties.activeFrom(LocalDate.of(2026, 1, 31), 1);

            // 31/01 + 1 tháng = 28/02 (Java tự điều chỉnh ngày cuối tháng)
            assertThat(warranty.getEndDate()).isEqualTo(LocalDate.of(2026, 2, 28));
            assertThat(warranty.isValidOn(LocalDate.of(2026, 2, 28))).isTrue();
            assertThat(warranty.isValidOn(LocalDate.of(2026, 3, 1))).isFalse();
        }
    }
}
