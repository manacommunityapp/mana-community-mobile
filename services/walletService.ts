import { apiClient } from './apiClient';

export interface ResidentWallet {
  id: number;
  balance: number;
  creditLimit: number;
  currency: string;
  status: string;
}

export interface WalletTransaction {
  id: number;
  txnType: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  description?: string;
  status: string;
  initiatedAt: string;
}

export const walletService = {
  async getMyWallet(communityId: number): Promise<ResidentWallet> {
    const res = await apiClient.get(`/api/wallet/my?communityId=${communityId}`);
    return res.data.data;
  },

  async getTransactions(communityId: number): Promise<WalletTransaction[]> {
    const res = await apiClient.get(`/api/wallet/transactions?communityId=${communityId}`);
    return res.data.data ?? [];
  },

  async initiateTopup(amount: number, method: string): Promise<{ paymentUrl: string }> {
    const res = await apiClient.post('/api/wallet/topup', { amount, method });
    return res.data.data;
  },

  async payInvoice(invoiceId: number, amount: number): Promise<WalletTransaction> {
    const res = await apiClient.post('/api/wallet/pay-invoice', { invoiceId, amount });
    return res.data.data;
  },
};
