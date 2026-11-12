package com.repairflow.quotation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Mốc 6 qua HTTP thật: báo giá → khách duyệt → xuất kho → sửa xong → bàn giao + bảo hành; tồn kho đồng thời. */
class QuotationInventoryIT extends ApiTestSupport {

    private String admin;
    private String staff;
    private String tech;
    private User techUser;
    private String customer;
    private long customerId;

    @BeforeEach
    void setUp() {
        admin = tokenOf(createUser(Role.ADMIN));
        staff = tokenOf(createUser(Role.STAFF));
        techUser = createUser(Role.TECHNICIAN);
        tech = tokenOf(techUser);
        customer = registerCustomer();
        customerId = get("/auth/me", customer).getBody().get("customerId").asLong();
    }

    // ---------- helpers ----------

    private long createPart(int stock, int minStock, long sellingPrice) {
        Map<String, Object> body = Map.of("sku", unique("LCD").toUpperCase(), "name", "Màn hình OLED", "unit", "cái",
                "costPrice", 1_800_000, "sellingPrice", sellingPrice, "minStockLevel", minStock);
        long id = post("/parts", body, staff).getBody().get("id").asLong();
        if (stock > 0) {
            assertThat(post("/parts/" + id + "/import", Map.of("quantity", stock, "supplierName", "NCC A"), staff)
                    .getStatusCode()).isEqualTo(HttpStatus.OK);
        }
        return id;
    }

    /** Phiếu của khách test, đã giao KTV và đang kiểm tra. */
    private JsonNode inspectingOrder() {
        Map<String, Object> deviceBody = new HashMap<>(Map.of("name", "iPhone", "deviceType", "PHONE"));
        deviceBody.put("customerId", customerId);
        long deviceId = post("/devices", deviceBody, staff).getBody().get("id").asLong();
        JsonNode order = post("/repair-orders", Map.of("customerId", customerId, "deviceId", deviceId,
                "reportedIssue", "Sọc màn", "technicianId", techUser.getId()), staff).getBody();
        return transition(order, "INSPECTING", tech).getBody();
    }

    private ResponseEntity<JsonNode> transition(JsonNode order, String to, String token) {
        return post("/repair-orders/" + order.get("id").asLong() + "/transitions",
                Map.of("toStatus", to, "version", order.get("version").asLong(), "note", "test"), token);
    }

    private JsonNode order(long id, String token) {
        return get("/repair-orders/" + id, token).getBody();
    }

    private Map<String, Object> quotationBody(long partId, long discount) {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> part = new HashMap<>(Map.of("itemType", "PART", "quantity", 1));
        part.put("partId", partId); // không gửi unitPrice → lấy giá bán hiện tại
        items.add(part);
        items.add(Map.of("itemType", "LABOR", "description", "Công thay màn hình", "quantity", 1, "unitPrice", 300_000));
        return Map.of("items", items, "discount", discount, "note", "Bảo hành 3 tháng");
    }

    /** Phiếu đã được khách duyệt báo giá (APPROVED). */
    private long approvedOrder(long partId) {
        JsonNode order = inspectingOrder();
        long orderId = order.get("id").asLong();
        long qid = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 0), staff).getBody().get("id").asLong();
        post("/quotations/" + qid + "/send", null, staff);
        assertThat(post("/quotations/" + qid + "/approve", Map.of(), customer).getStatusCode()).isEqualTo(HttpStatus.OK);
        return orderId;
    }

    private ResponseEntity<JsonNode> exportPart(long orderId, long partId, int qty, String token) {
        return post("/repair-orders/" + orderId + "/parts", Map.of("partId", partId, "quantity", qty), token);
    }

    // ---------- tests ----------

    @Test
    void fullFlowFromQuotationToDeliveryWithWarranty() {
        long partId = createPart(5, 2, 2_500_000);
        JsonNode order = inspectingOrder();
        long orderId = order.get("id").asLong();

        // Báo giá nháp: tổng tiền do Backend tính
        JsonNode draft = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 100_000), staff).getBody();
        assertThat(draft.get("status").asText()).isEqualTo("DRAFT");
        assertThat(draft.get("partsTotal").decimalValue()).isEqualByComparingTo("2500000");
        assertThat(draft.get("laborTotal").decimalValue()).isEqualByComparingTo("300000");
        assertThat(draft.get("totalAmount").decimalValue()).isEqualByComparingTo("2700000");
        long qid = draft.get("id").asLong();

        // Khách không thấy bản nháp
        assertThat(get("/repair-orders/" + orderId + "/quotations", customer).getBody()).isEmpty();
        assertThat(get("/quotations/" + qid, customer).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // Gửi → phiếu chờ khách xác nhận
        assertThat(post("/quotations/" + qid + "/send", null, staff).getBody().get("status").asText()).isEqualTo("SENT");
        assertThat(order(orderId, staff).get("status").asText()).isEqualTo("WAITING_CONFIRMATION");
        assertThat(get("/me/quotations?status=SENT", customer).getBody().get("totalElements").asLong()).isEqualTo(1);

        // Khách đồng ý
        JsonNode approved = post("/quotations/" + qid + "/approve", Map.of("note", "Sửa giúp em"), customer).getBody();
        assertThat(approved.get("status").asText()).isEqualTo("APPROVED");
        JsonNode afterApprove = order(orderId, tech);
        assertThat(afterApprove.get("status").asText()).isEqualTo("APPROVED");
        assertThat(afterApprove.get("canUseParts").asBoolean()).isTrue();

        // KTV xuất kho, sửa, hoàn thành
        JsonNode usage = exportPart(orderId, partId, 1, tech).getBody();
        assertThat(usage.get(0).get("quantityUsed").asLong()).isEqualTo(1);
        assertThat(get("/parts/" + partId, staff).getBody().get("quantityOnHand").asInt()).isEqualTo(4);
        JsonNode repairing = transition(order(orderId, tech), "REPAIRING", tech).getBody();
        call(HttpMethod.PATCH, "/repair-orders/" + orderId + "/diagnosis", Map.of("diagnosis", "Hỏng OLED", "solution", "Thay màn"), tech);
        JsonNode completed = transition(order(orderId, tech), "COMPLETED", tech).getBody();
        assertThat(completed.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(repairing.get("status").asText()).isEqualTo("REPAIRING");

        // Bàn giao: số tiền mặc định = báo giá đã duyệt, tạo bảo hành 3 tháng
        JsonNode staffView = order(orderId, staff);
        assertThat(staffView.get("canDeliver").asBoolean()).isTrue();
        assertThat(staffView.get("approvedQuotationTotal").decimalValue()).isEqualByComparingTo("2700000");
        JsonNode delivered = post("/repair-orders/" + orderId + "/deliver",
                Map.of("paymentMethod", "CASH", "warrantyMonths", 3, "version", staffView.get("version").asLong()), staff).getBody();
        assertThat(delivered.get("status").asText()).isEqualTo("DELIVERED");
        assertThat(delivered.get("finalAmount").decimalValue()).isEqualByComparingTo("2700000");
        assertThat(delivered.get("warrantyCode").asText()).matches("WR-\\d{4}-\\d{6}");
        assertThat(get("/customers/" + customerId, staff).getBody().get("totalSpent").decimalValue()).isEqualByComparingTo("2700000");

        // Sổ kho: 1 dòng nhập + 1 dòng xuất gắn với phiếu
        JsonNode txs = get("/inventory/transactions?partId=" + partId, staff).getBody();
        assertThat(txs.get("content").findValuesAsText("type")).containsExactly("EXPORT", "IMPORT");
        assertThat(txs.get("content").get(0).get("balanceAfter").asInt()).isEqualTo(4);
    }

    @Test
    void concurrentExportOfLastUnitOnlyOneSucceeds() throws Exception {
        long partId = createPart(1, 0, 1_000_000);
        long orderA = approvedOrder(partId);
        long orderB = approvedOrder(partId);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<HttpStatus> exportA = () -> {
            start.await();
            return HttpStatus.valueOf(exportPart(orderA, partId, 1, tech).getStatusCode().value());
        };
        Callable<HttpStatus> exportB = () -> {
            start.await();
            return HttpStatus.valueOf(exportPart(orderB, partId, 1, tech).getStatusCode().value());
        };
        Future<HttpStatus> a = pool.submit(exportA);
        Future<HttpStatus> b = pool.submit(exportB);
        start.countDown(); // hai request xuất phát cùng lúc
        List<HttpStatus> results = List.of(a.get(), b.get());
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder(HttpStatus.OK, HttpStatus.CONFLICT);
        assertThat(get("/parts/" + partId, staff).getBody().get("quantityOnHand").asInt()).isZero();
        assertThat(get("/inventory/transactions?type=EXPORT&partId=" + partId, staff).getBody().get("totalElements").asLong())
                .isEqualTo(1);
    }

    @Nested
    class InventoryRules {

        @Test
        void cannotExportMoreThanStockOrBeforeApproval() {
            long partId = createPart(1, 0, 500_000);
            JsonNode inspecting = inspectingOrder();
            assertThat(exportPart(inspecting.get("id").asLong(), partId, 1, tech).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

            long orderId = approvedOrder(partId);
            ResponseEntity<JsonNode> tooMany = exportPart(orderId, partId, 2, tech);
            assertThat(tooMany.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(tooMany.getBody().get("code").asText()).isEqualTo("INSUFFICIENT_STOCK");
            assertThat(get("/parts/" + partId, staff).getBody().get("quantityOnHand").asInt()).isEqualTo(1);
        }

        @Test
        void otherTechnicianCannotUseParts() {
            long partId = createPart(3, 0, 500_000);
            long orderId = approvedOrder(partId);
            String otherTech = tokenOf(createUser(Role.TECHNICIAN));

            assertThat(exportPart(orderId, partId, 1, otherTech).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        void returnLimitedToExportedAndPartsBlockCancel() {
            long partId = createPart(3, 0, 500_000);
            long orderId = approvedOrder(partId);
            exportPart(orderId, partId, 2, tech);

            ResponseEntity<JsonNode> tooMuch = post("/repair-orders/" + orderId + "/parts/return",
                    Map.of("partId", partId, "quantity", 3), tech);
            assertThat(tooMuch.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

            JsonNode waiting = transition(order(orderId, tech), "WAITING_FOR_PARTS", tech).getBody();
            assertThat(transition(waiting, "CANCELLED", staff).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

            JsonNode usage = post("/repair-orders/" + orderId + "/parts/return", Map.of("partId", partId, "quantity", 2), tech).getBody();
            assertThat(usage).isEmpty();
            assertThat(get("/parts/" + partId, staff).getBody().get("quantityOnHand").asInt()).isEqualTo(3);
            assertThat(transition(order(orderId, staff), "CANCELLED", staff).getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        void technicianDoesNotSeeCostPrice() {
            long partId = createPart(1, 0, 500_000);
            assertThat(get("/parts/" + partId, tech).getBody().get("costPrice").isNull()).isTrue();
            assertThat(get("/parts/" + partId, staff).getBody().get("costPrice").decimalValue()).isEqualByComparingTo("1800000");
        }

        @Test
        void adjustmentRecordsSignedDelta() {
            long partId = createPart(5, 0, 500_000);
            ResponseEntity<JsonNode> adjusted = post("/parts/" + partId + "/adjust", Map.of("newQuantity", 3, "note", "Kiểm kê thiếu 2"), admin);
            assertThat(adjusted.getBody().get("quantityOnHand").asInt()).isEqualTo(3);
            JsonNode tx = get("/inventory/transactions?type=ADJUSTMENT&partId=" + partId, staff).getBody().get("content").get(0);
            assertThat(tx.get("quantity").asInt()).isEqualTo(-2);
            assertThat(post("/parts/" + partId + "/adjust", Map.of("newQuantity", 1, "note", "x"), staff).getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Nested
    class QuotationRules {

        @Test
        void discountCannotExceedSubtotal() {
            long partId = createPart(1, 0, 100_000);
            long orderId = inspectingOrder().get("id").asLong();
            ResponseEntity<JsonNode> res = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 9_999_999), staff);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        void staffApprovingOnBehalfMustLeaveNote() {
            long partId = createPart(1, 0, 100_000);
            long orderId = inspectingOrder().get("id").asLong();
            long qid = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 0), staff).getBody().get("id").asLong();
            post("/quotations/" + qid + "/send", null, staff);

            assertThat(post("/quotations/" + qid + "/approve", Map.of(), staff).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(post("/quotations/" + qid + "/approve", Map.of("note", "Khách đồng ý qua điện thoại"), staff)
                    .getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        void cannotQuoteBeforeInspectionOrSendTwice() {
            long partId = createPart(1, 0, 100_000);
            Map<String, Object> deviceBody = new HashMap<>(Map.of("name", "Máy", "deviceType", "PHONE"));
            deviceBody.put("customerId", customerId);
            long deviceId = post("/devices", deviceBody, staff).getBody().get("id").asLong();
            long received = post("/repair-orders", Map.of("customerId", customerId, "deviceId", deviceId, "reportedIssue", "x"), staff)
                    .getBody().get("id").asLong();
            assertThat(post("/repair-orders/" + received + "/quotations", quotationBody(partId, 0), staff).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT);

            long orderId = inspectingOrder().get("id").asLong();
            long qid = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 0), staff).getBody().get("id").asLong();
            post("/quotations/" + qid + "/send", null, staff);
            assertThat(post("/quotations/" + qid + "/send", null, staff).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        @Test
        void rejectedThenRequotedSupersedesAndReturnWithoutRepair() {
            long partId = createPart(1, 0, 100_000);
            long orderId = inspectingOrder().get("id").asLong();
            long q1 = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 0), staff).getBody().get("id").asLong();
            post("/quotations/" + q1 + "/send", null, staff);
            assertThat(post("/quotations/" + q1 + "/reject", Map.of("note", "Giá cao"), customer).getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(order(orderId, staff).get("status").asText()).isEqualTo("REJECTED");

            // Gửi báo giá v2 → v1 chuyển SUPERSEDED
            long q2 = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 50_000), staff).getBody().get("id").asLong();
            post("/quotations/" + q2 + "/send", null, staff);
            JsonNode versions = get("/repair-orders/" + orderId + "/quotations", customer).getBody();
            assertThat(versions.findValuesAsText("status")).containsExactly("SENT", "SUPERSEDED");

            // Khách lại từ chối → trả máy không sửa: 0đ, không tạo bảo hành
            post("/quotations/" + q2 + "/reject", Map.of(), customer);
            JsonNode delivered = post("/repair-orders/" + orderId + "/deliver", Map.of("warrantyMonths", 3), staff).getBody();
            assertThat(delivered.get("status").asText()).isEqualTo("DELIVERED");
            assertThat(delivered.get("finalAmount").decimalValue()).isEqualByComparingTo("0");
            assertThat(delivered.get("warrantyId").isNull()).isTrue();
        }

        @Test
        void otherCustomerCannotApprove() {
            long partId = createPart(1, 0, 100_000);
            long orderId = inspectingOrder().get("id").asLong();
            long qid = post("/repair-orders/" + orderId + "/quotations", quotationBody(partId, 0), staff).getBody().get("id").asLong();
            post("/quotations/" + qid + "/send", null, staff);

            assertThat(post("/quotations/" + qid + "/approve", Map.of(), registerCustomer()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }
    }
}
