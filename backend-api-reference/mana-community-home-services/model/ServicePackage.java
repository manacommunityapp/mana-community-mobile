package com.manacommunity.api.homeservices.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "service_packages")
public class ServicePackage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long staffId;
    private String staffName;
    private String role;
    private Long userId;
    private String flatNumber;
    private String packageType; // MONTHLY, WEEKLY, DAILY
    private String services; // JSON array of service names
    private BigDecimal monthlySalary;
    private LocalDate lastPaidDate;
    private LocalDate nextDueDate;
    @Builder.Default
    private String paymentStatus = "DUE"; // PAID, DUE, OVERDUE
    private LocalDate startDate;
    private LocalDate endDate;
}
