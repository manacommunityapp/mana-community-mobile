package com.manacommunity.api.personalfinance.controller;

import com.manacommunity.api.personalfinance.model.*;
import com.manacommunity.api.personalfinance.service.PersonalFinanceService;
import com.manacommunity.common.user.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/personal-finance")
@RequiredArgsConstructor
public class PersonalFinanceController {

    private final PersonalFinanceService financeService;

    // ── Dashboard & Reports ──

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getDashboard(principal.getId()));
    }

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> getReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "monthly") String period) {
        return ResponseEntity.ok(financeService.getReport(principal.getId(), period));
    }

    // ── Accounts ──

    @GetMapping("/accounts")
    public ResponseEntity<List<PersonalAccount>> getAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getAccounts(principal.getId()));
    }

    @PostMapping("/accounts")
    public ResponseEntity<PersonalAccount> createAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalAccount account) {
        return ResponseEntity.ok(financeService.createAccount(principal.getId(), account));
    }

    @PutMapping("/accounts/{id}")
    public ResponseEntity<PersonalAccount> updateAccount(@PathVariable Long id, @RequestBody PersonalAccount account) {
        return ResponseEntity.ok(financeService.updateAccount(id, account));
    }

    @DeleteMapping("/accounts/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long id) {
        financeService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }

    // ── Transactions ──

    @GetMapping("/transactions")
    public ResponseEntity<Page<PersonalTransaction>> getTransactions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(financeService.getTransactions(principal.getId(), type, page, size));
    }

    @PostMapping("/transactions")
    public ResponseEntity<PersonalTransaction> createTransaction(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalTransaction txn) {
        return ResponseEntity.ok(financeService.createTransaction(principal.getId(), txn));
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        financeService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/transactions/batch-import")
    public ResponseEntity<Void> batchImport(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<PersonalTransaction> transactions) {
        financeService.batchImport(principal.getId(), transactions);
        return ResponseEntity.ok().build();
    }

    // ── Categories ──

    @GetMapping("/categories")
    public ResponseEntity<List<PersonalCategory>> getCategories(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getCategories(principal.getId()));
    }

    @PostMapping("/categories")
    public ResponseEntity<PersonalCategory> createCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalCategory category) {
        return ResponseEntity.ok(financeService.createCategory(principal.getId(), category));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        financeService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ── Budgets ──

    @GetMapping("/budgets")
    public ResponseEntity<List<PersonalBudget>> getBudgets(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(financeService.getBudgets(principal.getId(), month));
    }

    @PostMapping("/budgets")
    public ResponseEntity<PersonalBudget> createBudget(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalBudget budget) {
        return ResponseEntity.ok(financeService.createBudget(principal.getId(), budget));
    }

    @PutMapping("/budgets/{id}")
    public ResponseEntity<PersonalBudget> updateBudget(@PathVariable Long id, @RequestBody PersonalBudget budget) {
        return ResponseEntity.ok(financeService.updateBudget(id, budget));
    }

    @DeleteMapping("/budgets/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable Long id) {
        financeService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }

    // ── Recurring ──

    @GetMapping("/recurring")
    public ResponseEntity<List<PersonalRecurring>> getRecurring(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getRecurring(principal.getId()));
    }

    @PostMapping("/recurring")
    public ResponseEntity<PersonalRecurring> createRecurring(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalRecurring recurring) {
        return ResponseEntity.ok(financeService.createRecurring(principal.getId(), recurring));
    }

    @DeleteMapping("/recurring/{id}")
    public ResponseEntity<Void> deleteRecurring(@PathVariable Long id) {
        financeService.deleteRecurring(id);
        return ResponseEntity.noContent().build();
    }

    // ── Bills ──

    @GetMapping("/bills")
    public ResponseEntity<List<PersonalBill>> getBills(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getBills(principal.getId()));
    }

    @GetMapping("/bills/upcoming")
    public ResponseEntity<List<PersonalBill>> getUpcomingBills(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getUpcomingBills(principal.getId()));
    }

    @PostMapping("/bills")
    public ResponseEntity<PersonalBill> createBill(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalBill bill) {
        return ResponseEntity.ok(financeService.createBill(principal.getId(), bill));
    }

    @PatchMapping("/bills/{id}/pay")
    public ResponseEntity<PersonalBill> markBillPaid(@PathVariable Long id) {
        return ResponseEntity.ok(financeService.markBillPaid(id));
    }

    @DeleteMapping("/bills/{id}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long id) {
        financeService.deleteBill(id);
        return ResponseEntity.noContent().build();
    }

    // ── Installments ──

    @GetMapping("/installments")
    public ResponseEntity<List<PersonalInstallment>> getInstallments(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getInstallments(principal.getId()));
    }

    @PostMapping("/installments")
    public ResponseEntity<PersonalInstallment> createInstallment(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalInstallment inst) {
        return ResponseEntity.ok(financeService.createInstallment(principal.getId(), inst));
    }

    @DeleteMapping("/installments/{id}")
    public ResponseEntity<Void> deleteInstallment(@PathVariable Long id) {
        financeService.deleteInstallment(id);
        return ResponseEntity.noContent().build();
    }

    // ── Goals ──

    @GetMapping("/goals")
    public ResponseEntity<List<PersonalGoal>> getGoals(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(financeService.getGoals(principal.getId()));
    }

    @PostMapping("/goals")
    public ResponseEntity<PersonalGoal> createGoal(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PersonalGoal goal) {
        return ResponseEntity.ok(financeService.createGoal(principal.getId(), goal));
    }

    @PostMapping("/goals/{id}/contribute")
    public ResponseEntity<PersonalGoal> contributeToGoal(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> body) {
        return ResponseEntity.ok(financeService.contributeToGoal(id, body.get("amount")));
    }

    @DeleteMapping("/goals/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id) {
        financeService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }
}
