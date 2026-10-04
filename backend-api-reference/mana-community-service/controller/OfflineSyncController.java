package com.manacommunity.api.service.controller;

import com.manacommunity.api.service.model.SyncPullResponse;
import com.manacommunity.api.service.model.SyncPushRequest;
import com.manacommunity.api.service.model.SyncPushResponse;
import com.manacommunity.api.service.service.OfflineSyncService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class OfflineSyncController {

    private final OfflineSyncService syncService;

    @PostMapping("/push")
    public ResponseEntity<SyncPushResponse> pushMutations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SyncPushRequest request) {
        return ResponseEntity.ok(syncService.pushMutations(principal.getId(), request));
    }

    @GetMapping("/pull")
    public ResponseEntity<SyncPullResponse> pullChanges(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long sinceCheckpoint,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(syncService.pullChanges(principal.getCommunityId(), sinceCheckpoint, limit));
    }
}
