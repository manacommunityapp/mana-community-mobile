package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "access_log")
public class AccessLogEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long societyId;
    private String turnstileCode;
    private String turnstileName;
    private String decision;
    private Long userId;
    private String userFullName;
    private String userType;
    private Double confidenceScore;
    private String reason;
    private LocalDateTime timestamp;
}
