import api from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type JournalEntryType = 'MANUAL' | 'SYSTEM' | 'REVERSAL';
export type SourceModule =
  | 'BILLING'
  | 'SPORTS'
  | 'EVENTS'
  | 'PROCUREMENT'
  | 'EXPENSES'
  | 'PAYROLL'
  | 'MANUAL';

export interface AccountTreeNode {
  id: number;
  code: string;
  name: string;
  accountType: AccountType;
  level: number;
  balance: number;
  isSystem: boolean;
  children: AccountTreeNode[];
}

export interface JournalLine {
  id: number;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  entryType: JournalEntryType;
  sourceModule?: SourceModule;
  lines: JournalLine[];
  createdAt: string;
  reversedEntryId?: number;
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
  debit: number;
  credit: number;
}

export interface TrialBalance {
  fiscalYearId: number;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  generatedAt: string;
}

export interface FiscalYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'OPEN' | 'CLOSED';
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = '/cfbos/v1/accounting';

export const cfbosAccountingService = {
  getAccountTree: (communityId: number): Promise<AccountTreeNode[]> =>
    api.get(`${BASE}/accounts/tree`, { params: { communityId } }).then(r => r.data),

  getJournalEntries: (
    communityId: number,
    from: string,
    to: string,
    page = 0,
    size = 20,
  ): Promise<JournalEntriesPage> =>
    api
      .get(`${BASE}/journal`, { params: { communityId, from, to, page, size } })
      .then(r => r.data),

  getJournalEntry: (communityId: number, id: number): Promise<JournalEntry> =>
    api.get(`${BASE}/journal/${id}`, { params: { communityId } }).then(r => r.data),

  getFiscalYears: (communityId: number): Promise<FiscalYear[]> =>
    api.get(`${BASE}/fiscal-years`, { params: { communityId } }).then(r => r.data),

  getTrialBalance: (communityId: number, fiscalYearId: number): Promise<TrialBalance> =>
    api
      .get(`${BASE}/trial-balance`, { params: { communityId, fiscalYearId } })
      .then(r => r.data),
};
