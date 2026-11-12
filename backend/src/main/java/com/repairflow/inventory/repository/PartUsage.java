package com.repairflow.inventory.repository;

/** Kết quả gộp: số lượng một linh kiện đang dùng cho một phiếu (Σ xuất − Σ hoàn). */
public record PartUsage(Long partId, String sku, String name, String unit, Long quantityUsed) {
}
