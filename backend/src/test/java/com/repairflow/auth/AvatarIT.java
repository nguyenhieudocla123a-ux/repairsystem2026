package com.repairflow.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.repairflow.support.ApiTestSupport;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;

/** Ảnh đại diện: tải lên, kiểm tra chữ ký file, quyền xem, xóa. */
class AvatarIT extends ApiTestSupport {

    /** PNG 1×1 hợp lệ. */
    private static final byte[] PNG = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R',
            0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89};

    private ResponseEntity<JsonNode> upload(String token, byte[] data, String filename, MediaType partType) {
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(partType);
        ByteArrayResource resource = new ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(resource, partHeaders));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return rest.exchange("/api/v1/auth/me/avatar", HttpMethod.PUT, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private ResponseEntity<byte[]> fetchAvatar(Long userId, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange("/api/v1/users/" + userId + "/avatar", HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
    }

    @Test
    @DisplayName("Tải ảnh PNG → có avatarUpdatedAt, xem lại đúng nội dung + header cache; xóa → 404")
    void uploadViewDelete() {
        User staff = createUser(Role.STAFF);
        String token = tokenOf(staff);

        ResponseEntity<JsonNode> res = upload(token, PNG, "me.png", MediaType.IMAGE_PNG);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("avatarUpdatedAt").isNull()).isFalse();
        assertThat(get("/auth/me", token).getBody().get("avatarUpdatedAt").asText()).isEqualTo(res.getBody().get("avatarUpdatedAt").asText());

        ResponseEntity<byte[]> img = fetchAvatar(staff.getId(), token);
        assertThat(img.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(img.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(img.getHeaders().getCacheControl()).contains("private");
        assertThat(img.getBody()).isEqualTo(PNG);

        ResponseEntity<JsonNode> del = call(HttpMethod.DELETE, "/auth/me/avatar", null, token);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(del.getBody().get("avatarUpdatedAt").isNull()).isTrue();
        assertThat(fetchAvatar(staff.getId(), token).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("File HTML đổi tên thành .png (Content-Type giả image/png) bị từ chối theo chữ ký file")
    void disguisedFileRejected() {
        String token = tokenOf(createUser(Role.STAFF));
        byte[] html = "<html><script>alert(1)</script></html>".getBytes();
        ResponseEntity<JsonNode> res = upload(token, html, "evil.png", MediaType.IMAGE_PNG);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody().get("code").asText()).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    @DisplayName("Ảnh > 2 MB bị từ chối")
    void tooLargeRejected() {
        String token = tokenOf(createUser(Role.STAFF));
        byte[] big = Arrays.copyOf(PNG, 2 * 1024 * 1024 + 1);
        ResponseEntity<JsonNode> res = upload(token, big, "big.png", MediaType.IMAGE_PNG);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Khách chỉ xem được ảnh của mình; nhân viên xem được ảnh khách; chưa đăng nhập → 401")
    void viewPermissions() {
        User staff = createUser(Role.STAFF);
        String staffToken = tokenOf(staff);
        upload(staffToken, PNG, "s.png", MediaType.IMAGE_PNG);

        String customerToken = registerCustomer();
        Long customerId = get("/auth/me", customerToken).getBody().get("id").asLong();
        assertThat(upload(customerToken, PNG, "c.png", MediaType.IMAGE_PNG).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(fetchAvatar(customerId, customerToken).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fetchAvatar(staff.getId(), customerToken).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(fetchAvatar(customerId, staffToken).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fetchAvatar(customerId, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
