package com.manacommunity.api.finance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "society_invoices")
public class SocietyInvoice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String invoiceNumber;
    private String unitNumber;
    private String residentName;
    private String residentEmail;
    private String residentPhone;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private BigDecimal subtotal;
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private BigDecimal totalAmount;
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal balanceDue;
    @Builder.Default
    private String status = "SENT"; // DRAFT, SENT, PAID, OVERDUE, CANCELLED
    @Column(columnDefinition = "TEXT")
    private String notes;
    private String paymentReference;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "invoice_id")
    private List<InvoiceLineItem> lineItems;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
