import api from './apiClient';
import { secureLog } from '@/security';

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

// ─── Local Mock Fallbacks ─────────────────────────────────────────────────────

const FALLBACK_SUMMARY: SocietyDashboardSummaryDto = {
  operatingBalance: 2485000,
  sinkingFundBalance: 8650000,
  fixedDepositsBalance: 5200000,
  totalReserves: 16335000,
  totalMonthlyDemand: 1250000,
  totalCollected: 1112500,
  collectionRate: 89,
  outstandingReceivables: 137500,
  pendingPayables: 245000,
  pendingApprovalsCount: 3,
  recentTransactionsCount: 28,
};

const FALLBACK_INVOICES: SocietyInvoiceDto[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'INV-2026-10-001',
    unitNumber: 'A-402',
    residentName: 'Rajesh Sharma',
    residentEmail: 'rajesh.sharma@example.com',
    residentPhone: '+91 98765 43210',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    subtotal: 5500,
    taxAmount: 990,
    discountAmount: 0,
    totalAmount: 6490,
    paidAmount: 6490,
    balanceDue: 0,
    status: 'PAID',
    lineItems: [
      { description: 'Monthly Maintenance Fee (Oct 2026)', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Sinking Fund Contribution', quantity: 1, rate: 1000, amount: 1000 },
    ],
    paidAt: '2026-10-03',
    paymentReference: 'UPI-HDFC-992381',
  },
  {
    id: 'inv-102',
    invoiceNumber: 'INV-2026-10-002',
    unitNumber: 'B-1104',
    residentName: 'Anita Desai',
    residentEmail: 'anita.d@example.com',
    residentPhone: '+91 98220 11223',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    subtotal: 7200,
    taxAmount: 1296,
    discountAmount: 0,
    totalAmount: 8496,
    paidAmount: 0,
    balanceDue: 8496,
    status: 'SENT',
    lineItems: [
      { description: 'Monthly Maintenance Fee (Oct 2026)', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Sinking Fund Contribution', quantity: 1, rate: 1000, amount: 1000 },
      { description: 'Clubhouse Banquet Hall Booking', quantity: 1, rate: 1700, amount: 1700 },
    ],
  },
  {
    id: 'inv-103',
    invoiceNumber: 'INV-2026-09-089',
    unitNumber: 'C-201',
    residentName: 'Suresh Kumar',
    residentEmail: 'suresh.k@example.com',
    residentPhone: '+91 97110 55443',
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    subtotal: 5500,
    taxAmount: 990,
    discountAmount: 0,
    totalAmount: 6490,
    paidAmount: 0,
    balanceDue: 6490,
    status: 'OVERDUE',
    lineItems: [
      { description: 'Monthly Maintenance Fee (Sep 2026)', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Sinking Fund Contribution', quantity: 1, rate: 1000, amount: 1000 },
    ],
  },
];

const FALLBACK_VENDORS: SocietyVendorDto[] = [
  {
    id: 'ven-1',
    vendorName: 'Apex Security & Guarding Services LLP',
    category: 'Security Services',
    contactPerson: 'Vikram Rawat',
    phone: '+91 98111 22334',
    email: 'accounts@apexsecurity.in',
    gstin: '27AAACA1234F1Z5',
    panNumber: 'AAACA1234F',
    bankName: 'HDFC Bank',
    accountNumber: '50200012883391',
    ifscCode: 'HDFC0000128',
    tdsSection: '194C_CONTRACTOR',
    tdsRate: 2,
    totalBilled: 1450000,
    totalPaid: 1320000,
    outstandingBalance: 130000,
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ven-2',
    vendorName: 'CleanGreen Facility Management Pvt Ltd',
    category: 'Housekeeping & Waste',
    contactPerson: 'Manish Joshi',
    phone: '+91 98444 88776',
    email: 'billing@cleangreen.co.in',
    gstin: '27AABCC9876E1Z2',
    panNumber: 'AABCC9876E',
    bankName: 'ICICI Bank',
    accountNumber: '001105029381',
    ifscCode: 'ICIC0000011',
    tdsSection: '194C_CONTRACTOR',
    tdsRate: 2,
    totalBilled: 890000,
    totalPaid: 810000,
    outstandingBalance: 80000,
    isActive: true,
    createdAt: '2025-06-15',
  },
  {
    id: 'ven-3',
    vendorName: 'Schindler Elevators India Pvt Ltd',
    category: 'Lift & Escalator AMC',
    contactPerson: 'Pooja Nair',
    phone: '+91 99887 66554',
    email: 'service.mumbai@schindler.com',
    gstin: '27AAACS4321A1Z9',
    panNumber: 'AAACS4321A',
    bankName: 'Citibank N.A.',
    accountNumber: '0382910029',
    ifscCode: 'CITI0000002',
    tdsSection: '194C_CONTRACTOR',
    tdsRate: 2,
    totalBilled: 420000,
    totalPaid: 385000,
    outstandingBalance: 35000,
    isActive: true,
    createdAt: '2025-01-10',
  },
];

const FALLBACK_EXPENSES: SocietyExpenseDto[] = [
  {
    id: 'exp-1',
    voucherNumber: 'VCH-2026-10-012',
    category: 'Security Services',
    title: 'Monthly Security Guard Deployment - 12 Guards',
    description: 'Invoice #APEX/2026/09 for 24x7 gate security and perimeter patrols.',
    amount: 130000,
    accountId: 'coa-101',
    accountName: 'Operating Account (HDFC)',
    vendorId: 'ven-1',
    vendorName: 'Apex Security & Guarding Services LLP',
    status: 'PENDING_APPROVER',
    makerName: 'Accountant Ramesh',
    makerDate: '2026-10-02',
    checkerName: 'Checker (Treasurer) Ajay',
    checkerDate: '2026-10-03',
    checkerNotes: 'Verified duty roster, PF/ESI challans attached. Approved for final release.',
    createdAt: '2026-10-02',
  },
  {
    id: 'exp-2',
    voucherNumber: 'VCH-2026-10-013',
    category: 'Repairs & Maintenance',
    title: 'DG Set Diesel Refill 500 Litres',
    description: 'Bulk fuel top-up for 250kVA standby diesel generator.',
    amount: 47500,
    accountId: 'coa-101',
    accountName: 'Operating Account (HDFC)',
    status: 'PENDING_CHECKER',
    makerName: 'Estate Manager Vivek',
    makerDate: '2026-10-03',
    createdAt: '2026-10-03',
  },
  {
    id: 'exp-3',
    voucherNumber: 'VCH-2026-09-088',
    category: 'Electricity & Power',
    title: 'MSEDCL Common Area Electricity Bill',
    description: 'Common area lighting, water pumps, lifts power consumption.',
    amount: 184500,
    accountId: 'coa-101',
    accountName: 'Operating Account (HDFC)',
    status: 'PAID',
    makerName: 'Accountant Ramesh',
    makerDate: '2026-09-25',
    checkerName: 'Treasurer Ajay',
    checkerDate: '2026-09-26',
    approverName: 'President Dr. Kulkarni',
    approverDate: '2026-09-27',
    paymentMethod: 'NET_BANKING_RTGS',
    utrReference: 'HDFCR52026092788392',
    createdAt: '2026-09-25',
  },
];

const FALLBACK_CHART_OF_ACCOUNTS: ChartOfAccountDto[] = [
  { id: 'coa-101', code: '1010', name: 'Operating Bank Account (HDFC)', type: 'ASSET', balance: 2485000, description: 'Main operational billing and collection account', isReserveFund: false },
  { id: 'coa-102', code: '1020', name: 'Sinking Fund Fixed Deposit (SBI)', type: 'ASSET', balance: 8650000, description: 'Long-term reserve for structural repair and capex', isReserveFund: true },
  { id: 'coa-103', code: '1030', name: 'General Reserve Fixed Deposit (ICICI)', type: 'ASSET', balance: 5200000, description: 'Operational buffer and emergency liquidity reserve', isReserveFund: true },
  { id: 'coa-201', code: '2010', name: 'Sinking Fund Reserve Corpus', type: 'EQUITY_RESERVE', balance: 8650000, description: 'Mandatory statutory reserve corpus', isReserveFund: true },
  { id: 'coa-202', code: '2020', name: 'Building Repair & Painting Fund', type: 'EQUITY_RESERVE', balance: 3500000, description: 'Corpus for 5-year external building painting', isReserveFund: true },
  { id: 'coa-301', code: '3010', name: 'Monthly Maintenance Collections', type: 'INCOME', balance: 11125000, description: 'Revenue from flat member maintenance demands', isReserveFund: false },
  { id: 'coa-401', code: '4010', name: 'Security & Manned Guarding', type: 'EXPENSE', balance: 1300000, description: 'Security vendor contracts', isReserveFund: false },
  { id: 'coa-402', code: '4020', name: 'Housekeeping & Sanitation', type: 'EXPENSE', balance: 800000, description: 'Daily cleaning & waste disposal services', isReserveFund: false },
  { id: 'coa-403', code: '4030', name: 'Lift AMC & Maintenance', type: 'EXPENSE', balance: 350000, description: 'Comprehensive lift AMC contracts', isReserveFund: false },
];

const FALLBACK_LEDGER_ENTRIES: GeneralLedgerEntryDto[] = [
  { id: 'gle-1', entryDate: '2026-10-01', voucherNumber: 'MNT-DEM-OCT', accountCode: '3010', accountName: 'Monthly Maintenance Collections', debit: 0, credit: 1250000, description: 'Monthly maintenance demand raised for 250 units' },
  { id: 'gle-2', entryDate: '2026-10-01', voucherNumber: 'MNT-DEM-OCT', accountCode: '1010', accountName: 'Operating Bank Account (HDFC)', debit: 1250000, credit: 0, description: 'Member maintenance receivables recognition' },
  { id: 'gle-3', entryDate: '2026-10-02', voucherNumber: 'VCH-2026-10-012', accountCode: '4010', accountName: 'Security & Manned Guarding', debit: 130000, credit: 0, description: 'Apex Security monthly billing' },
  { id: 'gle-4', entryDate: '2026-10-02', voucherNumber: 'VCH-2026-10-012', accountCode: '1010', accountName: 'Operating Bank Account (HDFC)', debit: 0, credit: 130000, description: 'Security disbursement' },
];

// Helper to attempt paths
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
    const subtotal = dto.lineItems.reduce((s, it) => s + it.amount, 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const newInv: SocietyInvoiceDto = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      unitNumber: dto.unitNumber,
      residentName: dto.residentName,
      residentEmail: dto.residentEmail,
      residentPhone: dto.residentPhone,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      subtotal,
      taxAmount,
      discountAmount: 0,
      totalAmount: subtotal + taxAmount,
      paidAmount: 0,
      balanceDue: subtotal + taxAmount,
      status: 'SENT',
      notes: dto.notes,
      lineItems: dto.lineItems,
    };
    FALLBACK_INVOICES.unshift(newInv);
    return newInv;
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
    const newVen: SocietyVendorDto = {
      id: `ven-${Date.now()}`,
      vendorName: dto.vendorName,
      category: dto.category,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      gstin: dto.gstin,
      panNumber: dto.panNumber,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      ifscCode: dto.ifscCode,
      tdsSection: dto.tdsSection,
      tdsRate: dto.tdsRate,
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    FALLBACK_VENDORS.unshift(newVen);
    return newVen;
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

  createExpenseVoucher: async (dto: CreateSocietyExpenseDto, userName: string): Promise<SocietyExpenseDto> => {
    for (const path of ['/api/finance/expenses', '/api/v1/finance/expenses']) {
      try {
        const { data } = await api.post<SocietyExpenseDto>(path, dto);
        return data;
      } catch {
        // try next
      }
    }
    const ven = FALLBACK_VENDORS.find(v => v.id === dto.vendorId);
    const newExp: SocietyExpenseDto = {
      id: `exp-${Date.now()}`,
      voucherNumber: `VCH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      amount: dto.amount,
      accountId: dto.accountId,
      accountName: 'Operating Account (HDFC)',
      vendorId: dto.vendorId,
      vendorName: ven?.vendorName,
      status: 'PENDING_CHECKER',
      makerName: userName || 'Accountant',
      makerDate: new Date().toISOString().split('T')[0],
      receiptUrl: dto.receiptUrl,
      createdAt: new Date().toISOString().split('T')[0],
    };
    FALLBACK_EXPENSES.unshift(newExp);
    return newExp;
  },

  checkerVerifyExpense: async (expenseId: string, checkerName: string, notes: string): Promise<SocietyExpenseDto> => {
    for (const path of [`/api/finance/expenses/${expenseId}/verify`, `/api/v1/finance/expenses/${expenseId}/verify`]) {
      try {
        const { data } = await api.put<SocietyExpenseDto>(path, { notes });
        return data;
      } catch {
        // try next
      }
    }
    const exp = FALLBACK_EXPENSES.find(e => e.id === expenseId);
    if (exp) {
      exp.status = 'PENDING_APPROVER';
      exp.checkerName = checkerName;
      exp.checkerDate = new Date().toISOString().split('T')[0];
      exp.checkerNotes = notes;
    }
    return exp!;
  },

  approverSignOffExpense: async (expenseId: string, approverName: string, notes: string): Promise<SocietyExpenseDto> => {
    for (const path of [`/api/finance/expenses/${expenseId}/approve`, `/api/v1/finance/expenses/${expenseId}/approve`]) {
      try {
        const { data } = await api.put<SocietyExpenseDto>(path, { notes });
        return data;
      } catch {
        // try next
      }
    }
    const exp = FALLBACK_EXPENSES.find(e => e.id === expenseId);
    if (exp) {
      exp.status = 'APPROVED';
      exp.approverName = approverName;
      exp.approverDate = new Date().toISOString().split('T')[0];
      exp.approverNotes = notes;
    }
    return exp!;
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
    const exp = FALLBACK_EXPENSES.find(e => e.id === expenseId);
    if (exp) {
      exp.status = 'PAID';
      exp.utrReference = utr;
      exp.paymentMethod = method;
    }
    return exp!;
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
};
