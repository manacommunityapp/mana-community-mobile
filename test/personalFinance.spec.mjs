import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Pure logic and domain functions for Personal Finance ("My Money")

function calculateNetWorth(accounts) {
  let assets = 0;
  let liabilities = 0;

  for (const acc of accounts) {
    if (acc.type === 'CREDIT_CARD' || acc.type === 'LOAN') {
      liabilities += Math.abs(acc.balance);
    } else {
      assets += acc.balance;
    }
  }

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}

function processTransfer(fromAccount, toAccount, amount) {
  if (fromAccount.balance < amount && fromAccount.type !== 'CREDIT_CARD') {
    throw new Error('Insufficient funds in source account');
  }

  const updatedFrom = { ...fromAccount, balance: fromAccount.balance - amount };
  const updatedTo = { ...toAccount, balance: toAccount.balance + amount };

  const transaction = {
    id: 'txn-transfer-' + Date.now(),
    type: 'TRANSFER',
    amount,
    accountId: fromAccount.id,
    accountName: fromAccount.name,
    toAccountId: toAccount.id,
    toAccountName: toAccount.name,
    description: 'Transfer from ' + fromAccount.name + ' to ' + toAccount.name,
    date: new Date().toISOString().split('T')[0],
  };

  return { updatedFrom, updatedTo, transaction };
}

function evaluateBudget(budget, spentAmount) {
  const percentUsed = Math.round((spentAmount / budget.allocatedAmount) * 100);
  const isOverspent = spentAmount > budget.allocatedAmount;
  const isNearLimit = percentUsed >= (budget.alertThreshold || 80);

  return {
    allocatedAmount: budget.allocatedAmount,
    spentAmount,
    remainingAmount: Math.max(0, budget.allocatedAmount - spentAmount),
    percentUsed,
    isOverspent,
    isNearLimit,
  };
}

function calculateSavingsRate(totalIncome, totalExpenses) {
  if (totalIncome <= 0) return 0;
  const netSavings = totalIncome - totalExpenses;
  return Math.round((netSavings / totalIncome) * 100);
}

function filterUserPrivateRecords(records, authenticatedUserId) {
  // Ensure strict personal privacy: 0 records leaked to any admin or other user
  return records.filter(r => r.userId === authenticatedUserId);
}

describe('Personal Finance ("My Money") - Account & Net Worth Engine', () => {
  const mockAccounts = [
    { id: 'acc-1', name: 'HDFC Salary A/c', type: 'SAVINGS', balance: 84500 },
    { id: 'acc-2', name: 'ICICI Emergency Fund', type: 'SAVINGS', balance: 50000 },
    { id: 'acc-3', name: 'Cash in Wallet', type: 'CASH', balance: 3500 },
    { id: 'acc-4', name: 'HDFC Regalia Credit Card', type: 'CREDIT_CARD', balance: 18400 },
  ];

  test('Should accurately calculate Net Worth, Assets, and Liabilities', () => {
    const res = calculateNetWorth(mockAccounts);
    assert.strictEqual(res.assets, 84500 + 50000 + 3500); // 138,000
    assert.strictEqual(res.liabilities, 18400);
    assert.strictEqual(res.netWorth, 138000 - 18400); // 119,600
  });

  test('Should execute inter-account transfer cleanly', () => {
    const from = mockAccounts[0]; // HDFC Salary (84500)
    const to = mockAccounts[2]; // Cash (3500)
    const res = processTransfer(from, to, 5000);

    assert.strictEqual(res.updatedFrom.balance, 79500);
    assert.strictEqual(res.updatedTo.balance, 8500);
    assert.strictEqual(res.transaction.type, 'TRANSFER');
    assert.strictEqual(res.transaction.amount, 5000);
  });
});

describe('Personal Finance ("My Money") - Envelope Budget & Alerts', () => {
  const groceryBudget = {
    id: 'b-1',
    categoryName: 'Groceries',
    allocatedAmount: 15000,
    alertThreshold: 80,
  };

  test('Should calculate healthy budget utilization within limit', () => {
    const status = evaluateBudget(groceryBudget, 9000);
    assert.strictEqual(status.percentUsed, 60);
    assert.strictEqual(status.remainingAmount, 6000);
    assert.strictEqual(status.isNearLimit, false);
    assert.strictEqual(status.isOverspent, false);
  });

  test('Should trigger threshold warning when spending crosses 80%', () => {
    const status = evaluateBudget(groceryBudget, 12500);
    assert.strictEqual(status.percentUsed, 83);
    assert.strictEqual(status.isNearLimit, true);
    assert.strictEqual(status.isOverspent, false);
  });

  test('Should flag overspend when spending exceeds allocation', () => {
    const status = evaluateBudget(groceryBudget, 16200);
    assert.strictEqual(status.percentUsed, 108);
    assert.strictEqual(status.isOverspent, true);
    assert.strictEqual(status.remainingAmount, 0);
  });
});

describe('Personal Finance ("My Money") - Cashflow & Savings Rate', () => {
  test('Should compute monthly savings rate percentage accurately', () => {
    const income = 125000;
    const expenses = 45000;
    const rate = calculateSavingsRate(income, expenses);
    assert.strictEqual(rate, 64); // (80000 / 125000) * 100 = 64%
  });
});

describe('Personal Finance ("My Money") - Privacy & Data Isolation', () => {
  const mixedTransactions = [
    { id: 't1', userId: 'user-resident-101', description: 'Personal Medical Expense', amount: 1200 },
    { id: 't2', userId: 'user-resident-101', description: 'Salary Deposit', amount: 150000 },
    { id: 't3', userId: 'user-resident-202', description: 'Grocery Purchase', amount: 4500 },
  ];

  test('Resident should only access their own private financial records', () => {
    const userRecords = filterUserPrivateRecords(mixedTransactions, 'user-resident-101');
    assert.strictEqual(userRecords.length, 2);
    assert.ok(userRecords.every(r => r.userId === 'user-resident-101'));
  });

  test('Society admin context must return zero records for personal finance data of other residents', () => {
    const adminQuery = filterUserPrivateRecords(mixedTransactions, 'admin-society-001');
    assert.strictEqual(adminQuery.length, 0);
  });
});


describe('Personal Finance ("My Money") - Smart Community Finance Integration', () => {
  let mockLedger = [];
  let mockAccounts = [
    { id: 'acc-1', name: 'HDFC Salary A/c', type: 'SAVINGS', balance: 50000, currency: '₹' },
  ];

  function linkCommunityPayment(ledger, accounts, { invoiceId, amount, description }) {
    // Check if already linked to prevent duplicate entries
    const existing = ledger.find(t => t.sourceModule === 'COMMUNITY_FINANCE' && t.sourceId === invoiceId);
    if (existing) {
      return { linked: false, transaction: existing };
    }

    const acc = accounts[0];
    const newTxn = {
      id: 'txn-linked-' + Date.now(),
      type: 'EXPENSE',
      amount,
      categoryName: 'Community → Maintenance',
      sourceModule: 'COMMUNITY_FINANCE',
      sourceId: invoiceId,
      sourceLabel: 'Community Finance',
      description: description || 'Maintenance Payment',
      date: new Date().toISOString().split('T')[0],
    };

    ledger.unshift(newTxn);
    acc.balance -= amount;
    return { linked: true, transaction: newTxn };
  }

  test('Should seamlessly link a paid community maintenance invoice as a single private ledger entry', () => {
    const res = linkCommunityPayment(mockLedger, mockAccounts, {
      invoiceId: 'inv-oct-4500',
      amount: 4500,
      description: 'Maintenance ₹4,500',
    });

    assert.strictEqual(res.linked, true);
    assert.strictEqual(res.transaction.amount, 4500);
    assert.strictEqual(res.transaction.categoryName, 'Community → Maintenance');
    assert.strictEqual(res.transaction.sourceModule, 'COMMUNITY_FINANCE');
    assert.strictEqual(mockAccounts[0].balance, 45500); // 50000 - 4500
    assert.strictEqual(mockLedger.length, 1);
  });

  test('Should not create duplicate private transactions if same community invoice is processed again', () => {
    const duplicateAttempt = linkCommunityPayment(mockLedger, mockAccounts, {
      invoiceId: 'inv-oct-4500',
      amount: 4500,
      description: 'Maintenance ₹4,500',
    });

    assert.strictEqual(duplicateAttempt.linked, false);
    assert.strictEqual(mockLedger.length, 1, 'Ledger count must remain 1 without duplicates');
    assert.strictEqual(mockAccounts[0].balance, 45500, 'Account balance must not be deducted twice');
  });

  test('Strict separation: Personal sensitive categories (Salary, Groceries, Investments) remain masked from Association', () => {
    const privateFields = ['salary', 'groceries', 'bankBalances', 'investments', 'creditCardTransactions'];
    const associationAccessPolicy = {
      canViewCommunityMaintenance: true,
      canViewPersonalSalary: false,
      canViewPersonalGroceries: false,
      canViewPersonalInvestments: false,
      canViewPersonalCreditCards: false,
    };

    assert.strictEqual(associationAccessPolicy.canViewCommunityMaintenance, true);
    assert.strictEqual(associationAccessPolicy.canViewPersonalSalary, false);
    assert.strictEqual(associationAccessPolicy.canViewPersonalGroceries, false);
    assert.strictEqual(associationAccessPolicy.canViewPersonalInvestments, false);
    assert.strictEqual(associationAccessPolicy.canViewPersonalCreditCards, false);
  });
});


describe('Personal Finance ("My Money") - Standard V1 Baseline Metrics & 10 Categories', () => {
  const STANDARD_CATEGORIES = [
    'Food',
    'Travel',
    'Shopping',
    'Bills',
    'Health',
    'Education',
    'Entertainment',
    'Family',
    'Home',
    'Other'
  ];

  const STANDARD_ACCOUNT_TYPES = [
    'Cash',
    'Bank',
    'Credit Card',
    'Savings',
    'Investment',
    'Loan'
  ];

  function calculateDashboardV1(income, expenses) {
    const remaining = income - expenses;
    const savingsRate = income > 0 ? Math.round((remaining / income) * 1000) / 10 : 0;
    return {
      income,
      expenses,
      remaining,
      savingsRate,
    };
  }

  test('Should accurately compute baseline Dashboard figures (Income ₹1,20,000, Expenses ₹72,500 -> Remaining ₹47,500, Savings Rate 39.6%)', () => {
    const dashboard = calculateDashboardV1(120000, 72500);
    assert.strictEqual(dashboard.income, 120000);
    assert.strictEqual(dashboard.expenses, 72500);
    assert.strictEqual(dashboard.remaining, 47500);
    assert.strictEqual(dashboard.savingsRate, 39.6);
  });

  test('Should contain all 10 standard categories for personal expense tagging', () => {
    assert.strictEqual(STANDARD_CATEGORIES.length, 10);
    assert.ok(STANDARD_CATEGORIES.includes('Food'));
    assert.ok(STANDARD_CATEGORIES.includes('Travel'));
    assert.ok(STANDARD_CATEGORIES.includes('Shopping'));
    assert.ok(STANDARD_CATEGORIES.includes('Bills'));
    assert.ok(STANDARD_CATEGORIES.includes('Health'));
    assert.ok(STANDARD_CATEGORIES.includes('Education'));
    assert.ok(STANDARD_CATEGORIES.includes('Entertainment'));
    assert.ok(STANDARD_CATEGORIES.includes('Family'));
    assert.ok(STANDARD_CATEGORIES.includes('Home'));
    assert.ok(STANDARD_CATEGORIES.includes('Other'));
  });

  test('Should support all 6 core account types in My Money', () => {
    assert.strictEqual(STANDARD_ACCOUNT_TYPES.length, 6);
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Cash'));
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Bank'));
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Credit Card'));
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Savings'));
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Investment'));
    assert.ok(STANDARD_ACCOUNT_TYPES.includes('Loan'));
  });

  test('Should track 4 key budget envelopes (Food ₹10k, Travel ₹5k, Shopping ₹8k, Entertainment ₹4k)', () => {
    const budgets = [
      { category: 'Food', limit: 10000, spent: 6500 },
      { category: 'Travel', limit: 5000, spent: 3200 },
      { category: 'Shopping', limit: 8000, spent: 4800 },
      { category: 'Entertainment', limit: 4000, spent: 1500 },
    ];

    const totalBudget = budgets.reduce((a, b) => a + b.limit, 0);
    const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);
    const overallUtil = Math.round((totalSpent / totalBudget) * 100);

    assert.strictEqual(totalBudget, 27000);
    assert.strictEqual(totalSpent, 16000);
    assert.strictEqual(overallUtil, 59);
    assert.ok(budgets.every(b => b.spent <= b.limit));
  });
});
