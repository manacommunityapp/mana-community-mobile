package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_accounts")
public class PersonalAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private String type; // SAVINGS, CURRENT, CREDIT_CARD, WALLET, CASH, INVESTMENT, LOAN
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;
    private BigDecimal creditLimit;
    @Builder.Default
    private String currency = "INR";
    private String bankName;
    private String accountNumber;
    private Integer billingDay;
    private Integer paymentDueDay;
    private String color;
    private String icon;
    @Builder.Default
    private Boolean isActive = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
