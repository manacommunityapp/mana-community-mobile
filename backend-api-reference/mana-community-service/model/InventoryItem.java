package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "inventory_items")
public class InventoryItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String name;
    private String category;
    private String location;
    private String serialNumber;
    private String vendorName;
    private LocalDate purchaseDate;
    private LocalDate warrantyExpiryDate;
    @Builder.Default
    private String status = "AVAILABLE"; // AVAILABLE, BORROWED, MAINTENANCE, LOST, DISPOSED
    private BigDecimal originalCost;
    private BigDecimal tco;
    private String qrCodeId;
    private String depreciationMethod;
    private Integer usefulLifeMonths;
    private BigDecimal salvageValue;
    private BigDecimal currentValue;
    private LocalDate nextMaintenanceDueAt;
    private LocalDateTime lastAuditedAt;
    private Integer auditVariance;
    private String borrowedBy;
    private String borrowedByFlat;
    private LocalDateTime borrowedAt;
    private LocalDate expectedReturn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
