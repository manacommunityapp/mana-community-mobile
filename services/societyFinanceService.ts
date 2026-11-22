import api from './apiClient';

// ─── DTOs & Interfaces ────────────────────────────────────────────────────────

export type ApprovalStatus = 'PENDING_MAKER' | 'PENDING_CHECKER' | 'PENDING_APPROVER' | 'APPROVED' | 'REJECTED' | 'PAID';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type TdsSection = '194C_CONTRACTOR' | '194J_PROFESSIONAL' | '194I_RENT' | '194H_COMMISSION' | 'NONE';

export interface SocietyDashboardSummaryDto {
  operatingBalance: number;
  sinkingFundBalance: number;
  fixedDepositsBalance: number;
  totalReserves: number;
  totalMonthlyDemand: number;
  totalCollected: number;
  collectionRate: number;
  outstandingReceivables: number;
  pendingPayables: number;
  pendingApprovalsCount: number;
  recentTransactionsCount: number;
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate?: number;
}

export interface SocietyInvoiceDto {
  id: string;
  invoiceNumber: string;
  unitNumber: string;
  residentName: string;
  residentEmail?: string;
  residentPhone?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  notes?: string;
  lineItems: InvoiceLineItem[];
  paymentReference?: string;
  paidAt?: string;
}

export interface CreateSocietyInvoiceDto {
  unitNumber: string;
  residentName: string;
  residentEmail?: string;
  residentPhone?: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
}

export interface SocietyVendorDto {
  id: string;
  vendorName: string;
  category: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  panNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  tdsSection: TdsSection;
  tdsRate: number;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSocietyVendorDto {
  vendorName: string;
  category: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  panNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  tdsSection: TdsSection;
  tdsRate: number;
}

export interface SocietyVendorBillDto {
  id: string;
  vendorId: string;
  vendorName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  grossAmount: number;
  gstAmount: number;
  tdsDeducted: number;
  netPayable: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  receiptUrl?: string;
  description: string;
}

export interface CreateVendorBillDto {
  vendorId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  grossAmount: number;
  gstRate: number;
  tdsRate: number;
  description: string;
  receiptUrl?: string;
}

export interface SocietyExpenseDto {
  id: string;
  voucherNumber: string;
  category: string;
  title: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  vendorId?: string;
  vendorName?: string;
  status: ApprovalStatus;
  makerName: string;
  makerDate: string;
  checkerName?: string;
  checkerDate?: string;
  checkerNotes?: string;
  approverName?: string;
  approverDate?: string;
  approverNotes?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  utrReference?: string;
  createdAt: string;
}

export interface CreateSocietyExpenseDto {
  category: string;
  title: string;
  description: string;
  amount: number;
  accountId: string;
  vendorId?: string;
  receiptUrl?: string;
}

export interface ChartOfAccountDto {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY_RESERVE' | 'INCOME' | 'EXPENSE';
  balance: number;
  description: string;
  isReserveFund: boolean;
}

export interface GeneralLedgerEntryDto {
  id: string;
  entryDate: string;
  voucherNumber: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
}

export interface IncomeExpenseStatementDto {
  financialYear: string;
  period: string;
  totalIncome: number;
  maintenanceCollections: number;
  amenityBookings: number;
  interestEarned: number;
  otherIncome: number;
  totalExpenditure: number;
  securityExpenses: number;
  housekeepingExpenses: number;
  electricityPowerExpenses: number;
  repairsMaintenanceExpenses: number;
  administrativeExpenses: number;
  netSurplusDeficit: number;
}

export interface SocietyBalanceSheetDto {
  asOfDate: string;
  totalAssets: number;
  operatingBankAccounts: number;
  sinkingFundFixedDeposits: number;
  memberMaintenanceReceivables: number;
  securityDepositsWithUtilities: number;
  totalLiabilitiesAndReserves: number;
  sinkingFundReserve: number;
  buildingRepairReserve: number;
  generalReserveSurplus: number;
  vendorPayables: number;
  memberAdvanceCollections: number;
}

export interface GstTaxSummaryDto {
  month: string;
  outwardTaxableSupplies: number;
  cgstCollected: number;
  sgstCollected: number;
  totalGstCollected: number;
  inwardEligibleItc: number;
  cgstItc: number;
  sgstItc: number;
  netGstPayable: number;
  tdsDeductedTotal: number;
}

export interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'NEFT_RTGS' | 'CHEQUE' | 'CASH' | 'BANK_TRANSFER';
  referenceNumber?: string;
  bankAccountId?: string;
  notes?: string;
}

export interface RecordPaymentResponseDto {
  invoice: SocietyInvoiceDto;
  glEntry: GeneralLedgerEntryDto;
}

export type VendorBillStatus = 'DRAFT' | 'RECEIVED' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'DISPUTED';

export interface SocietyVendorBillFullDto {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  billDate: string;
  dueDate: string;
  invoiceReference?: string;
  description: string;
  lineItems: Array<{ description: string; amount: number; gstRate: number }>;
  grossAmount: number;
  gstAmount: number;
  tdsDeducted: number;
  netPayable: number;
  paidAmount: number;
  balanceDue: number;
  status: VendorBillStatus;
  approvedBy?: string;
  approvedAt?: string;
  paymentUtr?: string;
  paymentDate?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  agingDays: number;
  createdAt: string;
}

export interface CreateVendorBillFullDto {
  vendorId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  description: string;
  lineItems: Array<{ description: string; amount: number; gstRate: number }>;
  tdsRate: number;
  receiptUrl?: string;
}

export interface PayVendorBillDto {
  billId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'NEFT_RTGS' | 'CHEQUE' | 'UPI' | 'CASH';
  utrReference: string;
  bankAccountId?: string;
}

// ─── Local Mock Fallbacks ─────────────────────────────────────────────────────

const FALLBACK_SUMMARY: SocietyDashboardSummaryDto = {
  operatingBalance: 0,
  sinkingFundBalance: 0,
  fixedDepositsBalance: 0,
  totalReserves: 0,
  totalMonthlyDemand: 0,
  totalCollected: 0,
  collectionRate: 0,
  outstandingReceivables: 0,
  pendingPayables: 0,
  pendingApprovalsCount: 0,
  recentTransactionsCount: 0,
};

const FALLBACK_INVOICES: SocietyInvoiceDto[] = [];
const FALLBACK_VENDORS: SocietyVendorDto[] = [];
const FALLBACK_EXPENSES: SocietyExpenseDto[] = [];
const FALLBACK_CHART_OF_ACCOUNTS: ChartOfAccountDto[] = [];
const FALLBACK_LEDGER_ENTRIES: GeneralLedgerEntryDto[] = [];
const FALLBACK_VENDOR_BILLS: SocietyVendorBillFullDto[] = [];

async function tryPaths<T>(paths: string[], fallback: () => T): Promise<T> {
  for (const p of paths) {
    try {
      const { data } = await api.get<T>(p);
      return data;
    } catch {
      // try next
    }
  }
  return fallback();
}

// ─── Exported Society Finance Service ─────────────────────────────────────────

export const societyFinanceService = {
  // Summary Hub
  getDashboardSummary: async (): Promise<SocietyDashboardSummaryDto> => {
    return tryPaths<SocietyDashboardSummaryDto>(
      ['/api/finance/dashboard-summary', '/api/v1/finance/dashboard-summary', '/finance/dashboard-summary'],
      () => FALLBACK_SUMMARY,
    );
  },

  // Invoices & Receivables
  getInvoices: async (status?: string): Promise<SocietyInvoiceDto[]> => {
    const qs = status && status !== 'ALL' ? `?status=${status}` : '';
    return tryPaths<SocietyInvoiceDto[]>(
      [`/api/finance/invoices${qs}`, `/api/v1/finance/invoices${qs}`, `/finance/invoices${qs}`],
      () => {
        if (!status || status === 'ALL') return FALLBACK_INVOICES;
        return FALLBACK_INVOICES.filter(i => i.status === status);
      },
    );
  },

  createInvoice: async (dto: CreateSocietyInvoiceDto): Promise<SocietyInvoiceDto> => {
    for (const path of ['/api/finance/invoices', '/api/v1/finance/invoices']) {
      try {
        const { data } = await api.post<SocietyInvoiceDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Invoice creation failed: backend unavailable. The invoice was not recorded.');
  },

  // Vendors & TDS
  getVendors: async (): Promise<SocietyVendorDto[]> => {
    return tryPaths<SocietyVendorDto[]>(
      ['/api/finance/vendors', '/api/v1/finance/vendors', '/finance/vendors'],
      () => FALLBACK_VENDORS,
    );
  },

  createVendor: async (dto: CreateSocietyVendorDto): Promise<SocietyVendorDto> => {
    for (const path of ['/api/finance/vendors', '/api/v1/finance/vendors']) {
      try {
        const { data } = await api.post<SocietyVendorDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Vendor creation failed: backend unavailable. The vendor was not saved.');
  },

  // Expenses & 3-Tier Approvals
  getExpenses: async (status?: ApprovalStatus | 'ALL'): Promise<SocietyExpenseDto[]> => {
    const qs = status && status !== 'ALL' ? `?status=${status}` : '';
    return tryPaths<SocietyExpenseDto[]>(
      [`/api/finance/expenses${qs}`, `/api/v1/finance/expenses${qs}`, `/finance/expenses${qs}`],
      () => {
        if (!status || status === 'ALL') return FALLBACK_EXPENSES;
        return FALLBACK_EXPENSES.filter(e => e.status === status);
      },
    );
  },

  createExpenseVoucher: async (dto: CreateSocietyExpenseDto, _userName: string): Promise<SocietyExpenseDto> => {
    for (const path of ['/api/finance/expenses', '/api/v1/finance/expenses']) {
      try {
        const { data } = await api.post<SocietyExpenseDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Expense voucher creation failed: backend unavailable. The voucher was not recorded.');
  },

  checkerVerifyExpense: async (expenseId: string, _checkerName: string, notes: string): Promise<SocietyExpenseDto> => {
    for (const path of [`/api/finance/expenses/${expenseId}/verify`, `/api/v1/finance/expenses/${expenseId}/verify`]) {
      try {
        const { data } = await api.put<SocietyExpenseDto>(path, { notes });
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Expense verification failed: backend unavailable. The approval was not recorded.');
  },

  approverSignOffExpense: async (expenseId: string, _approverName: string, notes: string): Promise<SocietyExpenseDto> => {
    for (const path of [`/api/finance/expenses/${expenseId}/approve`, `/api/v1/finance/expenses/${expenseId}/approve`]) {
      try {
        const { data } = await api.put<SocietyExpenseDto>(path, { notes });
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Expense sign-off failed: backend unavailable. The approval was not recorded.');
  },

  disburseExpense: async (expenseId: string, utr: string, method: string): Promise<SocietyExpenseDto> => {
    for (const path of [`/api/finance/expenses/${expenseId}/disburse`, `/api/v1/finance/expenses/${expenseId}/disburse`]) {
      try {
        const { data } = await api.put<SocietyExpenseDto>(path, { utr, method });
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Expense disbursement failed: backend unavailable. The payment was not recorded.');
  },

  // Chart of Accounts & General Ledger
  getChartOfAccounts: async (): Promise<ChartOfAccountDto[]> => {
    return tryPaths<ChartOfAccountDto[]>(
      ['/api/finance/chart-of-accounts', '/api/v1/finance/chart-of-accounts'],
      () => FALLBACK_CHART_OF_ACCOUNTS,
    );
  },

  getGeneralLedger: async (): Promise<GeneralLedgerEntryDto[]> => {
    return tryPaths<GeneralLedgerEntryDto[]>(
      ['/api/finance/ledger-entries', '/api/v1/finance/ledger-entries'],
      () => FALLBACK_LEDGER_ENTRIES,
    );
  },

  // AGM Statements & Reports
  getIncomeExpenseStatement: async (year = '2026-2027'): Promise<IncomeExpenseStatementDto> => {
    return tryPaths<IncomeExpenseStatementDto>(
      [`/api/finance/reports/income-expenditure?year=${year}`, `/api/v1/finance/reports/income-expenditure?year=${year}`],
      () => ({
        financialYear: year,
        period: 'Apr 2026 - Oct 2026',
        totalIncome: 14200000,
        maintenanceCollections: 13125000,
        amenityBookings: 650000,
        interestEarned: 425000,
        otherIncome: 0,
        totalExpenditure: 9850000,
        securityExpenses: 3900000,
        housekeepingExpenses: 2400000,
        electricityPowerExpenses: 1850000,
        repairsMaintenanceExpenses: 1100000,
        administrativeExpenses: 600000,
        netSurplusDeficit: 4350000,
      }),
    );
  },

  getBalanceSheet: async (): Promise<SocietyBalanceSheetDto> => {
    return tryPaths<SocietyBalanceSheetDto>(
      ['/api/finance/reports/balance-sheet', '/api/v1/finance/reports/balance-sheet'],
      () => ({
        asOfDate: '2026-10-01',
        totalAssets: 17285000,
        operatingBankAccounts: 2485000,
        sinkingFundFixedDeposits: 8650000,
        memberMaintenanceReceivables: 950000,
        securityDepositsWithUtilities: 5200000,
        totalLiabilitiesAndReserves: 17285000,
        sinkingFundReserve: 8650000,
        buildingRepairReserve: 3500000,
        generalReserveSurplus: 4450000,
        vendorPayables: 245000,
        memberAdvanceCollections: 440000,
      }),
    );
  },

  getGstTaxSummary: async (month = '2026-09'): Promise<GstTaxSummaryDto> => {
    return tryPaths<GstTaxSummaryDto>(
      [`/api/finance/reports/gst-summary?month=${month}`, `/api/v1/finance/reports/gst-summary?month=${month}`],
      () => ({
        month,
        outwardTaxableSupplies: 1250000,
        cgstCollected: 112500,
        sgstCollected: 112500,
        totalGstCollected: 225000,
        inwardEligibleItc: 650000,
        cgstItc: 58500,
        sgstItc: 58500,
        netGstPayable: 108000,
        tdsDeductedTotal: 26000,
      }),
    );
  },

  // ── Record Payment on Invoice (Vyapar-style: auto-posts GL Dr Bank / Cr Receivables) ──
  recordInvoicePayment: async (dto: RecordPaymentDto): Promise<RecordPaymentResponseDto> => {
    for (const path of ['/api/finance/invoices/record-payment', '/api/v1/finance/invoices/record-payment']) {
      try {
        const { data } = await api.post<RecordPaymentResponseDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Payment recording failed: backend unavailable. The payment was not posted to the ledger.');
  },

  // ── Vendor Bills (Payables lifecycle — Vyapar Bills module) ──
  getVendorBills: async (status?: string): Promise<SocietyVendorBillFullDto[]> => {
    const qs = status && status !== 'ALL' ? `?status=${status}` : '';
    return tryPaths<SocietyVendorBillFullDto[]>(
      [`/api/finance/vendor-bills${qs}`, `/api/v1/finance/vendor-bills${qs}`],
      () => {
        if (!status || status === 'ALL') return FALLBACK_VENDOR_BILLS;
        return FALLBACK_VENDOR_BILLS.filter(b => b.status === status);
      },
    );
  },

  createVendorBill: async (dto: CreateVendorBillFullDto): Promise<SocietyVendorBillFullDto> => {
    for (const path of ['/api/finance/vendor-bills', '/api/v1/finance/vendor-bills']) {
      try {
        const { data } = await api.post<SocietyVendorBillFullDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    throw new Error('Vendor bill creation failed: backend unavailable. The bill was not recorded.');
  },

  approveVendorBill: async (billId: string, approverName: string): Promise<SocietyVendorBillFullDto> => {
    for (const path of [`/api/finance/vendor-bills/${billId}/approve`, `/api/v1/finance/vendor-bills/${billId}/approve`]) {
      try {
        const { data } = await api.put<SocietyVendorBillFullDto>(path, { approverName });
        return data;
      } catch {}
    }
    throw new Error('Vendor bill approval failed: backend unavailable. The approval was not recorded.');
  },

  payVendorBill: async (dto: PayVendorBillDto): Promise<SocietyVendorBillFullDto> => {
    for (const path of ['/api/finance/vendor-bills/pay', '/api/v1/finance/vendor-bills/pay']) {
      try {
        const { data } = await api.post<SocietyVendorBillFullDto>(path, dto);
        return data;
      } catch {}
    }
    throw new Error('Vendor bill payment failed: backend unavailable. The payment was not posted to the ledger.');
  },
};
