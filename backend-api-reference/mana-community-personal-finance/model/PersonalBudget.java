package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_budgets")
public class PersonalBudget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;
    private String period; // MONTHLY, QUARTERLY, YEARLY
    private BigDecimal limitAmount;
    @Builder.Default
    private BigDecimal spentAmount = BigDecimal.ZERO;
    @Builder.Default
    private Integer alertThreshold = 80;
    private String month;
}
