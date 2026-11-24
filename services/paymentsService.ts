import apiClient from './apiClient';

const BASE = '/api/payments';

export interface PaymentTimelineEvent {
  id: number;
  userId: number;
  sourceModule: string;
  referenceId: number;
  eventType: string;
  amount?: number;
  description?: string;
  occurredAt: string;
}

export interface BillReminder {
  id: number;
  billType: string;
  billerName: string;
  amount?: number;
  dueDate: string;
  paid: boolean;
}

export interface PaymentMandate {
  id: number;
  mandateType: string;
  provider: string;
  maxAmount: number;
  frequency: string;
  approvedAt: string;
  active: boolean;
  cancelReason?: string;
}

export interface PaymentReceipt {
  id: number;
  sourceModule: string;
  referenceId: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  receiptNumber: string;
  paidAt: string;
}

export interface PaymentDispute {
  id: number;
  amount: number;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  createdAt: string;
}

export interface PaymentReward {
  id: number;
  rewardType: string;
  sourceModule: string;
  points: number;
  description?: string;
  redeemed: boolean;
}

export const paymentsService = {
  timeline: (limit = 30) => apiClient.get<PaymentTimelineEvent[]>(`${BASE}/timeline/my?limit=${limit}`).then(r => r.data),
  listReminders: () => apiClient.get<BillReminder[]>(`${BASE}/bill-reminders/my`).then(r => r.data),
  createReminder: (data: Partial<BillReminder>) => apiClient.post<BillReminder>(`${BASE}/bill-reminders`, data).then(r => r.data),
  markReminderPaid: (id: number) => apiClient.put<BillReminder>(`${BASE}/bill-reminders/${id}/paid`, {}).then(r => r.data),
  listMandates: () => apiClient.get<PaymentMandate[]>(`${BASE}/mandates/my`).then(r => r.data),
  cancelMandate: (id: number, reason: string) => apiClient.put<PaymentMandate>(`${BASE}/mandates/${id}/cancel`, { reason }).then(r => r.data),
  listReceipts: () => apiClient.get<PaymentReceipt[]>(`${BASE}/receipts/my`).then(r => r.data),
  listDisputes: () => apiClient.get<PaymentDispute[]>(`${BASE}/disputes/my`).then(r => r.data),
  raiseDispute: (data: Partial<PaymentDispute>) => apiClient.post<PaymentDispute>(`${BASE}/disputes`, data).then(r => r.data),
  myRewards: () => apiClient.get<PaymentReward[]>(`${BASE}/rewards/my`).then(r => r.data),
  rewardBalance: () => apiClient.get<{ userId: number; points: number }>(`${BASE}/rewards/my/balance`).then(r => r.data),
  redeemReward: (id: number) => apiClient.post<PaymentReward>(`${BASE}/rewards/redeem/${id}`, {}).then(r => r.data),
};
