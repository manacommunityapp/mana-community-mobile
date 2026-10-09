package com.manacommunity.api.homeservices.controller;

import com.manacommunity.api.homeservices.model.*;
import com.manacommunity.api.homeservices.service.HomeServicesV2Service;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/home-services")
@RequiredArgsConstructor
public class HomeServicesV2Controller {

    private final HomeServicesV2Service service;

    // ── Domestic Staff ──

    @GetMapping("/staff")
    public ResponseEntity<List<DomesticStaff>> getMyStaff(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getStaffForUser(principal.getId()));
    }

    @GetMapping("/staff/community")
    public ResponseEntity<List<DomesticStaff>> getCommunityStaff(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getCommunityStaff(principal.getCommunityId()));
    }

    // ── Attendance ──

    @GetMapping("/attendance/today")
    public ResponseEntity<List<StaffAttendance>> getTodayAttendance(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getTodayAttendance(principal.getId()));
    }

    @GetMapping("/attendance/summary")
    public ResponseEntity<Map<String, Object>> getAttendanceSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getAttendanceSummary(principal.getId()));
    }

    @PostMapping("/attendance/mark")
    public ResponseEntity<StaffAttendance> markAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody StaffAttendance attendance) {
        return ResponseEntity.ok(service.markAttendance(principal, attendance));
    }

    // ── Service Packages ──

    @GetMapping("/packages")
    public ResponseEntity<List<ServicePackage>> getMyPackages(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getPackages(principal.getId()));
    }

    @PostMapping("/packages")
    public ResponseEntity<ServicePackage> createPackage(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ServicePackage pkg) {
        return ResponseEntity.ok(service.createPackage(principal, pkg));
    }

    @PatchMapping("/packages/{id}/pay")
    public ResponseEntity<ServicePackage> markSalaryPaid(@PathVariable Long id) {
        return ResponseEntity.ok(service.markSalaryPaid(id));
    }

    // ── Job Board ──

    @GetMapping("/jobs")
    public ResponseEntity<List<StaffJobPost>> getJobPosts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getJobPosts(principal.getCommunityId()));
    }

    @PostMapping("/jobs")
    public ResponseEntity<StaffJobPost> createJobPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody StaffJobPost jobPost) {
        return ResponseEntity.ok(service.createJobPost(principal, jobPost));
    }
}
