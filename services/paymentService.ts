import api from './apiClient';
import * as SecureStore from 'expo-secure-store';

export interface CashfreeCreateOrderRequest {
  amount: number;
  referenceType: string;
  referenceId: number;
  description?: string;
  customerPhone?: string;
}

export interface PaymentIdentity {
  userId: number;
  communityId: number | null;
}

interface PaymentAttempt {
  idempotencyKey: string;
  request: CashfreeCreateOrderRequest;
  createdAt: string;
}

export class PaymentOrderUnknownError extends Error {
  readonly code = 'PAYMENT_ORDER_UNKNOWN';
  constructor(message = 'We could not confirm whether your payment order was created. Check its status before retrying.') {
    super(message);
    this.name = 'PaymentOrderUnknownError';
  }
}

export type PendingOrderLookup =
  | { status: 'FOUND'; order: CashfreeOrderResponse }
  | { status: 'NOT_FOUND' }
  | { status: 'UNKNOWN' };

function attemptStorageKey(req: CashfreeCreateOrderRequest, identity: PaymentIdentity): string {
  const refType = req.referenceType.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `mana_payment_attempt_${identity.userId}_${identity.communityId ?? 'none'}_${refType}_${req.referenceId}`;
}

async function readPaymentAttempt(key: string): Promise<PaymentAttempt | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PaymentAttempt;
    if (typeof value?.idempotencyKey !== 'string' || typeof value?.createdAt !== 'string' || !value.request) return null;
    return value;
  } catch { return null; }
}

async function findOrderForAttempt(req: CashfreeCreateOrderRequest, attempt: PaymentAttempt): Promise<PendingOrderLookup> {
  try {
    const response = await api.get<{ content?: CashfreeOrderResponse[] }>('/payments/cashfree/orders', { params: { page: 0, size: 50 } });
    const createdAfter = new Date(attempt.createdAt).getTime() - 60_000;
    const candidate = (response.data?.content ?? []).find((order) =>
      order.referenceType === req.referenceType &&
      Number(order.referenceId) === Number(req.referenceId) &&
      Math.abs(Number(order.amount) - Number(req.amount)) < 0.01 &&
      Number.isFinite(new Date(order.createdAt).getTime()) && new Date(order.createdAt).getTime() >= createdAfter
    );
    return candidate ? { status: 'FOUND', order: candidate } : { status: 'NOT_FOUND' };
  } catch {
    return { status: 'UNKNOWN' };
  }
}

async function postCreateOrder(req: CashfreeCreateOrderRequest, attempt: PaymentAttempt): Promise<CashfreeOrderResponse> {
  const response = await api.post<CashfreeOrderResponse>('/payments/cashfree/orders', req, {
    headers: { 'Idempotency-Key': attempt.idempotencyKey },
  });
  return response.data;
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
  async createOrder(req: CashfreeCreateOrderRequest, identity: PaymentIdentity): Promise<CashfreeOrderResponse> {
    const key = attemptStorageKey(req, identity);
    let attempt = await readPaymentAttempt(key);

    if (attempt) {
      if (JSON.stringify(attempt.request) !== JSON.stringify(req)) {
        const lookup = await findOrderForAttempt(attempt.request, attempt);
        if (lookup.status === 'FOUND') {
          if (lookup.order.status === 'PAID' || lookup.order.status === 'FAILED' || lookup.order.status === 'EXPIRED') {
            await SecureStore.deleteItemAsync(key);
          }
          return lookup.order;
        }
        throw new PaymentOrderUnknownError('A previous payment attempt for this item is unresolved. Check its status before changing the payment details.');
      }
      const lookup = await findOrderForAttempt(req, attempt);
      if (lookup.status === 'UNKNOWN') throw new PaymentOrderUnknownError();
      if (lookup.status === 'FOUND') {
        if (lookup.order.status === 'PAID' || lookup.order.status === 'FAILED' || lookup.order.status === 'EXPIRED') {
          await SecureStore.deleteItemAsync(key);
        }
        // An order is already visible for this operation. Never create another one.
        return lookup.order;
      }
    } else {
      attempt = {
        idempotencyKey: `mana-pay-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`,
        request: req,
        createdAt: new Date().toISOString(),
      };
      // Persist before the POST so a process death or lost response can be resolved safely.
      await SecureStore.setItemAsync(key, JSON.stringify(attempt));
    }

    try {
      const created = await postCreateOrder(req, attempt!);
      await SecureStore.deleteItemAsync(key);
      return created;
    } catch (err: any) {
      const status = Number(err?.response?.status);
      const serverMessage = String(err?.response?.data?.message ?? err?.response?.data?.error ?? '').toLowerCase();
      const idempotencyInFlight = status === 409 && serverMessage.includes('still being processed');
      if (!status || status >= 500 || idempotencyInFlight) {
        throw new PaymentOrderUnknownError();
      }
      await SecureStore.deleteItemAsync(key);
      throw new Error(err?.response?.data?.message || 'Failed to create payment order. Please try again.');
    }
  },

  async checkPendingOrder(req: CashfreeCreateOrderRequest, identity: PaymentIdentity): Promise<PendingOrderLookup> {
    const key = attemptStorageKey(req, identity);
    const attempt = await readPaymentAttempt(key);
    if (!attempt) return { status: 'UNKNOWN' };
    const matchesRequest = JSON.stringify(attempt.request) === JSON.stringify(req);
    const lookup = await findOrderForAttempt(attempt.request, attempt);
    if (!matchesRequest && lookup.status !== 'FOUND') return { status: 'UNKNOWN' };
    if (lookup.status !== 'FOUND') return lookup;
    if (lookup.order.status === 'PAID' || lookup.order.status === 'FAILED' || lookup.order.status === 'EXPIRED') {
      await SecureStore.deleteItemAsync(key);
    }
    return lookup;
  },

  async clearPendingAttempt(req: CashfreeCreateOrderRequest, identity: PaymentIdentity): Promise<void> {
    await SecureStore.deleteItemAsync(attemptStorageKey(req, identity));
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
