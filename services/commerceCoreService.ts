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
    const response = await apiClient.post('/commerce/orders/checkout', request);
    return (response.data as any)?.data || response.data;
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
    const response = await apiClient.post('/commerce/handover/verify', request);
    return (response.data as any)?.data || response.data;
  },
};
