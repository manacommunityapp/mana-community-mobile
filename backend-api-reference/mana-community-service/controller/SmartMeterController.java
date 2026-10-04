package com.manacommunity.api.service.controller;

import com.manacommunity.api.service.model.SmartMeter;
import com.manacommunity.api.service.model.UtilityConsumption;
import com.manacommunity.api.service.service.SmartMeterService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/iot/meters")
@RequiredArgsConstructor
public class SmartMeterController {

    private final SmartMeterService meterService;

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<List<SmartMeter>> getUnitMeters(@PathVariable Long unitId) {
        return ResponseEntity.ok(meterService.getMetersForUnit(unitId));
    }

    @GetMapping("/unit/{unitId}/consumption")
    public ResponseEntity<UtilityConsumption> getConsumptionSummary(
            @PathVariable Long unitId,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(meterService.getConsumptionSummary(unitId, month));
    }

    @GetMapping("/community")
    public ResponseEntity<List<SmartMeter>> getCommunityMeters(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(meterService.getCommunityMeters(principal.getCommunityId(), type));
    }

    @GetMapping("/{meterId}/history")
    public ResponseEntity<List<Object>> getMeterHistory(
            @PathVariable Long meterId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(meterService.getMeterHistory(meterId, days));
    }

    @PostMapping("/{meterId}/reading")
    public ResponseEntity<SmartMeter> submitReading(
            @PathVariable Long meterId,
            @RequestBody SmartMeter reading) {
        return ResponseEntity.ok(meterService.submitReading(meterId, reading));
    }
}
