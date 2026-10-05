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
