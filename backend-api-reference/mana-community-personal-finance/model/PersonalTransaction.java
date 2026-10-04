package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_transactions")
public class PersonalTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String type; // INCOME, EXPENSE, TRANSFER
    private BigDecimal amount;
    @Builder.Default
    private String currency = "INR";
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;
    private String subcategoryName;
    private Long accountId;
    private String accountName;
    private Long toAccountId;
    private String toAccountName;
    private String description;
    @Column(columnDefinition = "TEXT")
    private String notes;
    private String receiptUrl;
    private String tags;
    private String splitDetails;
    private LocalDate date;
    @Builder.Default
    private Boolean isManaProjection = false;
    private String sourceModule;
    private String sourceType;
    private String sourceId;
    private String sourceLabel;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
