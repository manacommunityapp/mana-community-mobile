package com.manacommunity.api.service.controller;

import com.manacommunity.api.service.model.*;
import com.manacommunity.api.service.service.BiometricAccessService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/access/turnstiles")
@RequiredArgsConstructor
public class BiometricAccessController {

    private final BiometricAccessService accessService;

    @GetMapping
    public ResponseEntity<List<Turnstile>> getTurnstiles(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(accessService.getTurnstiles(principal.getCommunityId()));
    }

    @PostMapping("/verify")
    public ResponseEntity<FaceVerificationResult> verifyFace(@RequestBody FaceVerificationRequest request) {
        return ResponseEntity.ok(accessService.verifyFace(request));
    }

    @GetMapping("/access-log")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY')")
    public ResponseEntity<List<AccessLogEntry>> getAccessLog(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(accessService.getAccessLog(principal.getCommunityId(), page, size));
    }

    @GetMapping("/staff-schedules")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY')")
    public ResponseEntity<List<StaffScheduleRule>> getStaffSchedules(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(accessService.getStaffSchedules(principal.getCommunityId()));
    }

    @PutMapping("/staff-schedules/{staffId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StaffScheduleRule> updateStaffSchedule(
            @PathVariable Long staffId,
            @RequestBody StaffScheduleRule rule) {
        return ResponseEntity.ok(accessService.updateStaffSchedule(staffId, rule));
    }

    @PostMapping("/{turnstileId}/override")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SECURITY')")
    public ResponseEntity<Void> overrideTurnstile(
            @PathVariable Long turnstileId,
            @RequestBody TurnstileOverrideRequest request) {
        accessService.overrideTurnstile(turnstileId, request);
        return ResponseEntity.ok().build();
    }
}
