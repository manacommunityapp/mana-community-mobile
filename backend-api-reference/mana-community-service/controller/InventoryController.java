package com.manacommunity.api.service.controller;

import com.manacommunity.api.service.model.*;
import com.manacommunity.api.service.service.InventoryService;
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
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/items")
    public ResponseEntity<Page<InventoryItem>> getItems(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(inventoryService.getItems(principal.getCommunityId(), category, status, page, size));
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<InventoryItem> getItemById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getItemById(id));
    }

    @PostMapping("/items")
    public ResponseEntity<InventoryItem> createItem(@RequestBody InventoryItem item) {
        return ResponseEntity.ok(inventoryService.createItem(item));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<InventoryItem> updateItem(@PathVariable Long id, @RequestBody InventoryItem item) {
        return ResponseEntity.ok(inventoryService.updateItem(id, item));
    }

    @PostMapping("/items/{id}/checkout")
    public ResponseEntity<InventoryItem> checkoutItem(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(inventoryService.checkoutItem(id, body.get("borrowedBy"), body.get("borrowedByFlat"), body.get("expectedReturnAt")));
    }

    @PostMapping("/items/{id}/return")
    public ResponseEntity<InventoryItem> returnItem(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.returnItem(id));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(inventoryService.getDashboard(principal.getCommunityId()));
    }

    // ── Procurement ──

    @GetMapping("/purchase-requests")
    public ResponseEntity<List<PurchaseRequest>> getPurchaseRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(inventoryService.getPurchaseRequests(principal.getCommunityId()));
    }

    @PostMapping("/purchase-requests")
    public ResponseEntity<PurchaseRequest> createPurchaseRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PurchaseRequest request) {
        return ResponseEntity.ok(inventoryService.createPurchaseRequest(principal, request));
    }

    @PatchMapping("/purchase-requests/{id}/status")
    public ResponseEntity<PurchaseRequest> updatePurchaseRequestStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(inventoryService.updatePurchaseRequestStatus(id, body.get("status"), body.get("notes")));
    }

    // ── Audit ──

    @PostMapping("/items/{id}/audit")
    public ResponseEntity<InventoryItem> auditItem(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(inventoryService.auditItem(id, body));
    }

    @GetMapping("/audit-report")
    public ResponseEntity<Map<String, Object>> getAuditReport(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(inventoryService.getAuditReport(principal.getCommunityId()));
    }
}
