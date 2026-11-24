import api from './apiClient';

// ─── Bulk Billing ─────────────────────────────────────────────────────────────
export interface BulkBillingParams {
  billingMonth: string;
  maintenancePerSqft: number;
  sinkingFund: number;
  waterChargesPerUnit: number;
  dgCharges: number;
  applyGst: boolean;
  dueInDays: number;
}
export interface BulkBillingResult {
  generatedCount: number;
  totalAmount: number;
  billingMonth: string;
}

// ─── Cheque ───────────────────────────────────────────────────────────────────
export type ChequeStatus = 'IN_HAND' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
export interface ChequeRecord {
  id: string;
  communityId: number;
  residentUserId: number;
  flatNo: string;
  amount: number;
  chequeNumber: string;
  bankName: string;
  chequeDate: string;
  depositedDate?: string;
  clearedDate?: string;
  status: ChequeStatus;
  invoiceId?: string;
  remarks?: string;
  createdAt: string;
}

// ─── BRS ──────────────────────────────────────────────────────────────────────
export interface BrsSession {
  id: string;
  bankAccountName: string;
  statementMonth: string;
  statementFromDate: string;
  statementToDate: string;
  status: 'OPEN' | 'LOCKED';
  uploadedAt: string;
  lockedAt?: string;
  openingBalance: number;
  closingBalance: number;
}
export type BrsMatchStatus =
  | 'UNMATCHED'
  | 'MATCHED_INVOICE'
  | 'MATCHED_PAYMENT'
  | 'MATCHED_VENDOR'
  | 'SUSPENSE';
export interface BrsLine {
  id: string;
  sessionId: string;
  valueDate: string;
  description: string;
  creditAmount?: number;
  debitAmount?: number;
  utrReference?: string;
  matchStatus: BrsMatchStatus;
  matchedEntityId?: string;
  matchedEntityType?: string;
  manualNote?: string;
}
export interface BrsSummary {
  totalMatched: number;
  totalUnmatched: number;
  totalSuspense: number;
  totalCredits: number;
  totalDebits: number;
}

// ─── TDS ──────────────────────────────────────────────────────────────────────
export type TdsStatus = 'PENDING' | 'DEPOSITED' | 'FILED';
export interface TdsChallan {
  id: string;
  financialYear: string;
  quarter: string;
  tdsSection: string;
  totalTdsAmount: number;
  challanNumber?: string;
  bankName?: string;
  depositedDate?: string;
  status: TdsStatus;
  remarks?: string;
}

// ─── Freeze ───────────────────────────────────────────────────────────────────
export interface FreezePeriod {
  freezeDate?: string;
  freezeNote?: string;
}

// ─── PG Settlement ────────────────────────────────────────────────────────────
export interface PgSettlement {
  id: string;
  settlementDate: string;
  utrNumber: string;
  grossAmount: number;
  mdrAmount: number;
  gstOnMdr: number;
  netAmount: number;
  status: 'PENDING' | 'RECONCILED';
  transactionCount: number;
  bankAccount: string;
  remarks?: string;
}

export const financeExtService = {
  async generateBulkInvoices(params: BulkBillingParams): Promise<BulkBillingResult> {
    try {
      const r = await api.post<BulkBillingResult>('/billing/generate-bulk', params);
      return r.data;
    } catch {
      return { generatedCount: 0, totalAmount: 0, billingMonth: params.billingMonth };
    }
  },

  async getCheques(status?: ChequeStatus): Promise<ChequeRecord[]> {
    try {
      const r = await api.get<ChequeRecord[]>('/finance/cheques', { params: { status } });
      return r.data;
    } catch {
      return [];
    }
  },
  async createCheque(
    data: Omit<ChequeRecord, 'id' | 'communityId' | 'status' | 'createdAt'>,
  ): Promise<ChequeRecord> {
    const r = await api.post<ChequeRecord>('/finance/cheques', data);
    return r.data;
  },
  async updateChequeStatus(
    id: string,
    action: 'deposit' | 'clear' | 'bounce',
    remarks?: string,
  ): Promise<ChequeRecord> {
    const r = await api.put<ChequeRecord>(`/finance/cheques/${id}/${action}`, { remarks });
    return r.data;
  },

  async getBrsSessions(): Promise<BrsSession[]> {
    try {
      const r = await api.get<BrsSession[]>('/finance/brs/sessions');
      return r.data;
    } catch {
      return [];
    }
  },
  async createBrsSession(data: Partial<BrsSession>): Promise<BrsSession> {
    const r = await api.post<BrsSession>('/finance/brs/sessions', data);
    return r.data;
  },
  async getBrsLines(sessionId: string): Promise<BrsLine[]> {
    try {
      const r = await api.get<BrsLine[]>(`/finance/brs/sessions/${sessionId}/lines`);
      return r.data;
    } catch {
      return [];
    }
  },
  async autoMatch(sessionId: string): Promise<BrsSummary> {
    const r = await api.post<BrsSummary>(`/finance/brs/sessions/${sessionId}/auto-match`);
    return r.data;
  },
  async lockBrsSession(sessionId: string): Promise<BrsSession> {
    const r = await api.post<BrsSession>(`/finance/brs/sessions/${sessionId}/lock`);
    return r.data;
  },
  async getBrsSummary(sessionId: string): Promise<BrsSummary> {
    try {
      const r = await api.get<BrsSummary>(`/finance/brs/sessions/${sessionId}/summary`);
      return r.data;
    } catch {
      return {
        totalMatched: 0,
        totalUnmatched: 0,
        totalSuspense: 0,
        totalCredits: 0,
        totalDebits: 0,
      };
    }
  },

  async exportSalesVouchersXml(fromDate: string, toDate: string): Promise<string> {
    const r = await api.post('/finance/tally-export/sales-vouchers', null, {
      params: { fromDate, toDate },
      responseType: 'text',
    });
    return r.data as string;
  },
  async exportReceiptVouchersXml(fromDate: string, toDate: string): Promise<string> {
    const r = await api.post('/finance/tally-export/receipt-vouchers', null, {
      params: { fromDate, toDate },
      responseType: 'text',
    });
    return r.data as string;
  },

  async getFreezePeriod(): Promise<FreezePeriod> {
    try {
      const r = await api.get<FreezePeriod>('/finance/accounting-periods/freeze');
      return r.data;
    } catch {
      return {};
    }
  },
  async setFreezePeriod(freezeDate: string, freezeNote: string): Promise<void> {
    await api.post('/finance/accounting-periods/freeze', { freezeDate, freezeNote });
  },
  async clearFreezePeriod(): Promise<void> {
    await api.delete('/finance/accounting-periods/freeze');
  },

  async getTdsChallans(year?: string, quarter?: string): Promise<TdsChallan[]> {
    try {
      const r = await api.get<TdsChallan[]>('/finance/tds/challans', {
        params: { year, quarter },
      });
      return r.data;
    } catch {
      return [];
    }
  },
  async createTdsChallan(data: Partial<TdsChallan>): Promise<TdsChallan> {
    const r = await api.post<TdsChallan>('/finance/tds/challans', data);
    return r.data;
  },
  async depositTdsChallan(
    id: string,
    challanNumber: string,
    bankName: string,
    depositedDate: string,
  ): Promise<TdsChallan> {
    const r = await api.put<TdsChallan>(`/finance/tds/challans/${id}/deposit`, {
      challanNumber,
      bankName,
      depositedDate,
    });
    return r.data;
  },

  async getPgSettlements(): Promise<PgSettlement[]> {
    try {
      const r = await api.get<PgSettlement[]>('/finance/pg-settlements');
      return r.data;
    } catch {
      return [];
    }
  },
  async createPgSettlement(data: Partial<PgSettlement>): Promise<PgSettlement> {
    const r = await api.post<PgSettlement>('/finance/pg-settlements', data);
    return r.data;
  },
  async reconcilePgSettlement(id: string): Promise<PgSettlement> {
    const r = await api.put<PgSettlement>(`/finance/pg-settlements/${id}/reconcile`);
    return r.data;
  },
};
