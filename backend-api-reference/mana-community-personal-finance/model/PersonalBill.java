package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_bills")
public class PersonalBill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private BigDecimal amount;
    private LocalDate dueDate;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;
    @Builder.Default
    private Boolean isPaid = false;
    @Builder.Default
    private Integer reminderDaysBefore = 3;
    @Builder.Default
    private Boolean isManaInvoice = false;
    private String invoiceId;
}
