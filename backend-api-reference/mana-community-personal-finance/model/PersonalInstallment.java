package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_installments")
public class PersonalInstallment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private BigDecimal totalAmount;
    private BigDecimal monthlyEmi;
    private BigDecimal interestRate;
    private Integer totalTenorMonths;
    private Integer remainingTenorMonths;
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private LocalDate startDate;
    private LocalDate nextDueDate;
    private Long accountId;
    private Long categoryId;
    @Builder.Default
    private Boolean isAutoDeduct = false;
    @Builder.Default
    private String status = "ACTIVE";
}
