package com.manacommunity.api.safety.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "patrol_checkpoints")
public class PatrolCheckpoint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String checkpointName;
    private String nfcTagId;
    private Double latitude;
    private Double longitude;
    @Builder.Default
    private String status = "PENDING"; // PENDING, SCANNED, MISSED
    private String notes;
    private LocalDateTime scannedAt;
}
