import { apiClient } from './apiClient';

export type SlotStatus = 'OPEN' | 'FULL' | 'CUTOFF' | 'CANCELLED';
export type BasketFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
export type BasketStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type RefundTrigger = 'OUT_OF_STOCK' | 'SUBSTITUTION_REJECTED' | 'DAMAGED' | 'NOT_DELIVERED' | 'WRONG_ITEM' | 'QUALITY_ISSUE' | 'MANUAL';
export type RefundStatus = 'INITIATED' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

export interface DeliverySlot {
  id: number;
  templateId: number;
  communityId: number;
  vendorId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: SlotStatus;
  cutoffAt: string;
}

export interface RecurringBasket {
  id: number;
  communityId: number;
  userId: number;
  vendorId: number;
  name: string;
  frequency: BasketFrequency;
  status: BasketStatus;
  nextOrderDate: string;
  createdAt: string;
}

export interface OrderRefund {
  id: number;
  communityId: number;
  orderId: number;
  orderType: string;
  requestedBy: number;
  triggerType: RefundTrigger;
  amount: number;
  status: RefundStatus;
  autoApproved: boolean;
  itemDetails?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface ProductSubstituteDto {
  originalProductId: number;
  originalProductName: string;
  substituteProductId: number;
  substituteProductName: string;
  priceDifference: number;
  priority: number;
}

export const foodOpsService = {
  getAvailableSlots: (communityId: number, date: string): Promise<DeliverySlot[]> =>
    apiClient.get<DeliverySlot[]>(`/api/food/slots?communityId=${communityId}&date=${date}`).then(r => r.data),

  bookSlot: (slotId: number): Promise<void> =>
    apiClient.post(`/api/food/slots/${slotId}/book`).then(() => {}),

  getMyBaskets: (): Promise<RecurringBasket[]> =>
    apiClient.get<RecurringBasket[]>('/api/food/baskets').then(r => r.data),

  createBasket: (basket: Partial<RecurringBasket>): Promise<RecurringBasket> =>
    apiClient.post<RecurringBasket>('/api/food/baskets', basket).then(r => r.data),

  pauseBasket: (id: number): Promise<void> =>
    apiClient.post(`/api/food/baskets/${id}/pause`).then(() => {}),

  resumeBasket: (id: number): Promise<void> =>
    apiClient.post(`/api/food/baskets/${id}/resume`).then(() => {}),

  cancelBasket: (id: number): Promise<void> =>
    apiClient.delete(`/api/food/baskets/${id}`).then(() => {}),

  getRefunds: (status?: string): Promise<OrderRefund[]> =>
    apiClient.get<OrderRefund[]>(`/api/food/refunds${status ? `?status=${status}` : ''}`).then(r => r.data),

  reviewRefund: (id: number, approve: boolean, notes?: string): Promise<OrderRefund> =>
    apiClient.put<OrderRefund>(`/api/food/refunds/${id}/review`, { approve, notes }).then(r => r.data),
};
