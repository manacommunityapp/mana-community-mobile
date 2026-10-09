package com.manacommunity.api.service.model;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyncPushRequest {
    private Long societyId;
    private List<ClientMutation> clientMutations;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClientMutation {
        private String clientMutationId;
        private String entityType;
        private String action;
        private String payloadJson;
        private Long clientVectorTimestamp;
    }
}
