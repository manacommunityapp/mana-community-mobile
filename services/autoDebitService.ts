import api from './apiClient';

export type AutoDebitStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'INACTIVE' | 'CANCELLED';

export interface BankMandate {
  id: number;
  bankName: string;
  accountLast4: string;
  ifsc: string;
  mandateRef: string;
  status: AutoDebitStatus;
  registeredAt: string;
  nextDebitDate?: string;
  monthlyAmount: number;
  createdAt: string;
}

export interface SetupMandateRequest {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
  monthlyAmount: number;
}

export const autoDebitService = {
  async getMyMandate(): Promise<BankMandate | null> {
    try {
      const res = await api.get<BankMandate>('/payments/auto-debit/mandate');
      return res.data;
    } catch {
      return null;
    }
  },

  async setupMandate(data: SetupMandateRequest): Promise<BankMandate> {
    try {
      const res = await api.post<BankMandate>('/payments/auto-debit/mandate', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to set up auto-debit. Please try again.');
    }
  },

  async cancelMandate(id: number): Promise<void> {
    try {
      await api.delete(`/payments/auto-debit/mandate/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel auto-debit. Please try again.');
    }
  },
};
