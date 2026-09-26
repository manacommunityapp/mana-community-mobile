import api from './apiClient';

export interface MaintenanceBillDto {
  id: string;
  monthYear: string;
  billNumber: string;
  maintenanceAmount: number;
  waterCharges: number;
  sinkingFund: number;
  penaltyLateFee: number;
  totalAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  receiptUrl?: string;
}

export const maintenanceDuesService = {
  async getPendingBills(): Promise<MaintenanceBillDto[]> {
    const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/pending');
    return res.data;
  },

  async getPaymentHistory(): Promise<MaintenanceBillDto[]> {
    const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/history');
    return res.data;
  },

  async initiatePayment(billId: string): Promise<{ orderId: string; amount: number; key: string }> {
    const res = await api.post(`/finance/maintenance/pay/${billId}`);
    return res.data;
  },
};
