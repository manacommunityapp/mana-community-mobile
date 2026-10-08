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
  itemCount?: number;
}

export interface BusinessPartner {
  id: string;
  name: string;
  categoryName: string;
  categoryCode?: string;
  tagline?: string;
  description?: string;
  address?: string;
  distanceKm?: number;
  phone?: string;
  whatsapp?: string;
  openingHours?: string;
  averageRating: number;
  reviewCount: number;
  activeDealsCount: number;
  partnershipTier: 'NONE' | 'SILVER_PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER';
  isVerified: boolean;
  exclusivePerks?: string[];
  tags?: string[];
  bannerUrl?: string;
  societyDiscount?: string;
}

export interface CommunityOffer {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  categoryName: string;
  categoryCode?: string;
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
  businessAddress?: string;
  businessPhone?: string;
  discountSummary: string;
  voucherCode: string;
  claimedAt: string;
  validUntil: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  qrCodeUrl: string;
  counterPin?: string;
  savingsAmount?: number;
  termsAndConditions?: string[];
  redeemedAt?: string;
}

export interface CommunityDemandPool {
  id: string;
  title: string;
  category: string;
  targetProduct: string;
  description?: string;
  brandOrVendor?: string;
  regularPrice: number;
  discountedPrice: number;
  targetCount: number;
  currentSupporters: number;
  deadline: string;
  userSupported: boolean;
  status: 'GATHERING' | 'LOCKED_IN' | 'ORDERED' | 'FULFILLED';
  minimumSavingsAmount?: number;
  estimatedDelivery?: string;
  initiatorName?: string;
  initiatorFlat?: string;
  perksIncluded?: string[];
}

export interface MarketVendor {
  id: string;
  stallNumber: string;
  name: string;
  category: 'ORGANIC_VEGGIES' | 'BAKERY' | 'FARM_DAIRY' | 'HANDMADE_CRAFTS' | 'SPECIALTY_FOOD' | 'PLANTS_NURSERY';
  tagline: string;
  description: string;
  rating: number;
  reviewCount: number;
  preOrderAvailable: boolean;
  popularItems: string[];
  specialSocietyDiscount?: string;
  contactNumber?: string;
  ownerName?: string;
}

export interface FarmersMarketDay {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  theme: string;
  status: 'UPCOMING' | 'LIVE_NOW' | 'COMPLETED';
  vendorCount: number;
  rsvpCount: number;
  userRsvp: boolean;
  bannerGradient: [string, string];
  highlights: string[];
  vendors: MarketVendor[];
}

export interface CommunityCoupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  businessId?: string;
  businessName?: string;
  discountType: 'PERCENTAGE' | 'FLAT_AMOUNT' | 'FREE_SERVICE';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validUntil?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'DISABLED';
}

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  code: string;
  message: string;
  discountValue?: number;
  originalAmount: number;
  calculatedDiscount: number;
  finalPayableAmount: number;
}

export interface QrVerificationResult {
  valid: boolean;
  claimId?: string;
  redemptionCode?: string;
  counterPin?: string;
  offerTitle?: string;
  businessName?: string;
  residentName?: string;
  alreadyRedeemed: boolean;
  isExpired: boolean;
  message: string;
}

export interface SettlementBatch {
  id: string;
  settlementNumber: string;
  businessId: string;
  businessName: string;
  periodStart: string;
  periodEnd: string;
  totalRedemptions: number;
  grossSalesAmount: number;
  totalCommissionAmount: number;
  netPayoutAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  payoutReference?: string;
  settledAt?: string;
}

