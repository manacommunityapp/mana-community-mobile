package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "purchase_requests")
public class PurchaseRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;
    private String category; // CapEx_Asset, OpEx_Consumable, etc.
    private BigDecimal estimatedAmount;
    @Builder.Default
    private String status = "REQUESTED"; // REQUESTED, COMMITTEE_APPROVED, QUOTATIONS_COLLECTED, etc.
    private String requestedBy;
    private LocalDate neededBy;
    private String approvalNotes;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
