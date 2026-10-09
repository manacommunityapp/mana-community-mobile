package com.manacommunity.api.finance.controller;

import com.manacommunity.api.finance.model.*;
import com.manacommunity.api.finance.service.SocietyFinanceService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/society-finance")
@RequiredArgsConstructor
public class SocietyFinanceController {

    private final SocietyFinanceService financeService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getDashboard(principal.getCommunityId()));
    }

    // ── Invoices ──

    @GetMapping("/invoices")
    public ResponseEntity<List<SocietyInvoice>> getInvoices(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getInvoices(principal.getCommunityId()));
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<SocietyInvoice> createInvoice(@RequestBody SocietyInvoice invoice) {
        return ResponseEntity.ok(financeService.createInvoice(invoice));
    }

    @PatchMapping("/invoices/{id}/pay")
    public ResponseEntity<SocietyInvoice> payInvoice(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(financeService.payInvoice(id, body.get("paymentReference")));
    }

    // ── Vendors ──

    @GetMapping("/vendors")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<List<SocietyVendor>> getVendors(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getVendors(principal.getCommunityId()));
    }

    @PostMapping("/vendors")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<SocietyVendor> createVendor(@RequestBody SocietyVendor vendor) {
        return ResponseEntity.ok(financeService.createVendor(vendor));
    }

    // ── Expenses ──

    @GetMapping("/expenses")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<List<SocietyExpense>> getExpenses(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getExpenses(principal.getCommunityId()));
    }

    @PostMapping("/expenses")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<SocietyExpense> createExpense(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SocietyExpense expense) {
        return ResponseEntity.ok(financeService.createExpense(principal, expense));
    }

    @PatchMapping("/expenses/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SocietyExpense> approveExpense(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(financeService.approveExpense(id, principal, body.get("action"), body.get("notes")));
    }

    // ── Reports ──

    @GetMapping("/chart-of-accounts")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getChartOfAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getChartOfAccounts(principal.getCommunityId()));
    }

    @GetMapping("/general-ledger")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getGeneralLedger(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(financeService.getGeneralLedger(principal.getCommunityId(), from, to));
    }

    @GetMapping("/income-expense-statement")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<Map<String, Object>> getIncomeExpenseStatement(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getIncomeExpenseStatement(principal.getCommunityId()));
    }

    @GetMapping("/balance-sheet")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<Map<String, Object>> getBalanceSheet(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getBalanceSheet(principal.getCommunityId()));
    }

    @GetMapping("/gst-summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','COMMUNITY_ADMIN')")
    public ResponseEntity<Map<String, Object>> getGstSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(financeService.getGstSummary(principal.getCommunityId(), month));
    }
}
