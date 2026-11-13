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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Mốc 6 qua HTTP thật: báo giá → khách duyệt → xuất kho → sửa xong → bàn giao + bảo hành; tồn kho đồng thời. */
class QuotationInventoryIT extends ApiTestSupport {

    @Autowired
    private StringRedisTemplate redis;

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

    /** id của nhóm linh kiện nạp sẵn ở V9 theo mã (SCREEN, RAM…). */
    private long categoryId(String code) {
        for (JsonNode c : get("/part-categories", staff).getBody()) {
            if (c.get("code").asText().equals(code)) {
                return c.get("id").asLong();
            }
        }
        throw new IllegalStateException("Không có nhóm " + code);
    }

    private long categoryPartCount(String code, String deviceType) {
        for (JsonNode c : get("/part-categories?deviceType=" + deviceType, staff).getBody()) {
            if (c.get("code").asText().equals(code)) {
                return c.get("partCount").asLong();
            }
        }
        throw new IllegalStateException("Không có nhóm " + code);
    }

    private Map<String, Object> partBody(String code, String deviceType, Integer warrantyMonths, long sellingPrice, int minStock) {
        Map<String, Object> body = new HashMap<>(Map.of("sku", unique("LCD").toUpperCase(), "name", "Màn hình OLED",
                "unit", "cái", "costPrice", 1_800_000, "sellingPrice", sellingPrice, "minStockLevel", minStock,
                "categoryId", categoryId(code), "grade", "AFTERMARKET", "brand", "GENA"));
        body.put("deviceType", deviceType);
        body.put("warrantyMonths", warrantyMonths);
        return body;
    }

    private long createPart(int stock, int minStock, long sellingPrice) {
        long id = post("/parts", partBody("SCREEN", "PHONE", null, sellingPrice, minStock), staff).getBody().get("id").asLong();
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

    /** Phiếu đã duyệt báo giá, KTV đã xuất linh kiện và hoàn thành (COMPLETED) – sẵn sàng bàn giao. */
    private long completedOrder(long partId) {
        long orderId = approvedOrder(partId);
        assertThat(exportPart(orderId, partId, 1, tech).getStatusCode()).isEqualTo(HttpStatus.OK);
        transition(order(orderId, tech), "REPAIRING", tech);
        call(HttpMethod.PATCH, "/repair-orders/" + orderId + "/diagnosis", Map.of("diagnosis", "Hỏng OLED", "solution", "Thay màn"), tech);
        assertThat(transition(order(orderId, tech), "COMPLETED", tech).getBody().get("status").asText()).isEqualTo("COMPLETED");
        return orderId;
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

    /** Danh mục nhóm linh kiện, loại linh kiện, ảnh, bảo hành theo từng dòng (V9 – TD-76). */
    @Nested
    class PerPartWarranty {

        /** PNG 1×1 hợp lệ. */
        private final byte[] png = {
                (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R',
                0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89};

        private ResponseEntity<JsonNode> uploadImage(long partId, byte[] data, String token) {
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.IMAGE_PNG);
            ByteArrayResource resource = new ByteArrayResource(data) {
                @Override
                public String getFilename() {
                    return "part.png";
                }
            };
            LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new HttpEntity<>(resource, partHeaders));
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            return rest.exchange("/api/v1/parts/" + partId + "/image", HttpMethod.PUT, new HttpEntity<>(body, headers), JsonNode.class);
        }

        @Test
        void seededCategoriesAndOnlyAdminChangesWarranty() {
            JsonNode categories = get("/part-categories", tech).getBody();
            JsonNode screen = null;
            JsonNode ram = null;
            for (JsonNode c : categories) {
                if (c.get("code").asText().equals("SCREEN")) screen = c;
                if (c.get("code").asText().equals("RAM")) ram = c;
            }
            assertThat(categories.size()).isGreaterThanOrEqualTo(30);
            assertThat(screen.get("defaultWarrantyMonths").asInt()).isEqualTo(6);
            assertThat(screen.get("deviceTypes").toString()).contains("PHONE").contains("LAPTOP");
            assertThat(ram.get("defaultWarrantyMonths").asInt()).isEqualTo(36);

            Map<String, Object> body = new HashMap<>(Map.of("code", unique("T").toUpperCase().replace("-", "_"),
                    "name", "Nhóm thử", "deviceTypes", List.of("PHONE"), "defaultWarrantyMonths", 4));
            assertThat(post("/part-categories", body, staff).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            JsonNode created = post("/part-categories", body, admin).getBody();
            assertThat(created.get("defaultWarrantyMonths").asInt()).isEqualTo(4);

            Map<String, Object> update = new HashMap<>(body);
            update.put("defaultWarrantyMonths", 9);
            update.put("exclusions", "Rơi vỡ");
            update.put("version", created.get("version").asLong());
            JsonNode updated = call(HttpMethod.PUT, "/part-categories/" + created.get("id").asLong(), update, admin).getBody();
            assertThat(updated.get("defaultWarrantyMonths").asInt()).isEqualTo(9);
            assertThat(updated.get("exclusions").asText()).isEqualTo("Rơi vỡ");
        }

        @Test
        void partNeedsCategoryAndGradeMatchingDeviceType() {
            Map<String, Object> noCategory = partBody("SCREEN", "PHONE", null, 100_000, 0);
            noCategory.remove("categoryId");
            noCategory.remove("grade");
            ResponseEntity<JsonNode> invalid = post("/parts", noCategory, staff);
            assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(invalid.getBody().get("fieldErrors").findValuesAsText("field")).contains("categoryId", "grade");

            // RAM không dùng cho điện thoại
            assertThat(post("/parts", partBody("RAM", "PHONE", null, 100_000, 0), staff).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST);

            JsonNode byCategory = post("/parts", partBody("SCREEN", "PHONE", null, 100_000, 0), staff).getBody();
            assertThat(byCategory.get("categoryCode").asText()).isEqualTo("SCREEN");
            assertThat(byCategory.get("grade").asText()).isEqualTo("AFTERMARKET");
            assertThat(byCategory.get("warrantyMonths").isNull()).isTrue();
            assertThat(byCategory.get("effectiveWarrantyMonths").asInt()).isEqualTo(6);

            JsonNode own = post("/parts", partBody("SCREEN", "PHONE", 12, 100_000, 0), staff).getBody();
            assertThat(own.get("effectiveWarrantyMonths").asInt()).isEqualTo(12);

            // Danh mục nhóm kèm số linh kiện đang kinh doanh (để hiện đủ các loại trên trang linh kiện)
            for (JsonNode c : get("/part-categories", staff).getBody()) {
                if (c.get("code").asText().equals("SCREEN")) {
                    assertThat(c.get("partCount").asLong()).isGreaterThanOrEqualTo(2);
                }
                assertThat(c.has("stockQuantity")).isTrue();
            }

            // Lọc theo loại thiết bị: linh kiện laptop không hiện khi lọc điện thoại
            long ram = post("/parts", partBody("RAM", "LAPTOP", null, 100_000, 0), staff).getBody().get("id").asLong();
            JsonNode phones = get("/parts?deviceType=PHONE&size=200", staff).getBody();
            assertThat(phones.get("content").findValuesAsText("id")).doesNotContain(String.valueOf(ram));

            // Số liệu trên thẻ nhóm cũng tính theo loại thiết bị đang lọc
            assertThat(categoryPartCount("RAM", "PHONE")).isZero();
            assertThat(categoryPartCount("RAM", "LAPTOP")).isGreaterThanOrEqualTo(1);
            assertThat(categoryPartCount("SCREEN", "PHONE")).isGreaterThanOrEqualTo(2);
        }

        @Test
        void createWithOpeningStockWritesLedgerAndSummary() {
            Map<String, Object> body = partBody("BATTERY", "PHONE", null, 500_000, 1);
            body.put("initialQuantity", 5);
            body.put("supplierName", "NCC Pin");
            JsonNode part = post("/parts", body, staff).getBody();
            long partId = part.get("id").asLong();
            assertThat(part.get("quantityOnHand").asInt()).isEqualTo(5);

            // Tồn đầu kỳ = một dòng NHẬP KHO trong sổ, giá = giá nhập, có nhà cung cấp
            JsonNode txs = get("/inventory/transactions?partId=" + partId, staff).getBody().get("content");
            assertThat(txs).hasSize(1);
            assertThat(txs.get(0).get("type").asText()).isEqualTo("IMPORT");
            assertThat(txs.get(0).get("balanceAfter").asInt()).isEqualTo(5);
            assertThat(txs.get(0).get("supplierName").asText()).isEqualTo("NCC Pin");
            assertThat(txs.get(0).get("unitCost").decimalValue()).isEqualByComparingTo("1800000");
            assertThat(txs.get(0).get("partCategoryCode").asText()).isEqualTo("BATTERY");

            post("/parts/" + partId + "/import", Map.of("quantity", 2, "unitCost", 1_900_000), staff);
            JsonNode summary = get("/inventory/summary?partId=" + partId, staff).getBody();
            assertThat(summary.get("importQuantity").asLong()).isEqualTo(7);
            assertThat(summary.get("importValue").decimalValue()).isEqualByComparingTo("12800000");
            assertThat(summary.get("transactionCount").asLong()).isEqualTo(2);
            assertThat(summary.get("stockQuantity").asLong()).isEqualTo(7);
            assertThat(summary.get("stockValue").decimalValue()).isEqualByComparingTo("13300000");
            // Toàn kho cũng tính được (không lỗi khi không lọc)
            assertThat(get("/inventory/summary", staff).getBody().get("stockQuantity").asLong()).isGreaterThanOrEqualTo(7);
            assertThat(get("/inventory/summary", tech).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }

        @Test
        void partImageUploadServeAndDelete() {
            long partId = createPart(0, 0, 100_000);
            assertThat(uploadImage(partId, "<svg/>".getBytes(), staff).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(uploadImage(partId, png, tech).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

            JsonNode uploaded = uploadImage(partId, png, staff).getBody();
            assertThat(uploaded.get("imageUpdatedAt").isNull()).isFalse();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(customer);
            ResponseEntity<byte[]> img = rest.exchange("/api/v1/parts/" + partId + "/image", HttpMethod.GET,
                    new HttpEntity<>(headers), byte[].class);
            assertThat(img.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(img.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
            assertThat(img.getBody()).isEqualTo(png);

            JsonNode deleted = call(HttpMethod.DELETE, "/parts/" + partId + "/image", null, staff).getBody();
            assertThat(deleted.get("imageUpdatedAt").isNull()).isTrue();
            assertThat(get("/parts/" + partId + "/image", staff).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        void quotationSnapshotsWarrantyAndDeliveryIssuesPerLineWarranty() {
            long partId = createPart(2, 0, 1_500_000);
            long orderId = completedOrder(partId);

            // Báo giá đã duyệt lưu loại linh kiện + 6 tháng (mặc định nhóm SCREEN) cho dòng linh kiện
            JsonNode quotation = get("/repair-orders/" + orderId + "/quotations", customer).getBody().get(0);
            JsonNode partLine = null;
            for (JsonNode i : quotation.get("items")) {
                if (i.get("itemType").asText().equals("PART")) partLine = i;
            }
            assertThat(partLine.get("warrantyMonths").asInt()).isEqualTo(6);
            assertThat(partLine.get("partGrade").asText()).isEqualTo("AFTERMARKET");

            JsonNode suggestions = get("/repair-orders/" + orderId + "/warranty-suggestions", staff).getBody();
            assertThat(suggestions).hasSize(1);
            assertThat(suggestions.get(0).get("months").asInt()).isEqualTo(6);
            assertThat(suggestions.get(0).get("categoryName").asText()).isEqualTo("Màn hình");

            JsonNode delivered = post("/repair-orders/" + orderId + "/deliver",
                    Map.of("paymentMethod", "CASH", "warrantyMonths", 3), staff).getBody();
            String code = delivered.get("warrantyCode").asText();
            JsonNode warranty = get("/warranties/lookup?keyword=" + code, staff).getBody().get(0);
            assertThat(warranty.get("months").asInt()).isEqualTo(6);
            assertThat(warranty.get("items")).hasSize(2);
            assertThat(warranty.get("items").findValuesAsText("description")).contains("Công sửa chữa");
            assertThat(warranty.get("items").findValues("months")).extracting(JsonNode::asInt).containsExactlyInAnyOrder(6, 3);

            // Phiếu nhiều dòng → yêu cầu bảo hành phải chọn dòng
            long warrantyId = warranty.get("id").asLong();
            assertThat(post("/warranties/" + warrantyId + "/claims", Map.of("issueDescription", "Lỗi lại"), customer)
                    .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            long laborItem = 0;
            for (JsonNode i : warranty.get("items")) {
                if (i.get("description").asText().equals("Công sửa chữa")) laborItem = i.get("id").asLong();
            }
            JsonNode claim = post("/warranties/" + warrantyId + "/claims",
                    Map.of("warrantyItemId", laborItem, "issueDescription", "Lỗi lại"), customer).getBody();
            assertThat(claim.get("warrantyItemDescription").asText()).isEqualTo("Công sửa chữa");

            // Tra cứu công khai: từng dòng, không lộ thông tin cá nhân.
            // Xoá bộ đếm giới hạn tần suất (test khác cố ý dùng hết 10 lượt/phút từ cùng IP)
            redis.delete(redis.keys("rl:warranty:*"));
            JsonNode check = call(HttpMethod.GET, "/public/warranty-check?keyword=" + code, null, null).getBody();
            assertThat(check.get("items")).hasSize(2);
            assertThat(check.toString()).doesNotContain("customerName");
        }

        @Test
        void deliveryRejectsWarrantyForPartNotInApprovedQuotation() {
            long partId = createPart(2, 0, 1_000_000);
            long otherPart = createPart(0, 0, 1_000_000);
            long orderId = completedOrder(partId);

            Map<String, Object> line = Map.of("partId", otherPart, "description", "Linh kiện lạ", "months", 6);
            ResponseEntity<JsonNode> res = post("/repair-orders/" + orderId + "/deliver",
                    Map.of("paymentMethod", "CASH", "warrantyItems", List.of(line)), staff);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

            // Danh sách nhân viên chỉnh: linh kiện 12 tháng, bỏ bảo hành công (0 tháng)
            List<Map<String, Object>> lines = List.of(
                    Map.of("partId", partId, "description", "Màn hình OLED", "months", 12),
                    Map.of("description", "Công sửa chữa", "months", 0));
            JsonNode delivered = post("/repair-orders/" + orderId + "/deliver",
                    Map.of("paymentMethod", "CASH", "warrantyItems", lines), staff).getBody();
            JsonNode warranty = get("/warranties/lookup?keyword=" + delivered.get("warrantyCode").asText(), staff).getBody().get(0);
            assertThat(warranty.get("items")).hasSize(1);
            assertThat(warranty.get("items").get(0).get("months").asInt()).isEqualTo(12);
            assertThat(warranty.get("items").get(0).get("partGrade").asText()).isEqualTo("AFTERMARKET");
        }
    }
}
