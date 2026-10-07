import api from './apiClient';
import { secureLog } from '@/security';

export type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'EXACT' | 'QUANTITY' | 'SHARES';
export type MyMoneyMode = 'OFF' | 'SHARE' | 'SETTLEMENTS';

export interface ParticipantInput {
  userId: number;
  weight?: number;
  quantity?: number;
  percentage?: number;
  amount?: number;
}

export interface ExpenseRequest {
  categoryCode: string;
  description: string;
  totalAmount: number;
  paidByUserId?: number;
  expenseDate?: string;
  currency?: string;
  receiptUrl?: string;
  splitMethod?: SplitMethod | '';
  participants?: ParticipantInput[];
}

export interface ShareView {
  userId: number;
  userName: string;
  share: number;
}

export interface ExpenseView {
  id: number;
  tripId: string;
  categoryCode: string;
  description: string;
  totalAmount: number;
  currency: string;
  paidByUserId: number;
  paidByName: string;
  expenseDate: string;
  status: 'ACTIVE' | 'UNSPLIT' | 'VOIDED';
  splitMethod?: string;
  receiptUrl?: string;
  shares: ShareView[];
}

export interface BalanceView {
  userId: number;
  userName: string;
  paid: number;
  share: number;
  settledSent: number;
  settledReceived: number;
  net: number;
  position: 'RECEIVES' | 'OWES' | 'SETTLED';
}

export interface SummaryView {
  tripId: string;
  totalSpent: number;
  unsplitAmount: number;
  balances: BalanceView[];
}

export interface TransferView {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
}

export interface PaymentRequest {
  toUserId: number;
  amount: number;
  method?: string;
  reference?: string;
}

export interface PaymentView {
  id: number;
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  method?: string;
  reference?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface BudgetRequest {
  estimatedAmount: number;
  currency?: string;
}

export interface DashboardView {
  estimated?: number;
  spent: number;
  remaining?: number;
  unsplit: number;
  yourShare: number;
  youPaid: number;
  youReceive: number;
  youOwe: number;
  spentByCategory: Record<string, number>;
}

export interface PrefRequest {
  mode: MyMoneyMode;
}

export interface PrefView {
  mode: MyMoneyMode;
}

export const tripSplitService = {
  async getExpenses(tripId: string): Promise<ExpenseView[]> {
    try {
      const res = await api.get<ExpenseView[]>(`/v1/trips/${tripId}/split/expenses`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load expenses for ${tripId}`, err);
      return [];
    }
  },

  async createExpense(tripId: string, req: ExpenseRequest): Promise<ExpenseView> {
    const res = await api.post<ExpenseView>(`/v1/trips/${tripId}/split/expenses`, req);
    return res.data;
  },

  async voidExpense(tripId: string, id: number): Promise<ExpenseView> {
    const res = await api.delete<ExpenseView>(`/v1/trips/${tripId}/split/expenses/${id}`);
    return res.data;
  },

  async getSummary(tripId: string): Promise<SummaryView | null> {
    try {
      const res = await api.get<SummaryView>(`/v1/trips/${tripId}/split/summary`);
      return res.data;
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load summary for ${tripId}`, err);
      return null;
    }
  },

  async getSettlements(tripId: string): Promise<TransferView[]> {
    try {
      const res = await api.get<TransferView[]>(`/v1/trips/${tripId}/split/settlements`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load settlements for ${tripId}`, err);
      return [];
    }
  },

  async getPayments(tripId: string): Promise<PaymentView[]> {
    try {
      const res = await api.get<PaymentView[]>(`/v1/trips/${tripId}/split/payments`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load payments for ${tripId}`, err);
      return [];
    }
  },

  async recordPayment(tripId: string, req: PaymentRequest): Promise<PaymentView> {
    const res = await api.post<PaymentView>(`/v1/trips/${tripId}/split/payments`, req);
    return res.data;
  },

  async confirmPayment(tripId: string, id: number): Promise<PaymentView> {
    const res = await api.post<PaymentView>(`/v1/trips/${tripId}/split/payments/${id}/confirm`, {});
    return res.data;
  },

  async rejectPayment(tripId: string, id: number): Promise<PaymentView> {
    const res = await api.post<PaymentView>(`/v1/trips/${tripId}/split/payments/${id}/reject`, {});
    return res.data;
  },

  async getBudget(tripId: string): Promise<DashboardView | null> {
    try {
      const res = await api.get<DashboardView>(`/v1/trips/${tripId}/split/budget`);
      return res.data;
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load budget for ${tripId}`, err);
      return null;
    }
  },

  async setBudget(tripId: string, req: BudgetRequest): Promise<DashboardView> {
    const res = await api.put<DashboardView>(`/v1/trips/${tripId}/split/budget`, req);
    return res.data;
  },

  async getMyMoneyPrefs(tripId: string): Promise<PrefView> {
    try {
      const res = await api.get<PrefView>(`/v1/trips/${tripId}/split/my-money-prefs`);
      return res.data;
    } catch (err) {
      secureLog.warn(`[tripSplitService] Failed to load prefs for ${tripId}`, err);
      return { mode: 'OFF' };
    }
  },

  async setMyMoneyPrefs(tripId: string, mode: MyMoneyMode): Promise<PrefView> {
    const res = await api.put<PrefView>(`/v1/trips/${tripId}/split/my-money-prefs`, { mode });
    return res.data;
  },
};
