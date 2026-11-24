// unifiedPaymentService.ts
// All feature modules must use this for gateway-initiated payments.
// Never call paymentService (Cashfree) directly from feature code.
// After any PG SDK callback always call verifyPayment() — never accept SDK result as truth.

import api from './apiClient';

export type PaymentGateway = 'CASHFREE' | 'RAZORPAY' | 'MANA_PAY' | 'UPI_DIRECT' | 'MANUAL';

export type PaymentReferenceType =
  | 'MAINTENANCE_BILL'
  | 'EVENT_REGISTRATION'
  | 'POOJA_BOOKING'
  | 'SPORTS_REGISTRATION'
  | 'FOOD_ORDER'
  | 'MARKETPLACE_ORDER'
  | 'HEALTH_BOOKING'
  | 'AMENITY_BOOKING'
  | 'TRIP_SETTLEMENT'
  | 'BBPS_BILL'
  | 'MANUAL';

export type PaymentOrderStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'VOIDED'
  | 'EXPIRED';

export interface PaymentOrder {
  id: number;
  idempotencyKey: string;
  gateway: PaymentGateway;
  gatewayOrderId: string;
  referenceType: PaymentReferenceType;
  referenceId: number;
  amount: number;
  convenienceFeeAmount: number;
  grossAmount: number;
  currency: string;
  status: PaymentOrderStatus;
  receiptNumber?: string;
  failureReason?: string;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentOrderRequest {
  communityId: number;
  gateway: PaymentGateway;
  referenceType: PaymentReferenceType;
  referenceId: number;
  amount: number;
  currency?: string;
}

// baseURL already includes /api; interceptor strips duplicate /api prefix.
// These paths do NOT start with /api — they resolve to {host}/api/payments/orders.
const BASE = '/payments/orders';

export const unifiedPaymentService = {
  /**
   * Step 1 — Create a server-side payment order before launching any PG SDK.
   * Returns the gateway order id and session token needed to open checkout.
   */
  createOrder: (req: CreatePaymentOrderRequest): Promise<PaymentOrder> =>
    api.post(BASE, req).then(r => r.data),

  /** Retrieve current order state from the server. */
  getOrder: (orderId: number): Promise<PaymentOrder> =>
    api.get(`${BASE}/${orderId}`).then(r => r.data),

  /**
   * Step 2 — Verify after PG SDK callback.
   * NEVER treat the SDK callback alone as confirmation.
   * The backend re-queries the gateway to confirm.
   */
  verifyPayment: (orderId: number): Promise<PaymentOrder> =>
    api.post(`${BASE}/${orderId}/verify`).then(r => r.data),

  /** Initiate a refund for a captured payment. */
  initiateRefund: (orderId: number, amount: number): Promise<PaymentOrder> =>
    api.post(`${BASE}/${orderId}/refund`, { amount }).then(r => r.data),

  /** All payment orders for a given domain object. */
  getOrdersForReference: (
    referenceType: PaymentReferenceType,
    referenceId: number
  ): Promise<PaymentOrder[]> =>
    api.get(BASE, { params: { referenceType, referenceId } }).then(r => r.data),
};
