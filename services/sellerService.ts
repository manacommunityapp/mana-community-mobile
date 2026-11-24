import api from './apiClient';

export type SellerType = 'HOME_CHEF' | 'TUTOR' | 'TAILOR' | 'BEAUTY' | 'PET_CARE' | 'OTHER';

export interface SellerProfile {
  id: number;
  businessName: string;
  sellerType: SellerType;
  description?: string;
  profilePhoto?: string;
  phone: string;
  avgRating: number;
  totalReviews: number;
  isVerified: boolean;
  isActive: boolean;
  communityId: number;
}

export interface SellerListing {
  id: number;
  sellerId: number;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  priceUnit?: string;
  isAvailable: boolean;
}

export interface SellerReview {
  id: number;
  reviewerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

const FALLBACK_SELLERS: SellerProfile[] = [
  { id: 1, businessName: "Priya's Home Kitchen",  sellerType: 'HOME_CHEF',  phone: '', avgRating: 4.8, totalReviews: 42, isVerified: true,  isActive: true, communityId: 0 },
  { id: 2, businessName: 'Ravi Math Tutor',       sellerType: 'TUTOR',      phone: '', avgRating: 4.9, totalReviews: 28, isVerified: true,  isActive: true, communityId: 0 },
  { id: 3, businessName: 'Meena Tailoring',       sellerType: 'TAILOR',     phone: '', avgRating: 4.6, totalReviews: 15, isVerified: false, isActive: true, communityId: 0 },
  { id: 4, businessName: 'Glow Beauty at Home',   sellerType: 'BEAUTY',     phone: '', avgRating: 4.7, totalReviews: 31, isVerified: true,  isActive: true, communityId: 0 },
  { id: 5, businessName: 'Doggy Dayz Pet Care',   sellerType: 'PET_CARE',   phone: '', avgRating: 4.5, totalReviews: 10, isVerified: false, isActive: true, communityId: 0 },
];

export const sellerService = {
  async getCommunityListings(communityId: number, type?: SellerType): Promise<SellerProfile[]> {
    try {
      const params: Record<string, unknown> = { communityId };
      if (type) params.sellerType = type;
      const res = await api.get<SellerProfile[]>('/marketplace/sellers', { params });
      return res.data ?? FALLBACK_SELLERS;
    } catch {
      return FALLBACK_SELLERS;
    }
  },

  async getSellerProfile(sellerId: number): Promise<SellerProfile | null> {
    try {
      const res = await api.get<SellerProfile>(`/marketplace/sellers/${sellerId}`);
      return res.data ?? null;
    } catch {
      return FALLBACK_SELLERS.find(s => s.id === sellerId) ?? null;
    }
  },

  async getSellerListings(sellerId: number): Promise<SellerListing[]> {
    try {
      const res = await api.get<SellerListing[]>(`/marketplace/sellers/${sellerId}/listings`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getSellerReviews(sellerId: number): Promise<SellerReview[]> {
    try {
      const res = await api.get<SellerReview[]>(`/marketplace/sellers/${sellerId}/reviews`, {
        params: { size: 5 },
      });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async submitReview(sellerId: number, rating: number, comment?: string): Promise<void> {
    await api.post(`/marketplace/sellers/${sellerId}/reviews`, { rating, comment });
  },
};
