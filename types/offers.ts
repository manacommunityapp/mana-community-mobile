export type DealType =
  | 'DISCOUNT'
  | 'FIXED_PRICE'
  | 'PERCENTAGE_OFF'
  | 'BUY_ONE_GET_ONE'
  | 'FREE_SERVICE'
  | 'COMMUNITY_PRICE'
  | 'GROUP_OFFER';

export interface CommerceCategory {
  id: string;
  name: string;
  code: string;
  icon?: string;
  active: boolean;
}

export interface BusinessPartner {
  id: string;
  name: string;
  categoryName: string;
  tagline?: string;
  address?: string;
  distanceKm?: number;
  phone?: string;
  averageRating: number;
  reviewCount: number;
  activeDealsCount: number;
  partnershipTier: 'NONE' | 'SILVER_PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER';
  isVerified: boolean;
}

export interface CommunityOffer {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  categoryName: string;
  title: string;
  tagline?: string;
  description: string;
  dealType: DealType;
  discountPercentage?: number;
  originalPrice?: number;
  communityPrice?: number;
  voucherCode?: string;
  validUntil: string;
  claimedCount: number;
  maxClaims?: number;
  distanceKm?: number;
  isExclusive: boolean;
  termsAndConditions?: string[];
  userHasClaimed?: boolean;
}

export interface UserOfferClaim {
  id: string;
  offerId: string;
  offerTitle: string;
  businessName: string;
  discountSummary: string;
  voucherCode: string;
  claimedAt: string;
  validUntil: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  qrCodeUrl: string;
}

export interface CommunityDemandPool {
  id: string;
  title: string;
  category: string;
  targetProduct: string;
  regularPrice: number;
  discountedPrice: number;
  targetCount: number;
  currentSupporters: number;
  deadline: string;
  userSupported: boolean;
  status: 'GATHERING' | 'LOCKED_IN' | 'ORDERED';
}
