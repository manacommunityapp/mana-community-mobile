import api from './apiClient';
import { secureLog } from '@/security';

export interface BillChargeDto {
  item: string;
  amount: number;
}

export interface MaintenanceBillDto {
  id: string;
  monthYear: string;
  billNumber: string;
  maintenanceAmount: number;
  waterCharges: number;
  sinkingFund: number;
  penaltyLateFee: number;
  totalAmount: number;
  paidAmount?: number;
  dueAmount?: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  charges?: BillChargeDto[];
  receiptUrl?: string;
  paymentMethod?: string;
  paidAt?: string;
}

export interface PaymentInitiationResponse {
  orderId: string;
  amount: number;
  key: string;
  currency?: string;
}

export interface PaymentVerificationRequest {
  billId: string;
  orderId: string;
  paymentId: string;
  signature?: string;
  method: 'UPI' | 'WALLET' | 'CARD' | string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  receiptNumber: string;
  paidAt?: string;
  message?: string;
}

export interface WalletBalanceResponse {
  balance: number;
  currency: string;
}

export const maintenanceDuesService = {
  /**
   * GET /finance/maintenance/bills/pending
   */
  async getPendingBills(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/pending');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to fetch pending bills', err);
      throw err;
    }
  },

  /**
   * GET /finance/maintenance/bills/history
   */
  async getPaymentHistory(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/history');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to fetch payment history', err);
      throw err;
    }
  },

  /**
   * POST /finance/maintenance/pay/{billId}
   */
  async initiatePayment(billId: string): Promise<PaymentInitiationResponse> {
    try {
      const res = await api.post<PaymentInitiationResponse>(`/finance/maintenance/pay/${billId}`);
      return res.data;
    } catch (err) {
      secureLog.error(`[maintenanceDuesService] Failed to initiate payment for bill ${billId}`, err);
      throw err;
    }
  },

  /**
   * POST /finance/maintenance/verify
   */
  async verifyPayment(payload: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const res = await api.post<PaymentVerificationResponse>('/finance/maintenance/verify', payload);
      return res.data;
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Payment verification failed on server', err);
      throw err;
    }
  },

  /**
   * GET /finance/wallet/balance
   */
  async getWalletBalance(): Promise<WalletBalanceResponse> {
    try {
      const res = await api.get<WalletBalanceResponse>('/finance/wallet/balance');
      return res.data;
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to fetch wallet balance', err);
      throw err;
    }
  },

  /**
   * POST /finance/maintenance/pay-wallet
   */
  async payWithWallet(billId: string, amount: number): Promise<{ success: boolean; newBalance: number; receiptNumber?: string }> {
    try {
      const res = await api.post<{ success: boolean; newBalance: number; receiptNumber?: string }>('/finance/maintenance/pay-wallet', {
        billId,
        amount,
      });
      return res.data;
    } catch (err) {
      secureLog.error(`[maintenanceDuesService] Wallet payment failed for bill ${billId}`, err);
      throw err;
    }
  },

  /**
   * GET /finance/maintenance/bills/{id}/receipt
   */
  async downloadReceipt(billId: string): Promise<{ downloadUrl: string }> {
    try {
      const res = await api.get<{ downloadUrl: string }>(`/finance/maintenance/bills/${billId}/receipt`);
      return res.data;
    } catch (err) {
      secureLog.error(`[maintenanceDuesService] Failed to download receipt for bill ${billId}`, err);
      throw err;
    }
  },
};
