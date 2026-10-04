package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "utility_consumption_summary")
public class UtilityConsumption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long unitId;
    private String unitNumber;
    private String cycleMonth;
    private Double electricityKWh;
    private BigDecimal electricityAmount;
    private Double waterLiters;
    private BigDecimal waterAmount;
    private Double dgBackupKWh;
    private BigDecimal dgBackupAmount;
    private BigDecimal totalUtilityAmount;
    @Builder.Default
    private String cfbosSyncStatus = "PENDING"; // SYNCED, PENDING, OVERDUE
}
