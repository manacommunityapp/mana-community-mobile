package com.manacommunity.api.safety.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "anpr_gate_events")
public class AnprGateEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String gateId;
    private String direction; // IN, OUT
    private String plateNumber;
    private Double confidence;
    private String anprStatus; // MATCH, NO_MATCH, PARTIAL_MATCH
    private String barrierAction; // OPEN, HOLD, DENY
    private String matchedResidentName;
    private Long matchedVehicleId;
    private Long matchedVisitorPassId;
    private Integer processingMs;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
