package com.manacommunity.api.safety.controller;

import com.manacommunity.api.safety.model.*;
import com.manacommunity.api.safety.service.SafetyService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/safety")
@RequiredArgsConstructor
public class SafetyController {

    private final SafetyService safetyService;

    // ── ANPR ──

    @GetMapping("/anpr/events")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY','GUARD')")
    public ResponseEntity<Page<AnprGateEvent>> getAnprEvents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(safetyService.getAnprEvents(principal.getCommunityId(), page, size));
    }

    @GetMapping("/anpr/summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY','GUARD')")
    public ResponseEntity<Map<String, Object>> getAnprSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(safetyService.getAnprSummary(principal.getCommunityId()));
    }

    @GetMapping("/anpr/alerts")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY','GUARD')")
    public ResponseEntity<List<AnprGateEvent>> getAnprAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(safetyService.getAnprAlerts(principal.getCommunityId()));
    }

    @PostMapping("/anpr/override")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY')")
    public ResponseEntity<Void> overrideBarrier(@RequestBody Map<String, Object> body) {
        safetyService.overrideBarrier(body);
        return ResponseEntity.ok().build();
    }

    // ── Patrol ──

    @GetMapping("/patrol/rounds")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY','GUARD')")
    public ResponseEntity<List<PatrolRound>> getPatrolRounds(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(safetyService.getPatrolRounds(principal.getCommunityId()));
    }

    @PostMapping("/patrol/checkpoint")
    @PreAuthorize("hasAnyRole('SECURITY','GUARD')")
    public ResponseEntity<PatrolCheckpoint> scanCheckpoint(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PatrolCheckpoint checkpoint) {
        return ResponseEntity.ok(safetyService.scanCheckpoint(principal, checkpoint));
    }

    // ── Incidents ──

    @GetMapping("/incidents")
    public ResponseEntity<Page<SecurityIncident>> getIncidents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(safetyService.getIncidents(principal.getCommunityId(), page, size));
    }

    @PostMapping("/incidents")
    public ResponseEntity<SecurityIncident> reportIncident(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SecurityIncident incident) {
        return ResponseEntity.ok(safetyService.reportIncident(principal, incident));
    }

    @PatchMapping("/incidents/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY')")
    public ResponseEntity<SecurityIncident> updateIncidentStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(safetyService.updateIncidentStatus(id, body.get("status"), body.get("resolution")));
    }
}
