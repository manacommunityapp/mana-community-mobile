package com.manacommunity.api.finance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "society_vendors")
public class SocietyVendor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String vendorName;
    private String category;
    private String contactPerson;
    private String phone;
    private String email;
    private String gstin;
    private String panNumber;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String tdsSection; // 194C_CONTRACTOR, 194J_PROFESSIONAL, etc.
    @Builder.Default
    private BigDecimal tdsRate = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalBilled = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalPaid = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal outstandingBalance = BigDecimal.ZERO;
    @Builder.Default
    private Boolean isActive = true;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
