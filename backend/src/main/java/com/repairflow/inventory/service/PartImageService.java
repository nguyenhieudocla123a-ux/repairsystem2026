package com.repairflow.inventory.service;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.config.CacheConfig;
import com.repairflow.inventory.dto.InventoryDtos.PartResponse;
import com.repairflow.inventory.entity.Part;
import com.repairflow.inventory.entity.PartImage;
import com.repairflow.inventory.repository.PartImageRepository;
import com.repairflow.inventory.repository.PartRepository;
import com.repairflow.user.service.AvatarService;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ảnh thật của linh kiện: tối đa 2 MB, chỉ JPEG/PNG/WebP (nhận diện bằng chữ ký file như ảnh đại diện – TD-68).
 * Linh kiện chưa có ảnh → frontend hiển thị ảnh mặc định theo nhóm.
 */
@Service
@RequiredArgsConstructor
public class PartImageService {

    private final PartRepository partRepository;
    private final PartImageRepository imageRepository;
    private final Clock clock;

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse upload(Long partId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng chọn ảnh");
        }
        if (file.getSize() > AvatarService.MAX_BYTES) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Ảnh tối đa 2 MB");
        }
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Không đọc được file ảnh");
        }
        String contentType = AvatarService.detectImageType(data);
        if (contentType == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Chỉ nhận ảnh JPEG, PNG hoặc WebP");
        }
        Part part = load(partId);
        Instant now = Instant.now(clock).truncatedTo(ChronoUnit.MILLIS);
        imageRepository.findById(partId).ifPresentOrElse(
                img -> img.replace(contentType, data, now),
                () -> imageRepository.save(new PartImage(partId, contentType, data, now)));
        part.setImageUpdatedAt(now);
        return PartResponse.from(part, true);
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PART_OPTIONS, allEntries = true)
    public PartResponse delete(Long partId) {
        Part part = load(partId);
        imageRepository.findById(partId).ifPresent(imageRepository::delete);
        part.setImageUpdatedAt(null);
        return PartResponse.from(part, true);
    }

    @Transactional(readOnly = true)
    public PartImage get(Long partId) {
        return imageRepository.findById(partId).orElseThrow(() -> BusinessException.notFound("Ảnh linh kiện", partId));
    }

    private Part load(Long id) {
        return partRepository.findWithCategoryById(id).orElseThrow(() -> BusinessException.notFound("Linh kiện", id));
    }
}
