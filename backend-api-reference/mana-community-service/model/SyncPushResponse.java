package com.manacommunity.api.service.model;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyncPushResponse {
    private List<String> acceptedMutationIds;
    private List<String> conflictedMutationIds;
    private Long serverCheckpoint;
    private String status;
}
