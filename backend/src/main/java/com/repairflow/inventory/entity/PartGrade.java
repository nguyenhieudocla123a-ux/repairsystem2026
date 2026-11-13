package com.repairflow.inventory.entity;

/** Chất lượng / nguồn gốc linh kiện – ảnh hưởng trực tiếp tới bảo hành, phải ghi rõ trên báo giá. */
public enum PartGrade {
    /** Chính hãng (linh kiện hãng, có giấy tờ) */
    OEM,
    /** Zin tháo máy */
    ORIGINAL_USED,
    /** Linh kiện thay thế có thương hiệu (GENA, Pisen, Deji…) */
    AFTERMARKET,
    /** Linh kiện thay thế không thương hiệu */
    GENERIC
}
