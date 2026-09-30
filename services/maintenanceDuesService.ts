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
   * Returns active pending / unpaid maintenance bills.
   */
  async getPendingBills(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/pending');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to load pending bills', err);
      return [];
    }
  },

  /**
   * GET /finance/maintenance/bills/history
   * Returns list of paid maintenance bills / receipts.
   */
  async getPaymentHistory(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/history');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to load payment history', err);
      return [];
    }
  },

  /**
   * POST /finance/maintenance/pay/{billId}
   * Initiates payment order from payment gateway.
   */
  async initiatePayment(billId: string): Promise<PaymentInitiationResponse> {
    try {
      const res = await api.post<PaymentInitiationResponse>(`/finance/maintenance/pay/${billId}`);
      if (res.data?.orderId) {
        return res.data;
      }
      throw new Error('Invalid payment order response');
    } catch (err) {
      secureLog.error(`[maintenanceDuesService] Failed to initiate payment for ${billId}`, err);
      throw err;
    }
  },

  /**
   * POST /finance/maintenance/verify
   * Verifies payment callback from payment gateway and settles bill.
   */
  async verifyPayment(payload: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const res = await api.post<PaymentVerificationResponse>('/finance/maintenance/verify', payload);
      if (res.data?.success) {
        return res.data;
      }
      throw new Error(res.data?.message || 'Payment verification failed');
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to verify payment', err);
      throw err;
    }
  },

  /**
   * GET /finance/wallet/balance
   * Returns current advance maintenance wallet balance.
   */
  async getWalletBalance(): Promise<WalletBalanceResponse> {
    try {
      const res = await api.get<WalletBalanceResponse>('/finance/wallet/balance');
      if (res.data && typeof res.data.balance === 'number') {
        return res.data;
      }
      return { balance: 0, currency: 'INR' };
    } catch (err) {
      secureLog.error('[maintenanceDuesService] Failed to get wallet balance', err);
      return { balance: 0, currency: 'INR' };
    }
  },

  /**
   * POST /finance/maintenance/pay-wallet/{billId}
   * Directly debits Advance Wallet to clear maintenance dues.
   */
  async payWithWallet(billId: string, amount: number): Promise<{ success: boolean; newBalance: number; receiptNumber: string }> {
    try {
      const res = await api.post<{ success: boolean; newBalance: number; receiptNumber: string }>(
        `/finance/maintenance/pay-wallet/${billId}`,
        { amount },
      );
      if (res.data?.success) {
        return res.data;
      }
      throw new Error('Wallet settlement failed');
    } catch (err) {
      secureLog.error(`[maintenanceDuesService] Failed to pay with wallet for ${billId}`, err);
      throw err;
    }
  },
};

