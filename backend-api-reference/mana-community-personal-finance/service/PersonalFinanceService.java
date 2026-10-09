package com.manacommunity.api.personalfinance.service;

import com.manacommunity.api.personalfinance.model.*;
import com.manacommunity.api.personalfinance.repository.*;
import com.manacommunity.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PersonalFinanceService {

    private final PersonalAccountRepository accountRepo;
    private final PersonalTransactionRepository txnRepo;
    private final PersonalCategoryRepository categoryRepo;
    private final PersonalBudgetRepository budgetRepo;
    private final PersonalRecurringRepository recurringRepo;
    private final PersonalBillRepository billRepo;
    private final PersonalInstallmentRepository installmentRepo;
    private final PersonalGoalRepository goalRepo;

    // ── Accounts ──

    public List<PersonalAccount> getAccounts(Long userId) {
        return accountRepo.findByUserIdAndIsActiveTrueOrderByNameAsc(userId);
    }

    @Transactional
    public PersonalAccount createAccount(Long userId, PersonalAccount account) {
        account.setUserId(userId);
        return accountRepo.save(account);
    }

    @Transactional
    public PersonalAccount updateAccount(Long id, PersonalAccount updated) {
        PersonalAccount account = accountRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + id));
        account.setName(updated.getName());
        account.setType(updated.getType());
        account.setBankName(updated.getBankName());
        account.setColor(updated.getColor());
        account.setIcon(updated.getIcon());
        account.setCreditLimit(updated.getCreditLimit());
        return accountRepo.save(account);
    }

    @Transactional
    public void deleteAccount(Long id) {
        PersonalAccount account = accountRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + id));
        account.setIsActive(false);
        accountRepo.save(account);
    }

    // ── Transactions ──

    public Page<PersonalTransaction> getTransactions(Long userId, String type, int page, int size) {
        if (type != null && !type.isEmpty()) {
            return txnRepo.findByUserIdAndTypeOrderByDateDesc(userId, type, PageRequest.of(page, size));
        }
        return txnRepo.findByUserIdOrderByDateDesc(userId, PageRequest.of(page, size));
    }

    @Transactional
    public PersonalTransaction createTransaction(Long userId, PersonalTransaction txn) {
        txn.setUserId(userId);
        if (txn.getDate() == null) txn.setDate(LocalDate.now());
        PersonalTransaction saved = txnRepo.save(txn);
        updateAccountBalance(txn);
        return saved;
    }

    @Transactional
    public void deleteTransaction(Long id) {
        txnRepo.deleteById(id);
    }

    @Transactional
    public void batchImport(Long userId, List<PersonalTransaction> transactions) {
        transactions.forEach(t -> {
            t.setUserId(userId);
            if (t.getDate() == null) t.setDate(LocalDate.now());
        });
        txnRepo.saveAll(transactions);
    }

    private void updateAccountBalance(PersonalTransaction txn) {
        accountRepo.findById(txn.getAccountId()).ifPresent(account -> {
            if ("EXPENSE".equals(txn.getType())) {
                account.setBalance(account.getBalance().subtract(txn.getAmount()));
            } else if ("INCOME".equals(txn.getType())) {
                account.setBalance(account.getBalance().add(txn.getAmount()));
            }
            accountRepo.save(account);
        });
    }

    // ── Categories ──

    public List<PersonalCategory> getCategories(Long userId) {
        return categoryRepo.findByUserIdAndParentIdIsNullOrderByNameAsc(userId);
    }

    @Transactional
    public PersonalCategory createCategory(Long userId, PersonalCategory category) {
        category.setUserId(userId);
        return categoryRepo.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepo.deleteById(id);
    }

    // ── Budgets ──

    public List<PersonalBudget> getBudgets(Long userId, String month) {
        if (month == null) month = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        List<PersonalBudget> budgets = budgetRepo.findByUserIdAndMonthOrderByCategoryNameAsc(userId, month);
        YearMonth ym = YearMonth.parse(month);
        budgets.forEach(b -> {
            BigDecimal spent = txnRepo.sumByCategory(userId, "EXPENSE", b.getCategoryId(), ym.atDay(1), ym.atEndOfMonth());
            b.setSpentAmount(spent);
        });
        return budgets;
    }

    @Transactional
    public PersonalBudget createBudget(Long userId, PersonalBudget budget) {
        budget.setUserId(userId);
        if (budget.getMonth() == null) budget.setMonth(YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        return budgetRepo.save(budget);
    }

    @Transactional
    public PersonalBudget updateBudget(Long id, PersonalBudget updated) {
        PersonalBudget budget = budgetRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + id));
        budget.setLimitAmount(updated.getLimitAmount());
        budget.setAlertThreshold(updated.getAlertThreshold());
        return budgetRepo.save(budget);
    }

    @Transactional
    public void deleteBudget(Long id) {
        budgetRepo.deleteById(id);
    }

    // ── Recurring ──

    public List<PersonalRecurring> getRecurring(Long userId) {
        return recurringRepo.findByUserIdAndIsActiveTrueOrderByNextDueDateAsc(userId);
    }

    @Transactional
    public PersonalRecurring createRecurring(Long userId, PersonalRecurring recurring) {
        recurring.setUserId(userId);
        return recurringRepo.save(recurring);
    }

    @Transactional
    public void deleteRecurring(Long id) {
        recurringRepo.deleteById(id);
    }

    // ── Bills ──

    public List<PersonalBill> getBills(Long userId) {
        return billRepo.findByUserIdOrderByDueDateAsc(userId);
    }

    public List<PersonalBill> getUpcomingBills(Long userId) {
        return billRepo.findByUserIdAndIsPaidFalseOrderByDueDateAsc(userId);
    }

    @Transactional
    public PersonalBill createBill(Long userId, PersonalBill bill) {
        bill.setUserId(userId);
        return billRepo.save(bill);
    }

    @Transactional
    public PersonalBill markBillPaid(Long id) {
        PersonalBill bill = billRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + id));
        bill.setIsPaid(true);
        return billRepo.save(bill);
    }

    @Transactional
    public void deleteBill(Long id) {
        billRepo.deleteById(id);
    }

    // ── Installments ──

    public List<PersonalInstallment> getInstallments(Long userId) {
        return installmentRepo.findByUserIdAndStatusOrderByNextDueDateAsc(userId, "ACTIVE");
    }

    @Transactional
    public PersonalInstallment createInstallment(Long userId, PersonalInstallment inst) {
        inst.setUserId(userId);
        return installmentRepo.save(inst);
    }

    @Transactional
    public void deleteInstallment(Long id) {
        installmentRepo.deleteById(id);
    }

    // ── Goals ──

    public List<PersonalGoal> getGoals(Long userId) {
        return goalRepo.findByUserIdOrderByTargetDateAsc(userId);
    }

    @Transactional
    public PersonalGoal createGoal(Long userId, PersonalGoal goal) {
        goal.setUserId(userId);
        return goalRepo.save(goal);
    }

    @Transactional
    public PersonalGoal contributeToGoal(Long goalId, BigDecimal amount) {
        PersonalGoal goal = goalRepo.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + goalId));
        goal.setCurrentAmount(goal.getCurrentAmount().add(amount));
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setIsCompleted(true);
        }
        return goalRepo.save(goal);
    }

    @Transactional
    public void deleteGoal(Long id) {
        goalRepo.deleteById(id);
    }

    // ── Dashboard ──

    public Map<String, Object> getDashboard(Long userId) {
        YearMonth current = YearMonth.now();
        LocalDate start = current.atDay(1);
        LocalDate end = current.atEndOfMonth();
        BigDecimal income = txnRepo.sumByUserIdAndTypeAndDateBetween(userId, "INCOME", start, end);
        BigDecimal expenses = txnRepo.sumByUserIdAndTypeAndDateBetween(userId, "EXPENSE", start, end);
        BigDecimal net = income.subtract(expenses);
        BigDecimal savingsRate = income.compareTo(BigDecimal.ZERO) > 0
                ? net.multiply(BigDecimal.valueOf(100)).divide(income, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("month", current.toString());
        dashboard.put("totalIncome", income);
        dashboard.put("totalExpenses", expenses);
        dashboard.put("netSavings", net);
        dashboard.put("savingsRate", savingsRate);
        return dashboard;
    }

    // ── Reports ──

    public Map<String, Object> getReport(Long userId, String period) {
        LocalDate start, end;
        if ("quarterly".equals(period)) {
            int q = (LocalDate.now().getMonthValue() - 1) / 3;
            start = LocalDate.now().withMonth(q * 3 + 1).withDayOfMonth(1);
            end = start.plusMonths(3).minusDays(1);
        } else {
            YearMonth ym = YearMonth.now();
            start = ym.atDay(1);
            end = ym.atEndOfMonth();
        }
        BigDecimal income = txnRepo.sumByUserIdAndTypeAndDateBetween(userId, "INCOME", start, end);
        BigDecimal expenses = txnRepo.sumByUserIdAndTypeAndDateBetween(userId, "EXPENSE", start, end);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("period", period);
        report.put("totalIncome", income);
        report.put("totalExpenses", expenses);
        report.put("netSavings", income.subtract(expenses));
        return report;
    }
}
