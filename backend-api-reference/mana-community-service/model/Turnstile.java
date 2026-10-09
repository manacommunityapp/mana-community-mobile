package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "turnstiles")
public class Turnstile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long societyId;
    private String turnstileCode;
    private String turnstileName;
    private String gateLocation;
    private String turnstileType; // PEDESTRIAN_IN, PEDESTRIAN_OUT, BIDIRECTIONAL
    private String ipAddress;
    private Integer relayPin;
    @Builder.Default
    private String status = "ONLINE"; // ONLINE, OFFLINE, LOCKED, MAINTENANCE
    @Builder.Default
    private Double confidenceThreshold = 0.80;
    @Builder.Default
    private Integer unlockDurationSeconds = 3;
    private LocalDateTime lastHeartbeat;
}
