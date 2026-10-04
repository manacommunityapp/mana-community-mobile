package com.manacommunity.api.service.model;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TurnstileOverrideRequest {
    private String action; // UNLOCK, LOCK, MAINTENANCE
    private Integer durationSeconds;
    private String reason;
}
