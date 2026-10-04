package com.manacommunity.api.finance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "society_invoice_line_items")
public class InvoiceLineItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String description;
    private Integer quantity;
    private BigDecimal rate;
    private BigDecimal amount;
    private BigDecimal taxRate;
}
