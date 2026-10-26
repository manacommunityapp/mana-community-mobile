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

export interface AdminSummaryResponse {
  totalCollected: number;
  totalRefunded: number;
  countByStatus: Record<string, number>;
  amountByStatus: Record<string, number>;
  countByReferenceType: Record<string, number>;
  revenueByReferenceType: Record<string, number>;
}

export const paymentService = {
  async createOrder(req: CashfreeCreateOrderRequest): Promise<CashfreeOrderResponse> {
    try {
      const res = await api.post<CashfreeOrderResponse>('/payments/cashfree/orders', req);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create payment order. Please try again.');
    }
  },

  async verifyPayment(orderId: string): Promise<CashfreeOrderResponse> {
    try {
      const res = await api.post<CashfreeOrderResponse>(
        `/payments/cashfree/orders/${orderId}/verify`,
        {},
      );
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to verify payment. Please contact support if amount was deducted.');
    }
  },

  async getMyOrders(page = 0, size = 20): Promise<{ content: CashfreeOrderResponse[]; totalElements: number }> {
    try {
      const res = await api.get('/payments/cashfree/orders', { params: { page, size } });
      return res.data ?? { content: [], totalElements: 0 };
    } catch {
      return { content: [], totalElements: 0 };
    }
  },

  async getOrderById(id: number): Promise<CashfreeOrderResponse> {
    const res = await api.get<CashfreeOrderResponse>(`/payments/cashfree/orders/${id}`);
    return res.data;
  },

  async getOrdersByReference(
    referenceType: string,
    referenceId: number,
    page = 0,
  ): Promise<{ content: CashfreeOrderResponse[] }> {
    try {
      const res = await api.get('/payments/cashfree/orders/by-reference', {
        params: { referenceType, referenceId, page },
      });
      return res.data ?? { content: [] };
    } catch {
      return { content: [] };
    }
  },

  async initiateRefund(
    manaOrderId: string,
    amount?: number,
    reason?: string,
  ): Promise<CashfreeOrderResponse> {
    try {
      const res = await api.post<CashfreeOrderResponse>(
        `/payments/cashfree/orders/${manaOrderId}/refund`,
        { amount, reason },
      );
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to initiate refund. Please try again.');
    }
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getAdminReport(params: {
    status?: string;
    refType?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<{ content: CashfreeOrderResponse[]; totalElements: number; totalPages: number }> {
    try {
      const res = await api.get('/payments/cashfree/admin/report', { params: {
        ...(params.status  ? { status:  params.status  } : {}),
        ...(params.refType ? { refType: params.refType } : {}),
        ...(params.from    ? { from:    params.from    } : {}),
        ...(params.to      ? { to:      params.to      } : {}),
        page: params.page ?? 0,
        size: params.size ?? 20,
      }});
      return res.data ?? { content: [], totalElements: 0, totalPages: 0 };
    } catch {
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  async getAdminSummary(from?: string, to?: string): Promise<AdminSummaryResponse> {
    try {
      const res = await api.get('/payments/cashfree/admin/summary', {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });
      return res.data;
    } catch {
      return {} as AdminSummaryResponse;
    }
  },

  async adminInitiateRefund(
    manaOrderId: string,
    amount?: number,
    reason?: string,
  ): Promise<CashfreeOrderResponse> {
    try {
      const res = await api.post<CashfreeOrderResponse>(
        `/payments/cashfree/admin/refund/${manaOrderId}`,
        { amount, reason },
      );
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to process refund. Please try again.');
    }
  },
};
