
export interface PersonalReceiptDto {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  category: string;
  imageUrl: string;
  ocrExtracted: boolean;
  taxAmount?: number;
  itemsCount?: number;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

import api from './apiClient';
import { secureLog } from '@/security';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type AccountType = 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD' | 'WALLET' | 'CASH' | 'INVESTMENT' | 'LOAN';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface PersonalAccountDto {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  currency: string;
  bankName?: string;
  accountNumber?: string;
  billingDay?: number;
  paymentDueDay?: number;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export interface PersonalCategoryDto {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
  subcategories: PersonalSubcategoryDto[];
}

export interface PersonalSubcategoryDto {
  id: string;
  name: string;
  icon: string;
  parentId: string;
}

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
}


export interface PersonalSpendingCategoryDto {
  key: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface PersonalTransactionDto {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  subcategoryName?: string;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  description: string;
  notes?: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  tags?: string;
  splitDetails?: string;
  date: string;
  isManaProjection: boolean;
  sourceModule?: string;
  sourceType?: string;
  sourceId?: string;
  sourceLabel?: string;
  createdAt: string;
}

export interface CreatePersonalTransactionDto {
  type: TransactionType;
  amount: number;
  categoryId?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  accountId: string;
  toAccountId?: string;
  description: string;
  notes?: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  tags?: string;
  splitDetails?: string;
  date?: string;
}

export interface PersonalBudgetDto {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  period: BudgetPeriod;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  alertThreshold: number;
  month: string;
  isOverspent: boolean;
  expectedPacePercent?: number;
}

export type CreateBudgetDto = Partial<PersonalBudgetDto>;
export type CreateRecurringDto = CreatePersonalRecurringDto;

export interface PersonalRecurringDto {
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  accountId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextDueDate: string;
  isActive: boolean;
}

export interface CreatePersonalRecurringDto {
  name: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  accountId: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextDueDate?: string;
}

export interface PersonalBillDto {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  isPaid: boolean;
  isAutoPay?: boolean;
  reminderDaysBefore: number;
  isManaInvoice?: boolean;
  invoiceId?: string;
}

export interface DashboardSummaryDto {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalCommunitySpending?: number;
  communitySpendingBreakdown?: PersonalSpendingCategoryDto[];
  totalOtherSpending?: number;
  otherSpendingBreakdown?: PersonalSpendingCategoryDto[];
  recentTransactions: PersonalTransactionDto[];
  manaProjections: PersonalTransactionDto[];
  budgetAlerts: PersonalBudgetDto[];
}

export interface TopCategoryDto {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

export interface MonthlyBreakdownDto {
  month: string;
  label: string;
  income: number;
  expenses: number;
}

export interface ReportPeriodDto {
  topIncomeSources?: TopCategoryDto[];
  period: string;
  label: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate?: number;
  previousPeriodExpenses?: number;
  expenseChangePercentage?: number;
  trendInsightText?: string;
  topCategories: TopCategoryDto[];
  monthlyBreakdown: MonthlyBreakdownDto[];
}


export interface FinancialInsightDto {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  potentialSavings?: number;
  category?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface FinancialInsightsSummaryDto {
  healthScore: number;
  healthGrade: string;
  summaryMessage: string;
  monthlyProjectedSavings: number;
  insights: FinancialInsightDto[];
  metrics?: Record<string, any>;
}

// ─── P3 DTOs ─────────────────────────────────────────────────────────────────

export interface PersonalInstallmentDto {
  id: string;
  name: string;
  totalAmount: number;
  monthlyEmi: number;
  interestRate?: number;
  totalTenorMonths: number;
  remainingTenorMonths: number;
  paidAmount: number;
  remainingAmount: number;
  percentPaid: number;
  startDate: string;
  nextDueDate?: string;
  accountId?: string;
  accountName?: string;
  categoryId?: string;
  categoryName?: string;
  isAutoDeduct?: boolean;
  status: string;
}

export interface CreatePersonalInstallmentDto {
  name: string;
  totalAmount: number;
  monthlyEmi: number;
  interestRate?: number;
  totalTenorMonths: number;
  remainingTenorMonths?: number;
  startDate: string;
  nextDueDate?: string;
  accountId?: string;
  categoryId?: string;
  isAutoDeduct?: boolean;
}

export interface PersonalGoalDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentAchieved: number;
  requiredMonthlySavings: number;
  monthsRemaining: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  notes?: string;
  isCompleted: boolean;
}

export interface CreatePersonalGoalDto {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  notes?: string;
}

export interface GoalContributionDto {
  amount: number;
  accountId?: string;
  notes?: string;
}

export interface BatchImportResultDto {
  importedCount: number;
  failedCount: number;
  importedTransactions: PersonalTransactionDto[];
}

// ─── Fallback Data ────────────────────────────────────────────────────────────

const FALLBACK_ACCOUNTS: PersonalAccountDto[] = [
  {
    id: 'acc-1',
    name: 'HDFC Salary Account',
    type: 'SAVINGS',
    balance: 78500,
    currency: '₹',
    bankName: 'HDFC Bank',
    accountNumber: '••••4821',
    color: '#3B82F6',
    icon: 'card-outline',
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'acc-2',
    name: 'ICICI Amazon Pay CC',
    type: 'CREDIT_CARD',
    balance: -18400,
    creditLimit: 150000,
    currency: '₹',
    bankName: 'ICICI Bank',
    accountNumber: '••••9033',
    billingDay: 15,
    paymentDueDay: 5,
    color: '#8B5CF6',
    icon: 'card',
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'acc-3',
    name: 'Cash in Hand',
    type: 'CASH',
    balance: 4200,
    currency: '₹',
    color: '#10B981',
    icon: 'cash-outline',
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'acc-4',
    name: 'Zerodha Mutual Funds',
    type: 'INVESTMENT',
    balance: 9850,
    currency: '₹',
    bankName: 'Zerodha',
    color: '#F59E0B',
    icon: 'trending-up-outline',
    isActive: true,
    createdAt: '2026-01-01',
  },
];

const FALLBACK_CATEGORIES: PersonalCategoryDto[] = [
  {
    id: 'cat-1',
    name: 'Housing & Society',
    icon: 'home-outline',
    color: '#6366F1',
    type: 'EXPENSE',
    subcategories: [
      { id: 'sub-1', name: 'Maintenance Dues', icon: 'business-outline', parentId: 'cat-1' },
      { id: 'sub-2', name: 'Amenity Bookings', icon: 'tennisball-outline', parentId: 'cat-1' },
      { id: 'sub-3', name: 'EV Charging', icon: 'flash-outline', parentId: 'cat-1' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Food & Groceries',
    icon: 'cart-outline',
    color: '#10B981',
    type: 'EXPENSE',
    subcategories: [
      { id: 'sub-4', name: 'Supermarket', icon: 'basket-outline', parentId: 'cat-2' },
      { id: 'sub-5', name: 'Dining Out', icon: 'restaurant-outline', parentId: 'cat-2' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Utilities & Bills',
    icon: 'receipt-outline',
    color: '#F59E0B',
    type: 'EXPENSE',
    subcategories: [
      { id: 'sub-6', name: 'Electricity', icon: 'bulb-outline', parentId: 'cat-3' },
      { id: 'sub-7', name: 'Internet / Wi-Fi', icon: 'wifi-outline', parentId: 'cat-3' },
    ],
  },
  {
    id: 'cat-4',
    name: 'Salary & Professional',
    icon: 'briefcase-outline',
    color: '#3B82F6',
    type: 'INCOME',
    subcategories: [
      { id: 'sub-8', name: 'Base Salary', icon: 'cash-outline', parentId: 'cat-4' },
      { id: 'sub-9', name: 'Freelance & Consulting', icon: 'laptop-outline', parentId: 'cat-4' },
    ],
  },
  {
    id: 'cat-5',
    name: 'Investments & Returns',
    icon: 'trending-up-outline',
    color: '#8B5CF6',
    type: 'INCOME',
    subcategories: [
      { id: 'sub-10', name: 'Dividends', icon: 'pie-chart-outline', parentId: 'cat-5' },
    ],
  },
];

const FALLBACK_TRANSACTIONS: PersonalTransactionDto[] = [
  {
    id: 'txn-1',
    type: 'EXPENSE',
    amount: 3500,
    currency: '₹',
    categoryId: 'cat-1',
    categoryName: 'Housing & Society',
    categoryIcon: 'home-outline',
    categoryColor: '#6366F1',
    subcategoryName: 'Maintenance Dues',
    accountId: 'acc-1',
    accountName: 'HDFC Salary Account',
    description: 'October Maintenance Bill (Flat 402)',
    date: '2026-10-01',
    isManaProjection: true,
    sourceModule: 'COMMUNITY_FINANCE',
    sourceType: 'INVOICE',
    sourceId: 'inv-oct-402',
    sourceLabel: 'Mana Society Invoice #OCT-402',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'txn-2',
    type: 'EXPENSE',
    amount: 1800,
    currency: '₹',
    categoryId: 'cat-2',
    categoryName: 'Food & Groceries',
    categoryIcon: 'cart-outline',
    categoryColor: '#10B981',
    subcategoryName: 'Supermarket',
    accountId: 'acc-2',
    accountName: 'ICICI Amazon Pay CC',
    description: 'Weekly grocery basket — Nature Basket',
    date: '2026-10-02',
    isManaProjection: false,
    createdAt: '2026-10-02T14:30:00Z',
  },
  {
    id: 'txn-3',
    type: 'INCOME',
    amount: 95000,
    currency: '₹',
    categoryId: 'cat-4',
    categoryName: 'Salary & Professional',
    categoryIcon: 'briefcase-outline',
    categoryColor: '#3B82F6',
    subcategoryName: 'Base Salary',
    accountId: 'acc-1',
    accountName: 'HDFC Salary Account',
    description: 'Monthly Salary Credit — Acme Corp',
    date: '2026-10-01',
    isManaProjection: false,
    createdAt: '2026-10-01T09:00:00Z',
  },
];

const FALLBACK_BUDGETS: PersonalBudgetDto[] = [
  {
    id: 'bgt-1',
    categoryId: 'cat-1',
    categoryName: 'Housing & Society',
    categoryIcon: 'home-outline',
    categoryColor: '#6366F1',
    period: 'MONTHLY',
    limitAmount: 5000,
    spentAmount: 3950,
    remainingAmount: 1050,
    percentUsed: 79,
    alertThreshold: 80,
    month: '2026-10',
    isOverspent: false,
    expectedPacePercent: 50,
  },
  {
    id: 'bgt-2',
    categoryId: 'cat-2',
    categoryName: 'Food & Groceries',
    categoryIcon: 'cart-outline',
    categoryColor: '#10B981',
    period: 'MONTHLY',
    limitAmount: 15000,
    spentAmount: 8200,
    remainingAmount: 6800,
    percentUsed: 54,
    alertThreshold: 80,
    month: '2026-10',
    isOverspent: false,
    expectedPacePercent: 50,
  },
];

const FALLBACK_RECURRING: PersonalRecurringDto[] = [
  {
    id: 'rec-1',
    name: 'Society Maintenance',
    type: 'EXPENSE',
    amount: 3500,
    categoryId: 'cat-1',
    accountId: 'acc-1',
    frequency: 'MONTHLY',
    nextDueDate: '2026-11-01',
    isActive: true,
  },
  {
    id: 'rec-2',
    name: 'Broadband / Wi-Fi',
    type: 'EXPENSE',
    amount: 1199,
    categoryId: 'cat-3',
    accountId: 'acc-2',
    frequency: 'MONTHLY',
    nextDueDate: '2026-10-15',
    isActive: true,
  },
];

const FALLBACK_BILLS: PersonalBillDto[] = [
  {
    id: 'bill-1',
    name: 'Society Maintenance (Oct 2026)',
    amount: 3500,
    dueDate: '2026-10-15',
    categoryId: 'cat-1',
    categoryName: 'Housing & Society',
    categoryIcon: 'home-outline',
    categoryColor: '#6366F1',
    isPaid: false,
    reminderDaysBefore: 3,
    isManaInvoice: true,
    invoiceId: 'inv-oct-402',
  },
];

const FALLBACK_INSTALLMENTS: PersonalInstallmentDto[] = [
  {
    id: 'inst-1',
    name: 'Honda City Car Loan',
    totalAmount: 650000,
    monthlyEmi: 14500,
    interestRate: 8.5,
    totalTenorMonths: 48,
    remainingTenorMonths: 18,
    paidAmount: 435000,
    remainingAmount: 261000,
    percentPaid: 62,
    startDate: '2024-04-10',
    nextDueDate: '2026-10-10',
    accountId: 'acc-1',
    accountName: 'HDFC Salary Account',
    categoryId: 'cat-3',
    categoryName: 'Utilities & Bills',
    isAutoDeduct: true,
    status: 'ACTIVE',
  },
  {
    id: 'inst-2',
    name: 'MacBook Pro EMI',
    totalAmount: 180000,
    monthlyEmi: 15000,
    interestRate: 0,
    totalTenorMonths: 12,
    remainingTenorMonths: 3,
    paidAmount: 135000,
    remainingAmount: 45000,
    percentPaid: 75,
    startDate: '2025-11-15',
    nextDueDate: '2026-10-15',
    accountId: 'acc-2',
    accountName: 'ICICI Amazon Pay CC',
    categoryId: 'cat-3',
    categoryName: 'Utilities & Bills',
    isAutoDeduct: true,
    status: 'ACTIVE',
  },
];

const FALLBACK_GOALS: PersonalGoalDto[] = [
  {
    id: 'goal-1',
    name: 'Emergency Fund (6 Months)',
    targetAmount: 300000,
    currentAmount: 215000,
    remainingAmount: 85000,
    percentAchieved: 71,
    requiredMonthlySavings: 14166,
    monthsRemaining: 6,
    targetDate: '2027-04-01',
    icon: 'shield-checkmark',
    color: '#10B981',
    notes: 'Liquid emergency fund stored in savings and liquid mutual funds.',
    isCompleted: false,
  },
  {
    id: 'goal-2',
    name: 'Europe Family Vacation',
    targetAmount: 250000,
    currentAmount: 110000,
    remainingAmount: 140000,
    percentAchieved: 44,
    requiredMonthlySavings: 17500,
    monthsRemaining: 8,
    targetDate: '2027-06-15',
    icon: 'airplane',
    color: '#3B82F6',
    notes: 'Paris & Switzerland 10-day tour.',
    isCompleted: false,
  },
];

const FALLBACK_REPORT: ReportPeriodDto = {
  period: 'this-month',
  label: 'October 2026',
  totalIncome: 97000,
  totalExpenses: 19189,
  netSavings: 77811,
  topCategories: [
    { categoryId: 'cat-2', categoryName: 'Food & Groceries', categoryIcon: 'cart-outline', categoryColor: '#10B981', amount: 8200, percentage: 43 },
    { categoryId: 'cat-1', categoryName: 'Housing & Society', categoryIcon: 'home-outline', categoryColor: '#6366F1', amount: 3950, percentage: 21 },
    { categoryId: 'cat-3', categoryName: 'Utilities & Bills', categoryIcon: 'receipt-outline', categoryColor: '#F59E0B', amount: 2839, percentage: 15 },
  ],
  monthlyBreakdown: [
    { month: '2026-05', label: 'May', income: 92000, expenses: 18500 },
    { month: '2026-06', label: 'Jun', income: 92000, expenses: 21000 },
    { month: '2026-07', label: 'Jul', income: 95000, expenses: 19800 },
    { month: '2026-08', label: 'Aug', income: 95000, expenses: 24000 },
    { month: '2026-09', label: 'Sep', income: 95000, expenses: 18200 },
    { month: '2026-10', label: 'Oct', income: 97000, expenses: 19189 },
  ],
};

let LOCAL_ACCOUNTS = [...FALLBACK_ACCOUNTS];
let LOCAL_TRANSACTIONS = [...FALLBACK_TRANSACTIONS];
let LOCAL_CATEGORIES = [...FALLBACK_CATEGORIES];
let LOCAL_BUDGETS = [...FALLBACK_BUDGETS];
let LOCAL_RECURRING = [...FALLBACK_RECURRING];
let LOCAL_INSTALLMENTS = [...FALLBACK_INSTALLMENTS];
let LOCAL_GOALS = [...FALLBACK_GOALS];

// ─── Service Implementation ──────────────────────────────────────────────────

async function tryPaths<T>(paths: string[], fallback: () => T): Promise<T> {
  for (const path of paths) {
    try {
      const { data } = await api.get<T>(path);
      return data;
    } catch {
      // try next
    }
  }
  return fallback();
}


let MOCK_RECEIPTS: PersonalReceiptDto[] = [
  {
    id: 'rcpt-1',
    merchantName: 'Nature Basket Supermarket',
    amount: 3420,
    date: '2026-10-02',
    category: 'Groceries',
    imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4c29729ff7?w=600&auto=format&fit=crop&q=80',
    ocrExtracted: true,
    taxAmount: 171,
    itemsCount: 14,
    transactionId: 'txn-1',
    notes: 'Monthly staples & organic veggies',
    createdAt: '2026-10-02T16:30:00Z',
  },
  {
    id: 'rcpt-2',
    merchantName: 'BESCOM Electricity Bill',
    amount: 2850,
    date: '2026-09-28',
    category: 'Utilities',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    ocrExtracted: true,
    taxAmount: 0,
    itemsCount: 1,
    transactionId: 'txn-2',
    notes: 'Meter #482910 September bill',
    createdAt: '2026-09-28T10:15:00Z',
  },
  {
    id: 'rcpt-3',
    merchantName: 'Prestige Society Maintenance',
    amount: 4500,
    date: '2026-10-01',
    category: 'Housing',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    ocrExtracted: true,
    taxAmount: 405,
    itemsCount: 1,
    transactionId: 'txn-3',
    notes: 'Flat B-402 October Maintenance',
    createdAt: '2026-10-01T09:00:00Z',
  },
];

export const personalFinanceService = {

  getReceipts: async (): Promise<PersonalReceiptDto[]> => {
    return MOCK_RECEIPTS;
  },

  uploadReceipt: async (receipt: Omit<PersonalReceiptDto, 'id' | 'createdAt'>): Promise<PersonalReceiptDto> => {
    const newReceipt: PersonalReceiptDto = {
      ...receipt,
      id: `rcpt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    MOCK_RECEIPTS.unshift(newReceipt);
    return newReceipt;
  },

  deleteReceipt: async (receiptId: string): Promise<{ success: boolean }> => {
    MOCK_RECEIPTS = MOCK_RECEIPTS.filter(r => r.id !== receiptId);
    return { success: true };
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  getDashboardSummary: async (month?: string): Promise<DashboardSummaryDto> => {
    const q = month ? `?month=${month}` : '';
    return tryPaths<DashboardSummaryDto>(
      [`/api/v1/personal-finance/dashboard${q}`, `/personal-finance/dashboard${q}`],
      () => {
        const income = LOCAL_TRANSACTIONS.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expense = LOCAL_TRANSACTIONS.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const assets = LOCAL_ACCOUNTS.filter(a => a.type !== 'CREDIT_CARD' && a.type !== 'LOAN').reduce((s, a) => s + a.balance, 0);
        const liab = LOCAL_ACCOUNTS.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
        const netSavings = income - expense;
        const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;
        return {
          month: month || '2026-10',
          totalIncome: income || 97000,
          totalExpenses: expense || 19189,
          netSavings: netSavings || 77811,
          savingsRate: savingsRate || 80,
          totalAssets: assets || 92550,
          totalLiabilities: liab || 18400,
          netWorth: (assets - liab) || 74150,
          recentTransactions: LOCAL_TRANSACTIONS.slice(0, 5),
          manaProjections: LOCAL_TRANSACTIONS.filter(t => t.isManaProjection),
          budgetAlerts: LOCAL_BUDGETS.filter(b => b.percentUsed >= b.alertThreshold),
        };
      },
    );
  },

  // ── Accounts ────────────────────────────────────────────────────────────────
  getAccounts: async (): Promise<PersonalAccountDto[]> => {
    return tryPaths<PersonalAccountDto[]>(
      ['/api/v1/personal-finance/accounts', '/personal-finance/accounts'],
      () => LOCAL_ACCOUNTS,
    );
  },

  createAccount: async (dto: Partial<PersonalAccountDto>): Promise<PersonalAccountDto> => {
    for (const path of ['/api/v1/personal-finance/accounts', '/personal-finance/accounts']) {
      try {
        const { data } = await api.post<PersonalAccountDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const newAcc: PersonalAccountDto = {
      id: `acc-${Date.now()}`,
      name: dto.name || 'New Account',
      type: dto.type || 'SAVINGS',
      balance: dto.balance ?? 0,
      currency: dto.currency || '₹',
      bankName: dto.bankName,
      billingDay: dto.billingDay,
      paymentDueDay: dto.paymentDueDay,
      color: dto.color || '#3B82F6',
      icon: dto.icon || 'wallet-outline',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    LOCAL_ACCOUNTS.push(newAcc);
    return newAcc;
  },

  // ── Categories ──────────────────────────────────────────────────────────────
  getCategories: async (): Promise<PersonalCategoryDto[]> => {
    return tryPaths<PersonalCategoryDto[]>(
      ['/api/v1/personal-finance/categories', '/personal-finance/categories'],
      () => LOCAL_CATEGORIES,
    );
  },

  createCategory: async (dto: CreateCategoryDto): Promise<PersonalCategoryDto> => {
    for (const path of ['/api/v1/personal-finance/categories', '/personal-finance/categories']) {
      try {
        const { data } = await api.post<PersonalCategoryDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const newCat: PersonalCategoryDto = {
      id: `cat-${Date.now()}`,
      name: dto.name,
      icon: dto.icon || 'pricetag-outline',
      color: dto.color || '#64748B',
      type: dto.type,
      subcategories: [],
    };
    LOCAL_CATEGORIES.push(newCat);
    return newCat;
  },

  // ── Transactions ────────────────────────────────────────────────────────────
  getTransactions: async (params?: {
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    from?: string;
    to?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<PersonalTransactionDto[]> => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.accountId) query.set('accountId', params.accountId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';

    return tryPaths<PersonalTransactionDto[]>(
      [`/api/v1/personal-finance/transactions${qs}`, `/personal-finance/transactions${qs}`],
      () => {
        let list = [...LOCAL_TRANSACTIONS];
        if (params?.type) list = list.filter(t => t.type === params.type);
        if (params?.categoryId) list = list.filter(t => t.categoryId === params.categoryId);
        if (params?.accountId) list = list.filter(t => t.accountId === params.accountId || t.toAccountId === params.accountId);
        if (params?.tag) list = list.filter(t => t.tags && t.tags.toLowerCase().includes(params.tag!.toLowerCase()));
        return list;
      },
    );
  },

  createTransaction: async (dto: CreatePersonalTransactionDto): Promise<PersonalTransactionDto> => {
    for (const path of ['/api/v1/personal-finance/transactions', '/personal-finance/transactions']) {
      try {
        const { data } = await api.post<PersonalTransactionDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const cat = LOCAL_CATEGORIES.find(c => c.id === dto.categoryId);
    const acc = LOCAL_ACCOUNTS.find(a => a.id === dto.accountId);
    const toAcc = dto.toAccountId ? LOCAL_ACCOUNTS.find(a => a.id === dto.toAccountId) : undefined;
    const newTxn: PersonalTransactionDto = {
      id: `txn-${Date.now()}`,
      type: dto.type,
      amount: dto.amount,
      currency: acc?.currency || '₹',
      categoryId: dto.categoryId || 'cat-gen',
      categoryName: cat?.name || 'General',
      categoryIcon: cat?.icon || 'receipt-outline',
      categoryColor: cat?.color || '#64748B',
      accountId: dto.accountId,
      accountName: acc?.name || 'Account',
      toAccountId: dto.toAccountId,
      toAccountName: toAcc?.name,
      description: dto.description,
      notes: dto.notes,
      receiptUrl: dto.receiptUrl,
      receiptUrls: dto.receiptUrls,
      tags: dto.tags,
      splitDetails: dto.splitDetails,
      date: dto.date || new Date().toISOString().split('T')[0],
      isManaProjection: false,
      createdAt: new Date().toISOString(),
    };

    if (acc) {
      if (dto.type === 'INCOME') acc.balance += dto.amount;
      else if (dto.type === 'EXPENSE') acc.balance -= dto.amount;
      else if (dto.type === 'TRANSFER' && toAcc) {
        acc.balance -= dto.amount;
        toAcc.balance += dto.amount;
      }
    }

    LOCAL_TRANSACTIONS.unshift(newTxn);
    return newTxn;
  },

  parseNaturalLanguageText: async (text: string): Promise<CreatePersonalTransactionDto> => {
    for (const path of ['/api/v1/personal-finance/transactions/parse-text', '/personal-finance/transactions/parse-text']) {
      try {
        const { data } = await api.post<CreatePersonalTransactionDto>(path, { text });
        return data;
      } catch {
        // try next
      }
    }
    // Fallback client-side parsing
    const lower = text.toLowerCase();
    let type: TransactionType = 'EXPENSE';
    if (lower.includes('income') || lower.includes('salary') || lower.includes('received') || lower.includes('credit')) {
      type = 'INCOME';
    } else if (lower.includes('transfer') || lower.includes('moved to')) {
      type = 'TRANSFER';
    }
    const match = text.match(/(?:₹|rs|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    const amount = match ? parseFloat(match[1]) : 0;
    let categoryId = 'cat-2';
    if (lower.includes('coffee') || lower.includes('starbucks') || lower.includes('food') || lower.includes('swiggy') || lower.includes('zomato')) {
      categoryId = 'cat-2';
    } else if (lower.includes('maintenance') || lower.includes('rent') || lower.includes('flat')) {
      categoryId = 'cat-1';
    } else if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('uber') || lower.includes('bill')) {
      categoryId = 'cat-3';
    } else if (lower.includes('salary')) {
      categoryId = 'cat-4';
    }
    return {
      type,
      amount,
      description: text,
      categoryId,
      accountId: 'acc-1',
      date: new Date().toISOString().split('T')[0],
    };
  },

  batchImportTransactions: async (transactions: CreatePersonalTransactionDto[]): Promise<BatchImportResultDto> => {
    for (const path of ['/api/v1/personal-finance/transactions/batch-import', '/personal-finance/transactions/batch-import']) {
      try {
        const { data } = await api.post<BatchImportResultDto>(path, { transactions });
        return data;
      } catch {
        // try next
      }
    }
    const imported: PersonalTransactionDto[] = [];
    for (const txn of transactions) {
      const res = await personalFinanceService.createTransaction(txn);
      imported.push(res);
    }
    return {
      importedCount: imported.length,
      failedCount: 0,
      importedTransactions: imported,
    };
  },

  deleteTransaction: async (id: string): Promise<void> => {
    for (const path of [`/api/v1/personal-finance/transactions/${id}`, `/personal-finance/transactions/${id}`]) {
      try {
        await api.delete(path);
        return;
      } catch {
        // try next
      }
    }
    LOCAL_TRANSACTIONS = LOCAL_TRANSACTIONS.filter(t => t.id !== id);
  },

  // ── Budgets ─────────────────────────────────────────────────────────────────
  getBudgets: async (month?: string): Promise<PersonalBudgetDto[]> => {
    const q = month ? `?month=${month}` : '';
    return tryPaths<PersonalBudgetDto[]>(
      [`/api/v1/personal-finance/budgets${q}`, `/personal-finance/budgets${q}`],
      () => LOCAL_BUDGETS,
    );
  },

  createBudget: async (dto: Partial<PersonalBudgetDto>): Promise<PersonalBudgetDto> => {
    for (const path of ['/api/v1/personal-finance/budgets', '/personal-finance/budgets']) {
      try {
        const { data } = await api.post<PersonalBudgetDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const cat = LOCAL_CATEGORIES.find(c => c.id === dto.categoryId);
    const newBgt: PersonalBudgetDto = {
      id: `bgt-${Date.now()}`,
      categoryId: dto.categoryId || 'cat-1',
      categoryName: cat?.name || 'Category',
      categoryIcon: cat?.icon || 'pie-chart-outline',
      categoryColor: cat?.color || '#3B82F6',
      period: dto.period || 'MONTHLY',
      limitAmount: dto.limitAmount || 5000,
      spentAmount: 0,
      remainingAmount: dto.limitAmount || 5000,
      percentUsed: 0,
      alertThreshold: dto.alertThreshold || 80,
      month: dto.month || '2026-10',
      isOverspent: false,
      expectedPacePercent: 50,
    };
    LOCAL_BUDGETS.push(newBgt);
    return newBgt;
  },

  // ── Recurring ───────────────────────────────────────────────────────────────
  getRecurringTransactions: async (): Promise<PersonalRecurringDto[]> => {
    return personalFinanceService.getRecurring();
  },
  getRecurring: async (): Promise<PersonalRecurringDto[]> => {
    return tryPaths<PersonalRecurringDto[]>(
      ['/api/v1/personal-finance/recurring', '/personal-finance/recurring'],
      () => LOCAL_RECURRING,
    );
  },

  createRecurring: async (dto: CreatePersonalRecurringDto): Promise<PersonalRecurringDto> => {
    for (const path of ['/api/v1/personal-finance/recurring', '/personal-finance/recurring']) {
      try {
        const { data } = await api.post<PersonalRecurringDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const newRec: PersonalRecurringDto = {
      id: `rec-${Date.now()}`,
      name: dto.name,
      type: dto.type,
      amount: dto.amount,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      frequency: dto.frequency || 'MONTHLY',
      nextDueDate: dto.nextDueDate || '2026-11-01',
      isActive: true,
    };
    LOCAL_RECURRING.push(newRec);
    return newRec;
  },

  toggleRecurring: async (id: string): Promise<PersonalRecurringDto | void> => {
    for (const path of [`/api/v1/personal-finance/recurring/${id}/toggle`, `/personal-finance/recurring/${id}/toggle`]) {
      try {
        const { data } = await api.post<PersonalRecurringDto>(path, {});
        return data;
      } catch {
        // try next
      }
    }
    const item = LOCAL_RECURRING.find(r => r.id === id);
    if (item) item.isActive = !item.isActive;
  },

  processDueRecurring: async (): Promise<{ processedCount: number }> => {
    for (const path of ['/api/v1/personal-finance/recurring/process-due', '/personal-finance/recurring/process-due']) {
      try {
        const { data } = await api.post<{ processedCount: number }>(path, {});
        return data;
      } catch {
        // try next
      }
    }
    return { processedCount: 0 };
  },

  // ── Bills ───────────────────────────────────────────────────────────────────
  createBill: async (bill: any): Promise<PersonalBillDto> => {
    return {
      id: 'bill-' + Date.now(),
      name: bill.name || bill.billerName || bill.title || 'New Bill',
      amount: bill.amount || 0,
      dueDate: bill.dueDate || new Date().toISOString(),
      categoryName: bill.category || bill.categoryName || 'Utilities',
      categoryIcon: bill.categoryIcon || 'receipt-outline',
      isPaid: false,
      isAutoPay: bill.isAutoPay || false,
      reminderDaysBefore: bill.reminderDaysBefore || 3,
    };
  },
  getBills: async (): Promise<PersonalBillDto[]> => {
    return tryPaths<PersonalBillDto[]>(
      ['/api/v1/personal-finance/bills', '/personal-finance/bills'],
      () => FALLBACK_BILLS,
    );
  },

  markBillPaid: async (id: string): Promise<void> => {
    for (const path of [`/api/v1/personal-finance/bills/${id}/mark-paid`, `/personal-finance/bills/${id}/mark-paid`]) {
      try {
        await api.post(path, {});
        return;
      } catch {
        // try next
      }
    }
    secureLog.warn('[personalFinanceService] markBillPaid: offline, bill not updated on server');
  },

  // ── Installments & Loans (P3) ───────────────────────────────────────────────
  getInstallments: async (): Promise<PersonalInstallmentDto[]> => {
    return tryPaths<PersonalInstallmentDto[]>(
      ['/api/v1/personal-finance/installments', '/personal-finance/installments'],
      () => LOCAL_INSTALLMENTS,
    );
  },

  createInstallment: async (dto: CreatePersonalInstallmentDto): Promise<PersonalInstallmentDto> => {
    for (const path of ['/api/v1/personal-finance/installments', '/personal-finance/installments']) {
      try {
        const { data } = await api.post<PersonalInstallmentDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const paidTenors = 0;
    const remainingTenors = dto.totalTenorMonths;
    const acc = LOCAL_ACCOUNTS.find(a => a.id === dto.accountId);
    const newInst: PersonalInstallmentDto = {
      id: `inst-${Date.now()}`,
      name: dto.name,
      totalAmount: dto.totalAmount,
      monthlyEmi: dto.monthlyEmi,
      interestRate: dto.interestRate,
      totalTenorMonths: dto.totalTenorMonths,
      remainingTenorMonths: remainingTenors,
      paidAmount: 0,
      remainingAmount: dto.totalAmount,
      percentPaid: 0,
      startDate: dto.startDate,
      nextDueDate: dto.nextDueDate || '2026-11-10',
      accountId: dto.accountId,
      accountName: acc?.name,
      isAutoDeduct: dto.isAutoDeduct ?? true,
      status: 'ACTIVE',
    };
    LOCAL_INSTALLMENTS.push(newInst);
    return newInst;
  },

  payInstallment: async (id: string, amount?: number, accountId?: string): Promise<PersonalInstallmentDto> => {
    for (const path of [`/api/v1/personal-finance/installments/${id}/pay`, `/personal-finance/installments/${id}/pay`]) {
      try {
        const { data } = await api.post<PersonalInstallmentDto>(path, { amount, accountId });
        return data;
      } catch {
        // try next
      }
    }
    const inst = LOCAL_INSTALLMENTS.find(i => i.id === id);
    if (inst && inst.remainingTenorMonths > 0) {
      inst.remainingTenorMonths -= 1;
      inst.paidAmount += (amount || inst.monthlyEmi);
      inst.remainingAmount = Math.max(0, inst.totalAmount - inst.paidAmount);
      inst.percentPaid = Math.round(((inst.totalTenorMonths - inst.remainingTenorMonths) / inst.totalTenorMonths) * 100);
      if (inst.remainingTenorMonths === 0) inst.status = 'COMPLETED';
    }
    return inst!;
  },

  deleteInstallment: async (id: string): Promise<void> => {
    for (const path of [`/api/v1/personal-finance/installments/${id}`, `/personal-finance/installments/${id}`]) {
      try {
        await api.delete(path);
        return;
      } catch {
        // try next
      }
    }
    LOCAL_INSTALLMENTS = LOCAL_INSTALLMENTS.filter(i => i.id !== id);
  },

  // ── Savings Goals (P3) ──────────────────────────────────────────────────────
  getGoals: async (): Promise<PersonalGoalDto[]> => {
    return tryPaths<PersonalGoalDto[]>(
      ['/api/v1/personal-finance/goals', '/personal-finance/goals'],
      () => LOCAL_GOALS,
    );
  },

  createGoal: async (dto: CreatePersonalGoalDto): Promise<PersonalGoalDto> => {
    for (const path of ['/api/v1/personal-finance/goals', '/personal-finance/goals']) {
      try {
        const { data } = await api.post<PersonalGoalDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const current = dto.currentAmount || 0;
    const remaining = Math.max(0, dto.targetAmount - current);
    const newGoal: PersonalGoalDto = {
      id: `goal-${Date.now()}`,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currentAmount: current,
      remainingAmount: remaining,
      percentAchieved: Math.round((current / dto.targetAmount) * 100),
      requiredMonthlySavings: Math.round(remaining / 6),
      monthsRemaining: 6,
      targetDate: dto.targetDate || '2027-04-01',
      icon: dto.icon || 'flag',
      color: dto.color || '#10B981',
      notes: dto.notes,
      isCompleted: current >= dto.targetAmount,
    };
    LOCAL_GOALS.push(newGoal);
    return newGoal;
  },

  contributeToGoal: async (id: string, dto: GoalContributionDto): Promise<PersonalGoalDto> => {
    for (const path of [`/api/v1/personal-finance/goals/${id}/contribute`, `/personal-finance/goals/${id}/contribute`]) {
      try {
        const { data } = await api.post<PersonalGoalDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const goal = LOCAL_GOALS.find(g => g.id === id);
    if (goal) {
      goal.currentAmount += dto.amount;
      goal.remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      goal.percentAchieved = Math.round((goal.currentAmount / goal.targetAmount) * 100);
      if (goal.currentAmount >= goal.targetAmount) goal.isCompleted = true;
    }
    return goal!;
  },

  deleteGoal: async (id: string): Promise<void> => {
    for (const path of [`/api/v1/personal-finance/goals/${id}`, `/personal-finance/goals/${id}`]) {
      try {
        await api.delete(path);
        return;
      } catch {
        // try next
      }
    }
    LOCAL_GOALS = LOCAL_GOALS.filter(g => g.id !== id);
  },

  // ── Reports ─────────────────────────────────────────────────────────────────
  getReport: async (period: string): Promise<ReportPeriodDto> => {
    return tryPaths<ReportPeriodDto>(
      [`/api/v1/personal-finance/reports?period=${period}`, `/personal-finance/reports?period=${period}`],
      () => ({ ...FALLBACK_REPORT, period, label: period }),
    );
  },

  // ── Community Finance Integration (Smart Linking) ──────────────────────────
  linkCommunityFinanceTransaction: async (params: {
    communityInvoiceId: string;
    amount: number;
    description?: string;
    paidDate?: string;
    accountId?: string;
  }): Promise<PersonalTransactionDto> => {
    const existing = LOCAL_TRANSACTIONS.find(
      t => t.sourceModule === 'COMMUNITY_FINANCE' && t.sourceId === params.communityInvoiceId
    );
    if (existing) {
      return existing; // Avoid duplicate transactions
    }

    const housingCat = LOCAL_CATEGORIES.find(c => c.name.includes('Housing')) || LOCAL_CATEGORIES[0];
    const acc = LOCAL_ACCOUNTS.find(a => a.id === params.accountId) || LOCAL_ACCOUNTS[0];

    const linkedTxn: PersonalTransactionDto = {
      id: `txn-link-${Date.now()}`,
      type: 'EXPENSE',
      amount: params.amount,
      currency: acc.currency || '₹',
      categoryId: housingCat.id,
      categoryName: housingCat.name,
      categoryIcon: housingCat.icon,
      categoryColor: housingCat.color,
      subcategoryName: 'Maintenance Dues',
      accountId: acc.id,
      accountName: acc.name,
      description: params.description || `Community Maintenance - Invoice #${params.communityInvoiceId}`,
      date: params.paidDate || new Date().toISOString().split('T')[0],
      isManaProjection: true,
      sourceModule: 'COMMUNITY_FINANCE',
      sourceType: 'INVOICE',
      sourceId: params.communityInvoiceId,
      sourceLabel: `Mana Community Finance (Invoice #${params.communityInvoiceId})`,
      createdAt: new Date().toISOString(),
    };

    LOCAL_TRANSACTIONS.unshift(linkedTxn);
    if (acc) {
      acc.balance -= params.amount;
    }
    return linkedTxn;
  },

  // ── Mana Projections ────────────────────────────────────────────────────────
  getManaProjections: async (): Promise<PersonalTransactionDto[]> => {
    const live = await tryPaths<PersonalTransactionDto[]>(
      ['/api/v1/personal-finance/mana-projections', '/personal-finance/mana-projections'],
      () => [],
    );
    if (live.length > 0) return live;
    return LOCAL_TRANSACTIONS.filter(t => t.isManaProjection);
  },

  // ── Financial Insights ──────────────────────────────────────────────────────
  getFinancialInsights: async (): Promise<FinancialInsightsSummaryDto> => {
    return tryPaths<FinancialInsightsSummaryDto>(
      ['/api/v1/personal-finance/insights', '/personal-finance/insights'],
      () => ({
        healthScore: 82,
        healthGrade: 'A',
        summaryMessage: 'Your financial health index is 82/100 (A). Solid savings habit maintained this month.',
        monthlyProjectedSavings: 2400,
        insights: [
          {
            id: 'ins-save-good',
            type: 'HEALTH_SCORE',
            title: 'High Savings Rate (42%)',
            description: 'You are saving more than 30% of your income this month. Excellent financial cushion!',
            severity: 'SUCCESS',
            potentialSavings: 38000,
            category: 'Savings',
            actionLabel: 'View Goals',
            actionRoute: '/personal-finance/goals',
          },
          {
            id: 'ins-comm-group',
            type: 'SAVINGS_OPPORTUNITY',
            title: 'Save ~₹1,800 with Community Group Buying',
            description: 'Your grocery spend is eligible for 20-30% volume discounts via Society Group Buying.',
            severity: 'INFO',
            potentialSavings: 1800,
            category: 'Food & Groceries',
            actionLabel: 'Explore Group Deals',
            actionRoute: '/group-buying',
          }
        ],
        metrics: {
          savingsRate: 42,
          monthlyIncome: 97000,
          monthlyExpense: 19189,
          netSavings: 77811,
          activeBudgetsCount: 2,
        }
      })
    );
  },

};
