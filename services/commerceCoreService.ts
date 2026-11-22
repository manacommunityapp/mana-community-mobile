import { apiClient } from './apiClient';
import type {
  CommerceChannel,
  CommerceOrder,
  CommerceCheckoutRequest,
  HandoverVerificationRequest,
  HandoverVerificationResponse,
} from '@/types/commerceCore';

export const commerceCoreService = {
  checkout: async (request: CommerceCheckoutRequest): Promise<CommerceOrder> => {
    // Order numbers, pricing (discounts, fees, totals) and the handover OTP are all
    // server-issued. Only the cart contents are sent; a failure propagates so no order
    // is ever shown as CONFIRMED with a self-generated OTP the gate would reject.
    const response = await apiClient.post('/commerce/orders/checkout', request);
    const order = ((response.data as any)?.data || response.data) as CommerceOrder | undefined;
    if (!order?.orderNumber) {
      throw new Error('Checkout failed: the server did not return an order.');
    }
    return order;
  },

  getMyOrders: async (): Promise<CommerceOrder[]> => {
    try {
      const response = await apiClient.get('/commerce/orders/my');
      return (response.data as any)?.data || response.data;
    } catch {
      return [];
    }
  },

  verifyHandover: async (request: HandoverVerificationRequest): Promise<HandoverVerificationResponse> => {
    // Releasing goods must be recorded server-side. Never verify a handover locally.
    const response = await apiClient.post('/commerce/handover/verify', request);
    const result = ((response.data as any)?.data || response.data) as HandoverVerificationResponse | undefined;
    if (!result?.success) {
      throw new Error(result?.message || 'Handover could not be verified. Do not release the goods.');
    }
    return result;
  },
};
