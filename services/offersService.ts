import api from './apiClient';
import type {
  CommunityOffer,
  CommerceCategory,
  BusinessPartner,
  UserOfferClaim,
  CommunityDemandPool,
} from '@/types/offers';

export const offersService = {
  async getCategories(): Promise<CommerceCategory[]> {
    const res = await api.get<CommerceCategory[]>('/offers/categories');
    return res.data;
  },

  async getOffers(category?: string): Promise<CommunityOffer[]> {
    const res = await api.get<CommunityOffer[]>('/offers', { params: { category } });
    return res.data;
  },

  async claimOffer(offerId: string): Promise<UserOfferClaim> {
    const res = await api.post<UserOfferClaim>(`/offers/${offerId}/claim`);
    return res.data;
  },

  async getMyClaims(): Promise<UserOfferClaim[]> {
    const res = await api.get<UserOfferClaim[]>('/offers/my-claims');
    return res.data;
  },

  async getDemandPools(): Promise<CommunityDemandPool[]> {
    const res = await api.get<CommunityDemandPool[]>('/offers/demand');
    return res.data;
  },

  async supportDemandPool(poolId: string): Promise<void> {
    await api.post(`/offers/demand/${poolId}/join`);
  },

  async getBusinesses(): Promise<BusinessPartner[]> {
    const res = await api.get<BusinessPartner[]>('/offers/businesses');
    return res.data;
  },
};
