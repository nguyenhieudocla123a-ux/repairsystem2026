package com.repairflow.domain;

import com.repairflow.customer.entity.Customer;
import com.repairflow.device.entity.Device;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import com.repairflow.warranty.entity.Warranty;
import java.time.LocalDate;

/** Dựng object mẫu cho unit test (không cần DB). */
final class TestWarranties {

    private TestWarranties() {
    }

    static Warranty activeFrom(LocalDate start, int months) {
        User staff = new User("staff@test.local", "hash", "Staff", null, Role.STAFF);
        Customer customer = new Customer("CUS-000001", "Khách", "0900000000");
        Device device = new Device(customer, "iPhone", DeviceType.PHONE);
        RepairOrder order = new RepairOrder("RO-2026-000001", customer, device, staff, "Hỏng màn hình");
        return new Warranty("WR-2026-000001", order, start, months, staff);
    }
}
