import api from './apiClient';

export type P2PDebtStatus =
  | 'PENDING_VPA'
  | 'COLLECT_INITIATED'
  | 'COLLECT_APPROVED'
  | 'COLLECT_REJECTED'
  | 'COLLECT_EXPIRED'
  | 'CANCELLED';

export interface P2PDebt {
  id: number;
  tripId: number;
  creditorUserId: number;
  creditorName?: string;
  debtorUserId: number;
  debtorName?: string;
  amount: number;
  upiVpa?: string;
  status: P2PDebtStatus;
  description?: string;
  initiatedAt?: string;
  settledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDebtRequest {
  debtorUserId: number;
  amount: number;
  description: string;
}

export interface InitiateCollectRequest {
  upiVpa: string;
}

export const tripP2PService = {
  listDebts: async (tripId: number | string): Promise<P2PDebt[]> => {
    const res = await api.get<P2PDebt[]>(`/trips/${tripId}/p2p/debts`);
    return res.data;
  },

  createDebt: async (
    tripId: number | string,
    reqOrDebtorUserId: CreateDebtRequest | number,
    amount?: number,
    description?: string
  ): Promise<P2PDebt> => {
    const payload =
      typeof reqOrDebtorUserId === 'object'
        ? reqOrDebtorUserId
        : { debtorUserId: reqOrDebtorUserId, amount: amount ?? 0, description: description || '' };
    const res = await api.post<P2PDebt>(`/trips/${tripId}/p2p/debts`, payload);
    return res.data;
  },

  initiateCollect: async (
    debtId: number | string,
    reqOrVpa: InitiateCollectRequest | string
  ): Promise<P2PDebt> => {
    const payload = typeof reqOrVpa === 'object' ? reqOrVpa : { upiVpa: reqOrVpa };
    const res = await api.post<P2PDebt>(`/trips/p2p/debts/${debtId}/collect`, payload);
    return res.data;
  },

  cancelDebt: async (debtId: number | string): Promise<void> => {
    await api.delete(`/trips/p2p/debts/${debtId}`);
  },
};
