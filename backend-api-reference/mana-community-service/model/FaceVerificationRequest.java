package com.manacommunity.api.service.model;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FaceVerificationRequest {
    private Long societyId;
    private String turnstileCode;
    private double[] faceEmbeddingVector;
    private String faceSnapshotBase64;
    private Double confidenceScore;
    private String timestamp;
}
