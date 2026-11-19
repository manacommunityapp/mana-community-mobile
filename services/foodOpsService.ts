import { apiClient } from './apiClient';

export type SlotStatus = 'OPEN' | 'FULL' | 'CUTOFF_PASSED' | 'CANCELLED';
export type BasketFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
export type ColdChainType = 'AMBIENT' | 'CHILLED' | 'FROZEN';

export interface DeliverySlotDto {
  id: number;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  cutoffAt: string;
  capacity: number;
  bookedCount: number;
  status: SlotStatus;
}

export interface RecurringBasketItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  acceptSubstitutes: boolean;
}

export interface RecurringBasketDto {
  id: number;
  name: string;
  frequency: BasketFrequency;
  nextOrderDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  items: RecurringBasketItem[];
}

export interface ProductSubstituteDto {
  originalProductId: number;
  originalProductName: string;
  substituteProductId: number;
  substituteProductName: string;
  priceDifference: number;
  coldChainType: ColdChainType;
}

export interface CreateBasketRequest {
  name: string;
  frequency: BasketFrequency;
  firstDeliveryDate: string;
  items: Array<{ productId: number; quantity: number; acceptSubstitutes: boolean }>;
}

export const foodOpsService = {
  getDeliverySlots: (vendorId: number, communityId: number, date: string): Promise<DeliverySlotDto[]> =>
    apiClient.get<DeliverySlotDto[]>('/food/slots', { params: { vendorId, communityId, date } }).then(r => r.data),

  bookSlot: (slotId: number): Promise<void> =>
    apiClient.post(`/food/slots/${slotId}/book`).then(() => {}),

  getBaskets: (): Promise<RecurringBasketDto[]> =>
    apiClient.get<RecurringBasketDto[]>('/food/baskets').then(r => r.data),

  createBasket: (req: CreateBasketRequest): Promise<RecurringBasketDto> =>
    apiClient.post<RecurringBasketDto>('/food/baskets', req).then(r => r.data),

  updateBasket: (id: number, req: Partial<CreateBasketRequest>): Promise<RecurringBasketDto> =>
    apiClient.put<RecurringBasketDto>(`/food/baskets/${id}`, req).then(r => r.data),

  pauseBasket: (id: number): Promise<void> =>
    apiClient.post(`/food/baskets/${id}/pause`).then(() => {}),

  resumeBasket: (id: number): Promise<void> =>
    apiClient.post(`/food/baskets/${id}/resume`).then(() => {}),

  deleteBasket: (id: number): Promise<void> =>
    apiClient.delete(`/food/baskets/${id}`).then(() => {}),

  getSubstitutes: (vendorId: number, productId: number, productType: string): Promise<ProductSubstituteDto[]> =>
    apiClient.get<ProductSubstituteDto[]>('/food/stock/substitutes', { params: { vendorId, productId, productType } }).then(r => r.data),

  getPendingRefunds: (communityId: number): Promise<any[]> =>
    apiClient.get<any[]>('/food/refunds', { params: { communityId, status: 'INITIATED' } }).then(r => r.data),
};
