import api from './apiClient';

export interface CashfreeCreateOrderRequest {
  amount: number;
  referenceType: string;
  referenceId: number;
  description?: string;
  customerPhone?: string;
}

export interface CashfreeOrderResponse {
  id: number;
  manaOrderId: string;
  cfOrderId?: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'REFUND_PENDING' | 'PENDING';
  referenceType: string;
  referenceId: number;
  description?: string;
  paymentMethod?: string;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  // Only present on order creation
  paymentSessionId?: string;
  appId?: string;
}

export const paymentService = {
  /**
   * Step 1 — Create a Cashfree order on the Mana backend.
   * Returns paymentSessionId and appId needed to launch the SDK checkout.
   */
  async createOrder(req: CashfreeCreateOrderRequest): Promise<CashfreeOrderResponse> {
    const res = await api.post<CashfreeOrderResponse>('/payments/cashfree/orders', req);
    return res.data;
  },

  /**
   * Step 2 — Verify payment after SDK checkout completes.
   * The backend re-queries Cashfree to confirm authoritative status.
   */
  async verifyPayment(orderId: string): Promise<CashfreeOrderResponse> {
    const res = await api.post<CashfreeOrderResponse>(
      `/payments/cashfree/orders/${orderId}/verify`,
      {},
    );
    return res.data;
  },

  /** Current user's payment history (paginated). */
  async getMyOrders(page = 0, size = 20): Promise<{ content: CashfreeOrderResponse[]; totalElements: number }> {
    const res = await api.get('/payments/cashfree/orders', { params: { page, size } });
    return res.data;
  },

  /** Single order by local DB ID. */
  async getOrderById(id: number): Promise<CashfreeOrderResponse> {
    const res = await api.get<CashfreeOrderResponse>(`/payments/cashfree/orders/${id}`);
    return res.data;
  },

  /** Orders linked to a specific business entity. */
  async getOrdersByReference(
    referenceType: string,
    referenceId: number,
    page = 0,
  ): Promise<{ content: CashfreeOrderResponse[] }> {
    const res = await api.get('/payments/cashfree/orders/by-reference', {
      params: { referenceType, referenceId, page },
    });
    return res.data;
  },

  /** Initiate a refund for a PAID order. */
  async initiateRefund(
    manaOrderId: string,
    amount?: number,
    reason?: string,
  ): Promise<CashfreeOrderResponse> {
    const res = await api.post<CashfreeOrderResponse>(
      `/payments/cashfree/orders/${manaOrderId}/refund`,
      { amount, reason },
    );
    return res.data;
  },
};
