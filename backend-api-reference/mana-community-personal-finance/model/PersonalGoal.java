package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_goals")
public class PersonalGoal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private BigDecimal targetAmount;
    @Builder.Default
    private BigDecimal currentAmount = BigDecimal.ZERO;
    private LocalDate targetDate;
    private String icon;
    private String color;
    private Long categoryId;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Builder.Default
    private Boolean isCompleted = false;
}
