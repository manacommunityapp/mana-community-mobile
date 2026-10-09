package com.manacommunity.api.safety.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "security_incidents")
public class SecurityIncident {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private Long reportedBy;
    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;
    private String location;
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL
    @Builder.Default
    private String status = "OPEN"; // OPEN, ESCALATED, RESOLVED
    private String assignedTo;
    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;
    private LocalDateTime reportedAt;
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() { reportedAt = LocalDateTime.now(); }
}
