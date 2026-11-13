package com.repairflow.inventory;

import static org.assertj.core.api.Assertions.assertThat;

import com.repairflow.config.DemoInventorySeeder;
import com.repairflow.inventory.entity.InventoryTransaction;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartCategory;
import com.repairflow.inventory.repository.InventoryTransactionRepository;
import com.repairflow.inventory.repository.PartCategoryRepository;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Kho linh kiện mẫu (chỉ profile dev): phủ đủ mọi nhóm, tồn kho khớp sổ kho, chạy lại không tạo trùng.
 * Bean chỉ tồn tại ở profile dev nên test dựng thủ công với repository thật.
 */
class DemoInventorySeederIT extends ApiTestSupport {

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private PartCategoryRepository categoryRepository;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private TransactionTemplate tx;

    @Test
    void seedsEveryCategoryWithStockMatchingLedgerAndIsIdempotent() {
        createUser(Role.ADMIN);
        DemoInventorySeeder seeder = new DemoInventorySeeder(partRepository, categoryRepository, transactionRepository, userRepository);

        Integer first = tx.execute(s -> seeder.seed());
        assertThat(first).isPositive();
        Integer second = tx.execute(s -> seeder.seed());
        assertThat(second).as("chạy lại không tạo trùng").isZero();

        tx.executeWithoutResult(s -> {
            List<Part> demo = partRepository.findAll().stream()
                    .filter(p -> p.getSku().startsWith(DemoInventorySeeder.SKU_PREFIX)).toList();
            Set<String> covered = demo.stream().map(p -> p.getCategory().getCode()).collect(Collectors.toSet());
            // 38 nhóm do migration V9 nạp sẵn (test khác có thể tạo thêm nhóm thử sau đó)
            Set<String> all = categoryRepository.findAll(Sort.by("id")).stream().limit(38)
                    .map(PartCategory::getCode).collect(Collectors.toSet());
            assertThat(all).hasSize(38);
            assertThat(covered).as("đủ mọi nhóm linh kiện").containsAll(all);

            List<InventoryTransaction> ledger = transactionRepository.findAll();
            for (Part p : demo) {
                assertThat(p.getQuantityOnHand()).isPositive();
                assertThat(p.getGrade()).isNotNull();
                assertThat(p.getSellingPrice()).isGreaterThan(p.getCostPrice());
                assertThat(p.getCategory().appliesTo(p.getDeviceType())).as(p.getSku()).isTrue();
                int sum = ledger.stream().filter(t -> t.getPart().getId().equals(p.getId()))
                        .mapToInt(InventoryTransaction::getQuantity).sum();
                assertThat(sum).as("tồn %s khớp sổ kho", p.getSku()).isEqualTo(p.getQuantityOnHand());
            }
        });
    }
}
