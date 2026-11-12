package com.repairflow;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Kiểm tra hạ tầng API: health check (gồm DB + Redis), Swagger, và lỗi 401 trả JSON chuẩn. */
class ApiInfrastructureIT extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private StringRedisTemplate redis;

    @Test
    void healthIsUp() {
        ResponseEntity<JsonNode> res = rest.getForEntity("/actuator/health", JsonNode.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("status").asText()).isEqualTo("UP");
    }

    @Test
    void redisIsReachable() {
        redis.opsForValue().set("it:ping", "pong");
        assertThat(redis.opsForValue().get("it:ping")).isEqualTo("pong");
    }

    @Test
    void openApiDocsArePublic() {
        ResponseEntity<String> res = rest.getForEntity("/v3/api-docs", String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("RepairFlow API");
    }

    @Test
    void protectedEndpointReturnsJson401() {
        ResponseEntity<JsonNode> res = rest.getForEntity("/api/v1/repair-orders", JsonNode.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(res.getBody().get("code").asText()).isEqualTo("UNAUTHORIZED");
        assertThat(res.getBody().get("path").asText()).isEqualTo("/api/v1/repair-orders");
    }
}
