package com.repairflow.config;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairflow.dashboard.dto.DashboardDtos.AdminDashboardResponse;
import com.repairflow.inventory.dto.InventoryDtos.PartOption;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

/**
 * Redis cache (TD-17). Mỗi cache có serializer Jackson GẮN KIỂU riêng: DTO là record (final) nên kiểu
 * "@class" mặc định của GenericJackson2JsonRedisSerializer không áp dụng → đọc ra sẽ thành LinkedHashMap.
 * Chỉ cache dữ liệu tổng hợp/ít đổi; KHÔNG cache dữ liệu người dùng, token. Mọi cache đều có cơ chế xóa chủ động.
 * Redis lỗi → bỏ qua cache (fail-open) thay vì làm hỏng request.
 */
@Slf4j
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    /** Dashboard ADMIN: truy vấn tổng hợp nặng nhất. TTL ngắn + xóa khi có sự kiện nghiệp vụ. */
    public static final String ADMIN_DASHBOARD = "dashboard-admin";
    /** Danh sách linh kiện cho ô chọn. Xóa khi sửa linh kiện hoặc tồn kho thay đổi. */
    public static final String PART_OPTIONS = "parts-options-v2"; // v2: thêm nhóm, loại linh kiện, bảo hành (V9) – tránh đọc bản cache cũ

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheCustomizer(ObjectMapper objectMapper) {
        JavaType partOptions = objectMapper.getTypeFactory().constructCollectionType(List.class, PartOption.class);
        return builder -> builder
                .withCacheConfiguration(ADMIN_DASHBOARD, config(new Jackson2JsonRedisSerializer<>(objectMapper, AdminDashboardResponse.class), Duration.ofSeconds(60)))
                .withCacheConfiguration(PART_OPTIONS, config(new Jackson2JsonRedisSerializer<>(objectMapper, partOptions), Duration.ofMinutes(10)));
    }

    private static RedisCacheConfiguration config(Jackson2JsonRedisSerializer<?> serializer, Duration ttl) {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .disableCachingNullValues()
                .prefixCacheNameWith("rf:")
                .serializeValuesWith(SerializationPair.fromSerializer(serializer));
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache {} GET lỗi (bỏ qua cache): {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                log.warn("Cache {} PUT lỗi: {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache {} EVICT lỗi: {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {
                log.warn("Cache {} CLEAR lỗi: {}", cache.getName(), e.getMessage());
            }
        };
    }
}
