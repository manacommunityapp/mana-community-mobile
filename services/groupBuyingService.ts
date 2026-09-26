import api from './apiClient';

export interface GroupDealDto {
  id: string;
  title: string;
  category: string;
  description: string;
  currentParticipants: number;
  targetParticipants: number;
  currentPrice: number;
  standardPrice: number;
  vendor: string;
  vendorRating: number;
  daysLeft: number;
  pickupPoint: string;
  imageUrl?: string;
}

export interface GroupOrderDto {
  id: string;
  dealId: string;
  title: string;
  qty: number;
  total: number;
  status: 'CONFIRMED' | 'PICKED_UP' | 'CANCELLED';
  qrCode: string;
  createdAt: string;
}

export const groupBuyingService = {
  async getDeals(): Promise<GroupDealDto[]> {
    const res = await api.get<GroupDealDto[]>('/group-buying/deals');
    return res.data;
  },

  async joinDeal(dealId: string, quantity: number): Promise<GroupOrderDto> {
    const res = await api.post<GroupOrderDto>(`/group-buying/deals/${dealId}/join`, { quantity });
    return res.data;
  },

  async getMyOrders(): Promise<GroupOrderDto[]> {
    const res = await api.get<GroupOrderDto[]>('/group-buying/my-orders');
    return res.data;
  },

  async getDemandBoard(): Promise<Array<{ id: string; title: string; category: string; upvotes: number; hasUpvoted?: boolean }>> {
    const res = await api.get('/group-buying/demand');
    return res.data;
  },

  async upvoteDemand(id: string): Promise<void> {
    await api.post(`/group-buying/demand/${id}/upvote`);
  },
};
