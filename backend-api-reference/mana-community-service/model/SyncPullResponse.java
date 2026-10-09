package com.manacommunity.api.service.model;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyncPullResponse {
    private List<ChangeLogEntry> changes;
    private Long newCheckpoint;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChangeLogEntry {
        private Long changeLogId;
        private String entityType;
        private String action;
        private Long entityId;
        private String payloadJson;
        private Long serverVectorTimestamp;
    }
}
