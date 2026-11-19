import apiClient from './apiClient';

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
};
