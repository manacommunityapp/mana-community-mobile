import api from './apiClient';

// ─── Types (field names match backend DTOs exactly) ───────────────────────────

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type JournalEntryType = 'MANUAL' | 'SYSTEM' | 'REVERSAL';
export type SourceModule =
  | 'BILLING' | 'PAYMENT' | 'EXPENSE' | 'VENDOR' | 'FUND' | 'TAX' | 'TREASURY'
  | 'MANUAL' | 'EVENTS' | 'SPORTS' | 'MARKETPLACE' | 'RESOURCE_BOOKING'
  | 'DONATIONS' | 'HOME_SERVICES' | 'TRIPS' | 'SOCIAL_CIRCLES' | 'MAINTENANCE';

export interface AccountTreeNode {
  id: number;
  code: string;
  name: string;
  accountType: AccountType;
  currentBalance: number;
  isSystemAccount: boolean;
  children: AccountTreeNode[];
}

export interface JournalLine {
  id: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  narration: string;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  entryType: JournalEntryType;
  sourceModule: SourceModule;
  sourceDocumentType: string;
  sourceDocumentId: number;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  postedAt: string;
  lines: JournalLine[];
}

export interface JournalEntriesPage {
  content: JournalEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  fiscalYearName: string;
  generatedAt: string;
  totalDebit: number;
  totalCredit: number;
  lines: TrialBalanceLine[];
}

export interface FiscalYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────
// Backend controller: @RequestMapping("/api/cfbos/v1/accounting")
// Mobile baseURL already includes /api — interceptor strips duplicate /api prefix.
// These endpoints are scoped by JWT principal; no communityId param needed.

const BASE = '/cfbos/v1/accounting';

export const cfbosAccountingService = {
  getAccountTree: (): Promise<AccountTreeNode[]> =>
    api.get(`${BASE}/accounts`).then(r => r.data),

  getJournalEntries: (from: string, to: string, page = 0, size = 20): Promise<JournalEntriesPage> =>
    api
      .get(`${BASE}/journal-entries`, { params: { from, to, page, size, sort: 'entryDate,desc' } })
      .then(r => r.data),

  getJournalEntry: (id: number): Promise<JournalEntry> =>
    api.get(`${BASE}/journal-entries/${id}`).then(r => r.data),

  getFiscalYears: (): Promise<FiscalYear[]> =>
    api.get(`${BASE}/fiscal-years`).then(r => r.data),

  getTrialBalance: (fiscalYearId: number): Promise<TrialBalance> =>
    api.get(`${BASE}/trial-balance`, { params: { fiscalYearId } }).then(r => r.data),
};
