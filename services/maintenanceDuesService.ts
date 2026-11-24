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

const FALLBACK_PENDING_BILLS: MaintenanceBillDto[] = [];
const FALLBACK_HISTORY_BILLS: MaintenanceBillDto[] = [];

let LOCAL_PENDING_BILLS: MaintenanceBillDto[] = [];
let LOCAL_HISTORY_BILLS: MaintenanceBillDto[] = [];

export const maintenanceDuesService = {
  /**
   * GET /finance/maintenance/bills/pending with hybrid fallback
   */
  async getPendingBills(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/pending');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('[maintenanceDuesService] Backend pending bills unavailable', err);
      return [];
    }
  },

  /**
   * GET /finance/maintenance/bills/history with hybrid fallback
   */
  async getPaymentHistory(): Promise<MaintenanceBillDto[]> {
    try {
      const res = await api.get<MaintenanceBillDto[]>('/finance/maintenance/bills/history');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('[maintenanceDuesService] Backend payment history unavailable', err);
      return [];
    }
  },

  /**
   * POST /finance/maintenance/pay/{billId} with hybrid fallback
   */
  async initiatePayment(billId: string): Promise<PaymentInitiationResponse> {
    // Order ids, amounts and gateway keys are server-authoritative. If the server cannot
    // be reached, there is no order — fail loudly rather than mint one on the client.
    const res = await api.post<PaymentInitiationResponse>(`/finance/maintenance/pay/${billId}`);
    if (!res.data?.orderId) {
      throw new Error('Payment could not be initiated: the server did not return an order.');
    }
    return res.data;
  },

  /**
   * POST /finance/maintenance/verify with hybrid fallback
   */
  async verifyPayment(payload: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    // Only the server can confirm a payment and issue a receipt number. Any failure here
    // propagates — we never invent a receipt for an unverified payment.
    const res = await api.post<PaymentVerificationResponse>('/finance/maintenance/verify', payload);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Payment could not be verified by the server.');
    }
    if (res.data.receiptNumber) {
      this.settleLocalBill(payload.billId, payload.method, res.data.receiptNumber);
    }
    return res.data;
  },

  /**
   * Helper to settle bill in memory
   */
  settleLocalBill(billId: string, method: string, receiptNumber: string) {
    const pendingIdx = LOCAL_PENDING_BILLS.findIndex(b => b.id === billId);
    if (pendingIdx !== -1) {
      const [settled] = LOCAL_PENDING_BILLS.splice(pendingIdx, 1);
      LOCAL_HISTORY_BILLS.unshift({
        ...settled,
        status: 'PAID',
        paidAmount: settled.totalAmount,
        dueAmount: 0,
        paymentMethod: method,
        paidAt: new Date().toISOString(),
        billNumber: receiptNumber,
      });
    }
  },

  /**
   * GET /finance/wallet/balance with hybrid fallback
   */
  async getWalletBalance(): Promise<WalletBalanceResponse> {
    // The wallet balance is server-authoritative; there is no local mirror to fall back on.
    const res = await api.get<WalletBalanceResponse>('/finance/wallet/balance');
    if (!res.data || typeof res.data.balance !== 'number') {
      throw new Error('Wallet balance unavailable.');
    }
    return res.data;
  },

  /**
   * POST /finance/maintenance/pay-wallet with hybrid fallback
   */
  async payWithWallet(billId: string, amount: number): Promise<{ success: boolean; newBalance: number; receiptNumber?: string }> {
    // The wallet is debited server-side only. No local balance mutation, no local receipt.
    const res = await api.post<{ success: boolean; newBalance: number; receiptNumber?: string }>('/finance/maintenance/pay-wallet', {
      billId,
      amount,
    });
    if (!res.data?.success) {
      throw new Error('Wallet payment was not confirmed by the server.');
    }
    if (res.data.receiptNumber) {
      this.settleLocalBill(billId, 'WALLET', res.data.receiptNumber);
    }
    return res.data;
  },

  /**
   * GET /finance/maintenance/bills/{id}/receipt with hybrid fallback
   */
  async downloadReceipt(billId: string): Promise<{ downloadUrl: string }> {
    // Only the server can hand out an official receipt URL. Never synthesize one.
    const res = await api.get<{ downloadUrl: string }>(`/finance/maintenance/bills/${billId}/receipt`);
    if (!res.data?.downloadUrl) {
      throw new Error('Official receipt is not available for this bill.');
    }
    return res.data;
  },
};
