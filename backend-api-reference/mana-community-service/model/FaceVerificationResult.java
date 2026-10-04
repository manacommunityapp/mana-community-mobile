package com.manacommunity.api.service.model;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FaceVerificationResult {
    private String decision; // ACCESS_GRANTED, ACCESS_DENIED, TIME_RESTRICTED, LOCKDOWN_BLOCKED
    private Long userId;
    private String userFullName;
    private String userType; // RESIDENT, STAFF, GUARD, VISITOR
    private String roleName;
    private Double confidenceScore;
    private String reason;
    private Integer relayPulseDurationMs;
    private String turnstileCode;
}
