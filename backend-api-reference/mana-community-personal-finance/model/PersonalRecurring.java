package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_recurring")
public class PersonalRecurring {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private String type; // INCOME, EXPENSE, TRANSFER
    private BigDecimal amount;
    private Long categoryId;
    private Long accountId;
    private String frequency; // DAILY, WEEKLY, MONTHLY, YEARLY
    private LocalDate nextDueDate;
    @Builder.Default
    private Boolean isActive = true;
}
