package com.repairflow.repair;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Luồng nghiệp vụ Mốc 5 qua HTTP thật: khách hàng → thiết bị → phiếu → phân công → chuyển trạng thái. */
class RepairFlowIT extends ApiTestSupport {

    private String staff;
    private String tech;
    private User techUser;
    private String otherTech;

    @BeforeEach
    void setUp() {
        staff = tokenOf(createUser(Role.STAFF));
        techUser = createUser(Role.TECHNICIAN);
        tech = tokenOf(techUser);
        otherTech = tokenOf(createUser(Role.TECHNICIAN));
    }

    private long createCustomer(String phone) {
        ResponseEntity<JsonNode> res = post("/customers", Map.of("fullName", "Nguyễn Văn A", "phone", phone), staff);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(res.getBody().get("code").asText()).matches("CUS-\\d{6}");
        return res.getBody().get("id").asLong();
    }

    private long createDevice(long customerId, String token) {
        Map<String, Object> body = new HashMap<>(Map.of("name", "iPhone 13", "deviceType", "PHONE", "brand", "Apple",
                "serialNumber", unique("sn")));
        body.put("customerId", customerId);
        ResponseEntity<JsonNode> res = post("/devices", body, token);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return res.getBody().get("id").asLong();
    }

    private JsonNode createOrder(long customerId, long deviceId, Long technicianId) {
        Map<String, Object> body = new HashMap<>(Map.of("customerId", customerId, "deviceId", deviceId,
                "reportedIssue", "Màn hình sọc", "deviceCondition", "Trầy góc phải"));
        if (technicianId != null) {
            body.put("technicianId", technicianId);
        }
        ResponseEntity<JsonNode> res = post("/repair-orders", body, staff);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return res.getBody();
    }

    private ResponseEntity<JsonNode> transition(JsonNode order, String to, String note, String token) {
        Map<String, Object> body = new HashMap<>(Map.of("toStatus", to, "version", order.get("version").asLong()));
        if (note != null) {
            body.put("note", note);
        }
        return post("/repair-orders/" + order.get("id").asLong() + "/transitions", body, token);
    }

    @Nested
    class Customers {

        @Test
        void duplicatePhoneIsRejected() {
            String phone = uniquePhone();
            createCustomer(phone);
            ResponseEntity<JsonNode> res = post("/customers", Map.of("fullName", "Người khác", "phone", phone), staff);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void searchFindsByPhoneAndCustomerWithOrdersCannotBeDeleted() {
            String phone = uniquePhone();
            long customerId = createCustomer(phone);
            createOrder(customerId, createDevice(customerId, staff), null);

            JsonNode page = get("/customers?q=" + phone, staff).getBody();
            assertThat(page.get("totalElements").asLong()).isEqualTo(1);

            JsonNode detail = get("/customers/" + customerId, staff).getBody();
            assertThat(detail.get("deviceCount").asLong()).isEqualTo(1);
            assertThat(detail.get("repairOrderCount").asLong()).isEqualTo(1);

            assertThat(call(HttpMethod.DELETE, "/customers/" + customerId, null, staff).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void serialNumberIsUniqueIgnoringCase() {
            long customerId = createCustomer(uniquePhone());
            String serial = unique("imei");
            Map<String, Object> body = new HashMap<>(Map.of("name", "A", "deviceType", "PHONE", "serialNumber", serial));
            body.put("customerId", customerId);
            assertThat(post("/devices", body, staff).getStatusCode()).isEqualTo(HttpStatus.CREATED);

            body.put("serialNumber", serial.toUpperCase());
            assertThat(post("/devices", body, staff).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void technicianCannotManageCustomers() {
            assertThat(get("/customers", tech).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Nested
    class Workflow {

        @Test
        void happyPathWithHistoryAndAllowedTransitions() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());
            long id = order.get("id").asLong();
            assertThat(order.get("code").asText()).matches("RO-\\d{4}-\\d{6}");
            assertThat(order.get("status").asText()).isEqualTo("RECEIVED");

            // KTV xem phiếu: được phép INSPECTING; STAFF chỉ thấy nút hủy
            JsonNode techView = get("/repair-orders/" + id, tech).getBody();
            assertThat(techView.get("allowedTransitions").toString()).isEqualTo("[\"INSPECTING\"]");
            assertThat(get("/repair-orders/" + id, staff).getBody().get("allowedTransitions").toString())
                    .isEqualTo("[\"CANCELLED\"]");

            ResponseEntity<JsonNode> inspecting = transition(techView, "INSPECTING", "Bắt đầu kiểm tra", tech);
            assertThat(inspecting.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(inspecting.getBody().get("status").asText()).isEqualTo("INSPECTING");

            ResponseEntity<JsonNode> diag = call(HttpMethod.PATCH, "/repair-orders/" + id + "/diagnosis",
                    Map.of("diagnosis", "Hỏng màn OLED", "solution", "Thay màn hình"), tech);
            assertThat(diag.getBody().get("diagnosis").asText()).isEqualTo("Hỏng màn OLED");

            JsonNode history = get("/repair-orders/" + id + "/history", staff).getBody();
            assertThat(history).hasSize(2);
            assertThat(history.get(0).get("toStatus").asText()).isEqualTo("RECEIVED");
            assertThat(history.get(1).get("fromStatus").asText()).isEqualTo("RECEIVED");
            assertThat(history.get(1).get("note").asText()).isEqualTo("Bắt đầu kiểm tra");
        }

        @Test
        void invalidTransitionIsRejectedWith409() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());

            ResponseEntity<JsonNode> res = transition(order, "COMPLETED", null, tech);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(res.getBody().get("code").asText()).isEqualTo("INVALID_STATUS_TRANSITION");
        }

        @Test
        void quotationStatusCannotBeForcedManually() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());
            JsonNode inspecting = transition(order, "INSPECTING", null, tech).getBody();

            ResponseEntity<JsonNode> res = transition(inspecting, "WAITING_CONFIRMATION", null, staff);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void staleVersionIsRejected() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());
            transition(order, "INSPECTING", null, tech); // version tăng

            ResponseEntity<JsonNode> stale = transition(order, "CANCELLED", "Khách đổi ý", staff); // dùng version cũ

            assertThat(stale.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(stale.getBody().get("code").asText()).isEqualTo("CONCURRENT_MODIFICATION");
        }

        @Test
        void cancelNeedsReasonAndClosesOrder() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), null);

            assertThat(transition(order, "CANCELLED", null, staff).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            JsonNode cancelled = transition(order, "CANCELLED", "Khách không sửa nữa", staff).getBody();

            assertThat(cancelled.get("status").asText()).isEqualTo("CANCELLED");
            assertThat(cancelled.get("cancelReason").asText()).isEqualTo("Khách không sửa nữa");
            assertThat(cancelled.get("allowedTransitions")).isEmpty();
            assertThat(cancelled.get("canEditReception").asBoolean()).isFalse();
        }

        @Test
        void inspectingWithoutTechnicianFailsUntilAssigned() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), null);
            long id = order.get("id").asLong();

            JsonNode assigned = call(HttpMethod.PATCH, "/repair-orders/" + id + "/assign",
                    Map.of("technicianId", techUser.getId()), staff).getBody();
            assertThat(assigned.get("technician").get("id").asLong()).isEqualTo(techUser.getId());

            assertThat(transition(assigned, "INSPECTING", null, tech).getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        void cannotAssignNonTechnician() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), null);
            User staffUser = createUser(Role.STAFF);

            ResponseEntity<JsonNode> res = call(HttpMethod.PATCH, "/repair-orders/" + order.get("id").asLong() + "/assign",
                    Map.of("technicianId", staffUser.getId()), staff);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    class ResourceAccess {

        @Test
        void technicianSeesOnlyAssignedOrders() {
            long customerId = createCustomer(uniquePhone());
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());
            long id = order.get("id").asLong();

            assertThat(get("/repair-orders/" + id, otherTech).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            // Đổi tham số technicianId cũng không xem được phiếu người khác
            JsonNode page = get("/repair-orders?technicianId=" + techUser.getId(), otherTech).getBody();
            assertThat(page.get("content").findValuesAsText("id")).doesNotContain(String.valueOf(id));
            assertThat(transition(order, "INSPECTING", null, otherTech).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        void customerSeesOwnOrdersOnly() {
            String customerA = registerCustomer();
            String customerB = registerCustomer();
            long customerAId = get("/auth/me", customerA).getBody().get("customerId").asLong();
            JsonNode order = createOrder(customerAId, createDevice(customerAId, staff), null);
            long id = order.get("id").asLong();

            assertThat(get("/repair-orders/" + id, customerA).getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode history = get("/repair-orders/" + id + "/history", customerA).getBody();
            assertThat(history.get(0).get("changedByName").isNull()).isTrue(); // không lộ tên nhân viên cho khách
            assertThat(history.get(0).get("changedByRole").asText()).isEqualTo("STAFF");
            assertThat(get("/repair-orders/" + id + "/history", staff).getBody().get(0).get("changedByName").asText()).isNotBlank();
            assertThat(get("/me/repair-orders", customerA).getBody().get("totalElements").asLong()).isEqualTo(1);
            assertThat(get("/repair-orders/" + id, customerB).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(get("/me/repair-orders", customerB).getBody().get("totalElements").asLong()).isZero();
            assertThat(get("/repair-orders", customerA).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }

        @Test
        void customerCanCancelOnlyWhileReceived() {
            String customer = registerCustomer();
            long customerId = get("/auth/me", customer).getBody().get("customerId").asLong();
            JsonNode order = createOrder(customerId, createDevice(customerId, staff), techUser.getId());
            long id = order.get("id").asLong();
            transition(order, "INSPECTING", null, tech);

            ResponseEntity<JsonNode> res = post("/me/repair-orders/" + id + "/cancel", Map.of("reason", "Đổi ý"), customer);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Nested
    class OnlineRequests {

        @Test
        void customerRequestConvertedByStaff() {
            String customer = registerCustomer();
            JsonNode device = post("/me/devices", Map.of("name", "Laptop của tôi", "deviceType", "LAPTOP"), customer).getBody();

            ResponseEntity<JsonNode> created = post("/me/repair-requests",
                    Map.of("deviceId", device.get("id").asLong(), "issueDescription", "Không lên nguồn"), customer);
            assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            long requestId = created.getBody().get("id").asLong();
            assertThat(created.getBody().get("status").asText()).isEqualTo("PENDING");

            ResponseEntity<JsonNode> converted = post("/repair-requests/" + requestId + "/convert",
                    Map.of("reportedIssue", "Không lên nguồn", "accessories", "Sạc", "technicianId", techUser.getId()), staff);
            assertThat(converted.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(converted.getBody().get("repairRequestId").asLong()).isEqualTo(requestId);

            JsonNode mine = get("/me/repair-requests", customer).getBody().get("content").get(0);
            assertThat(mine.get("status").asText()).isEqualTo("CONVERTED");
            assertThat(mine.get("repairOrderCode").asText()).isEqualTo(converted.getBody().get("code").asText());

            // Không xử lý lại được yêu cầu đã chuyển
            assertThat(post("/repair-requests/" + requestId + "/reject", Map.of("reason", "x"), staff).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void customerCannotRequestRepairForSomeoneElsesDevice() {
            String owner = registerCustomer();
            String intruder = registerCustomer();
            long deviceId = post("/me/devices", Map.of("name", "Máy A", "deviceType", "PHONE"), owner).getBody().get("id").asLong();

            ResponseEntity<JsonNode> res = post("/me/repair-requests",
                    Map.of("deviceId", deviceId, "issueDescription", "Lừa đảo"), intruder);

            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }
    }
}
