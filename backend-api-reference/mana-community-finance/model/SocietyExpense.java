package com.manacommunity.api.finance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "society_expenses")
public class SocietyExpense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String voucherNumber;
    private String category;
    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;
    private BigDecimal amount;
    private Long accountId;
    private String accountName;
    private Long vendorId;
    private String vendorName;
    @Builder.Default
    private String status = "PENDING_MAKER"; // PENDING_MAKER, PENDING_CHECKER, PENDING_APPROVER, APPROVED, REJECTED, PAID
    private String makerName;
    private LocalDateTime makerDate;
    private String checkerName;
    private LocalDateTime checkerDate;
    private String checkerNotes;
    private String approverName;
    private LocalDateTime approverDate;
    private String approverNotes;
    private String receiptUrl;
    private String paymentMethod;
    private String utrReference;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
