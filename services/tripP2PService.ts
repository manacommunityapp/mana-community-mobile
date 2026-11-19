<<<<<<< HEAD
import api from './apiClient';
=======
import apiClient from './apiClient';
>>>>>>> fcb1821dfdf551c15a3886507b2389213cb60386

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
<<<<<<< HEAD
  initiatedAt?: string;
  settledAt?: string;
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

  createDebt: async (tripId: number | string, req: CreateDebtRequest): Promise<P2PDebt> => {
    const res = await api.post<P2PDebt>(`/trips/${tripId}/p2p/debts`, req);
    return res.data;
  },

  initiateCollect: async (debtId: number | string, req: InitiateCollectRequest): Promise<P2PDebt> => {
    const res = await api.post<P2PDebt>(`/trips/p2p/debts/${debtId}/collect`, req);
    return res.data;
  },

  cancelDebt: async (debtId: number | string): Promise<void> => {
    await api.delete(`/trips/p2p/debts/${debtId}`);
  },
=======
  createdAt?: string;
  updatedAt?: string;
}

const BASE = '/trips';

export const tripP2PService = {
  listDebts: (tripId: number) =>
    apiClient.get<P2PDebt[]>(`${BASE}/${tripId}/p2p/debts`).then((r) => r.data),

  createDebt: (tripId: number, debtorUserId: number, amount: number, description: string) =>
    apiClient
      .post<P2PDebt>(`${BASE}/${tripId}/p2p/debts`, { debtorUserId, amount, description })
      .then((r) => r.data),

  initiateCollect: (debtId: number, upiVpa: string) =>
    apiClient
      .post<P2PDebt>(`${BASE}/p2p/debts/${debtId}/collect`, { upiVpa })
      .then((r) => r.data),

  cancelDebt: (debtId: number) =>
    apiClient.delete(`${BASE}/p2p/debts/${debtId}`).then((r) => r.data),
>>>>>>> fcb1821dfdf551c15a3886507b2389213cb60386
};
