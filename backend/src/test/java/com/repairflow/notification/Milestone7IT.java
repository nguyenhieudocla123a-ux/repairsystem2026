package com.repairflow.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.lang.reflect.Type;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/** Mốc 7 qua HTTP/WebSocket thật: thông báo (DB + realtime), bảo hành, dashboard + cache Redis. */
class Milestone7IT extends ApiTestSupport {

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private String admin;
    private String staff;
    private User techUser;
    private String tech;
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

    private JsonNode newOrder(Long technicianId) {
        Map<String, Object> d = new HashMap<>(Map.of("name", "Máy test", "deviceType", "PHONE", "serialNumber", unique("SN").toUpperCase()));
        d.put("customerId", customerId);
        long deviceId = post("/devices", d, staff).getBody().get("id").asLong();
        Map<String, Object> body = new HashMap<>(Map.of("customerId", customerId, "deviceId", deviceId, "reportedIssue", "Hỏng"));
        if (technicianId != null) {
            body.put("technicianId", technicianId);
        }
        return post("/repair-orders", body, staff).getBody();
    }

    private JsonNode transition(long id, String to, String token) {
        long version = get("/repair-orders/" + id, token).getBody().get("version").asLong();
        return post("/repair-orders/" + id + "/transitions", Map.of("toStatus", to, "version", version, "note", "test"), token).getBody();
    }

    /** Đưa phiếu tới DELIVERED với bảo hành `months` tháng, trả về warrantyId. */
    private long deliveredWithWarranty(int months) {
        long partId = post("/parts", Map.of("sku", unique("P").toUpperCase(), "name", "Pin", "unit", "cái", "costPrice", 100_000,
                "sellingPrice", 300_000, "minStockLevel", 0), staff).getBody().get("id").asLong();
        long id = newOrder(techUser.getId()).get("id").asLong();
        transition(id, "INSPECTING", tech);
        Map<String, Object> item = new HashMap<>(Map.of("itemType", "PART", "quantity", 1));
        item.put("partId", partId);
        long qid = post("/repair-orders/" + id + "/quotations", Map.of("items", List.of(item)), staff).getBody().get("id").asLong();
        post("/quotations/" + qid + "/send", null, staff);
        post("/quotations/" + qid + "/approve", Map.of(), customer);
        transition(id, "REPAIRING", tech);
        call(HttpMethod.PATCH, "/repair-orders/" + id + "/diagnosis", Map.of("solution", "Thay pin"), tech);
        transition(id, "COMPLETED", tech);
        JsonNode delivered = post("/repair-orders/" + id + "/deliver", Map.of("paymentMethod", "CASH", "warrantyMonths", months), staff).getBody();
        return delivered.get("warrantyId").asLong();
    }

    private List<String> notificationTypes(String token) {
        return get("/notifications?size=50", token).getBody().get("content").findValuesAsText("type");
    }

    @Nested
    class Notifications {

        @Test
        void customerIsNotifiedOnStatusChangeButActorIsNot() {
            long id = newOrder(techUser.getId()).get("id").asLong();
            assertThat(notificationTypes(tech)).contains("REPAIR_ASSIGNED");

            transition(id, "INSPECTING", tech);

            assertThat(notificationTypes(customer)).contains("REPAIR_STATUS_CHANGED");
            assertThat(get("/notifications/unread-count", customer).getBody().get("count").asLong()).isPositive();
            // KTV tự đổi trạng thái → không tự nhận thông báo về hành động của mình
            assertThat(notificationTypes(tech)).doesNotContain("REPAIR_STATUS_CHANGED");
        }

        @Test
        void failedTransitionCreatesNoNotification() {
            long id = newOrder(techUser.getId()).get("id").asLong();
            long before = get("/notifications/unread-count", customer).getBody().get("count").asLong();

            ResponseEntity<JsonNode> invalid = post("/repair-orders/" + id + "/transitions",
                    Map.of("toStatus", "COMPLETED", "version", 0), tech);

            assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(get("/notifications/unread-count", customer).getBody().get("count").asLong()).isEqualTo(before);
        }

        @Test
        void markReadOnlyOwnNotifications() {
            newOrder(techUser.getId());
            long nid = get("/notifications", tech).getBody().get("content").get(0).get("id").asLong();

            assertThat(call(HttpMethod.PATCH, "/notifications/" + nid + "/read", null, customer).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(call(HttpMethod.PATCH, "/notifications/" + nid + "/read", null, tech).getBody().get("read").asBoolean()).isTrue();
            call(HttpMethod.PATCH, "/notifications/read-all", null, tech);
            assertThat(get("/notifications/unread-count", tech).getBody().get("count").asLong()).isZero();
        }

        @Test
        void onlineRequestNotifiesStaff() {
            long deviceId = post("/me/devices", Map.of("name", "Laptop", "deviceType", "LAPTOP"), customer).getBody().get("id").asLong();
            post("/me/repair-requests", Map.of("deviceId", deviceId, "issueDescription", "Không lên nguồn"), customer);
            assertThat(notificationTypes(staff)).contains("REPAIR_REQUEST_CREATED");
        }
    }

    @Nested
    class WebSocket {

        private WebSocketStompClient client() {
            WebSocketStompClient c = new WebSocketStompClient(new StandardWebSocketClient());
            c.setMessageConverter(new MappingJackson2MessageConverter());
            return c;
        }

        @Test
        void technicianReceivesAssignmentInRealtime() throws Exception {
            StompHeaders connect = new StompHeaders();
            connect.add("Authorization", "Bearer " + tech);
            StompSession session = client().connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(),
                    connect, new StompSessionHandlerAdapter() { }).get(5, TimeUnit.SECONDS);
            BlockingQueue<Map<String, Object>> received = new LinkedBlockingQueue<>();
            session.subscribe("/user/queue/notifications", new StompFrameHandler() {
                @Override
                public Type getPayloadType(StompHeaders headers) {
                    return Map.class;
                }

                @Override
                @SuppressWarnings("unchecked")
                public void handleFrame(StompHeaders headers, Object payload) {
                    received.add((Map<String, Object>) payload);
                }
            });
            Thread.sleep(300); // chờ SUBSCRIBE tới server

            JsonNode order = newOrder(techUser.getId());

            Map<String, Object> msg = received.poll(5, TimeUnit.SECONDS);
            assertThat(msg).isNotNull();
            assertThat(msg.get("type")).isEqualTo("REPAIR_ASSIGNED");
            assertThat(msg.get("referenceId")).isEqualTo(order.get("id").asInt());
            session.disconnect();
        }

        @Test
        void connectWithoutTokenIsRejected() {
            assertThatThrownBy(() -> {
                StompSession s = client().connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(),
                        new StompHeaders(), new StompSessionHandlerAdapter() { }).get(5, TimeUnit.SECONDS);
                // Một số phiên bản trả session rồi mới đóng: coi như bị từ chối nếu không còn kết nối
                Thread.sleep(500);
                if (!s.isConnected()) {
                    throw new IllegalStateException("rejected");
                }
            }).isInstanceOf(Exception.class);
        }
    }

    @Nested
    class Warranty {

        @Test
        void claimAcceptedCreatesWarrantyRepairAndResolvesOnDelivery() {
            long warrantyId = deliveredWithWarranty(3);
            JsonNode detail = get("/warranties/" + warrantyId, customer).getBody();
            assertThat(detail.get("warranty").get("valid").asBoolean()).isTrue();
            assertThat(detail.get("canClaim").asBoolean()).isTrue();

            JsonNode claim = post("/warranties/" + warrantyId + "/claims", Map.of("issueDescription", "Pin lại phồng"), customer).getBody();
            assertThat(claim.get("status").asText()).isEqualTo("SUBMITTED");
            assertThat(notificationTypes(staff)).contains("WARRANTY_CLAIM_CREATED");
            // Đang có yêu cầu mở → không tạo thêm
            assertThat(post("/warranties/" + warrantyId + "/claims", Map.of("issueDescription", "x"), customer).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT);

            JsonNode accepted = post("/warranty-claims/" + claim.get("id").asLong() + "/accept",
                    Map.of("technicianId", techUser.getId()), staff).getBody();
            assertThat(accepted.get("status").asText()).isEqualTo("ACCEPTED");
            long warrantyOrder = accepted.get("repairOrderId").asLong();
            JsonNode wo = get("/repair-orders/" + warrantyOrder, staff).getBody();
            assertThat(wo.get("warrantyRepair").asBoolean()).isTrue();
            assertThat(wo.get("priority").asText()).isEqualTo("HIGH");

            // Sửa bảo hành: báo giá 0đ (tiền công 0)
            transition(warrantyOrder, "INSPECTING", tech);
            long qid = post("/repair-orders/" + warrantyOrder + "/quotations", Map.of("items",
                    List.of(Map.of("itemType", "LABOR", "description", "Bảo hành", "quantity", 1, "unitPrice", 0))), staff).getBody().get("id").asLong();
            post("/quotations/" + qid + "/send", null, staff);
            post("/quotations/" + qid + "/approve", Map.of(), customer);
            transition(warrantyOrder, "REPAIRING", tech);
            call(HttpMethod.PATCH, "/repair-orders/" + warrantyOrder + "/diagnosis", Map.of("solution", "Thay pin mới"), tech);
            transition(warrantyOrder, "COMPLETED", tech);
            post("/repair-orders/" + warrantyOrder + "/deliver", Map.of("warrantyMonths", 0), staff);

            JsonNode claims = get("/warranties/" + warrantyId, staff).getBody().get("claims");
            assertThat(claims.get(0).get("status").asText()).isEqualTo("RESOLVED");
        }

        @Test
        void expiredWarrantyCannotBeClaimed() {
            long warrantyId = deliveredWithWarranty(1);
            jdbc.update("UPDATE warranties SET start_date = ?, end_date = ? WHERE id = ?",
                    LocalDate.now().minusMonths(3), LocalDate.now().minusDays(1), warrantyId);

            assertThat(get("/warranties/" + warrantyId, customer).getBody().get("warranty").get("valid").asBoolean()).isFalse();
            ResponseEntity<JsonNode> res = post("/warranties/" + warrantyId + "/claims", Map.of("issueDescription", "x"), staff);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(res.getBody().get("message").asText()).contains("hết hạn");
        }

        @Test
        void publicCheckHidesPersonalDataAndIsRateLimited() {
            long warrantyId = deliveredWithWarranty(6);
            String code = get("/warranties/" + warrantyId, staff).getBody().get("warranty").get("code").asText();

            JsonNode pub = get("/public/warranty-check?keyword=" + code, null).getBody();
            assertThat(pub.get("valid").asBoolean()).isTrue();
            assertThat(pub.toString()).doesNotContain("customer").doesNotContain("phone");
            assertThat(pub.get("serialMasked").asText()).contains("*");

            // Khách khác không xem được bảo hành này
            assertThat(get("/warranties/" + warrantyId, registerCustomer()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

            HttpStatus last = HttpStatus.OK;
            for (int i = 0; i < 12; i++) {
                last = HttpStatus.valueOf(get("/public/warranty-check?keyword=" + code, null).getStatusCode().value());
            }
            assertThat(last).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    @Nested
    class Dashboard {

        @Test
        void adminDashboardCacheIsEvictedByBusinessEvents() {
            JsonNode before = get("/dashboard/admin", admin).getBody(); // lần đầu → ghi cache
            BigDecimalHolder revenueBefore = new BigDecimalHolder(before.get("revenue").decimalValue());

            deliveredWithWarranty(3); // bàn giao 300.000₫ → sự kiện → xóa cache

            JsonNode after = get("/dashboard/admin", admin).getBody();
            assertThat(after.get("revenue").decimalValue()).isEqualByComparingTo(revenueBefore.value().add(new java.math.BigDecimal("300000")));
            assertThat(after.get("revenueSeries")).hasSize(30);
        }

        @Test
        void roleDashboardsAreScoped() {
            newOrder(techUser.getId());
            assertThat(get("/dashboard/technician", tech).getBody().get("assigned").asLong()).isEqualTo(1);
            assertThat(get("/dashboard/customer", customer).getBody().get("activeOrders").asLong()).isEqualTo(1);
            assertThat(get("/dashboard/staff", staff).getBody().get("newOrders").asLong()).isPositive();
            assertThat(get("/dashboard/admin", staff).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(get("/dashboard/admin?from=2026-12-01&to=2026-01-01", admin).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        void reportsReturnTechnicianPerformance() {
            deliveredWithWarranty(3);
            String from = LocalDate.now().minusDays(7).toString();
            String to = LocalDate.now().plusDays(1).toString();
            JsonNode perf = get("/reports/technician-performance?from=" + from + "&to=" + to, admin).getBody();
            JsonNode mine = null;
            for (JsonNode n : perf) {
                if (n.get("technicianId").asLong() == techUser.getId()) {
                    mine = n;
                }
            }
            assertThat(mine).isNotNull();
            assertThat(mine.get("completedCount").asLong()).isEqualTo(1);
            assertThat(get("/reports/revenue?from=" + from + "&to=" + to + "&groupBy=MONTH", admin).getStatusCode()).isEqualTo(HttpStatus.OK);
        }
    }

    private record BigDecimalHolder(java.math.BigDecimal value) {
    }
}
