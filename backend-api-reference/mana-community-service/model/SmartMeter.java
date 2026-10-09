package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "smart_meters")
public class SmartMeter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long societyId;
    private Long unitId;
    private String unitNumber;
    private String meterNumber;
    private String meterType; // ELECTRICITY, WATER, DG_BACKUP, GAS
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, TAMPERED, DISCONNECTED, MAINTENANCE
    private Double currentReading;
    private String unitOfMeasure; // kWh, Liters, m3
    @Builder.Default
    private Double pulseMultiplier = 1.0;
    private LocalDateTime lastReadingAt;
    @Builder.Default
    private Boolean burstLeakDetected = false;
}
