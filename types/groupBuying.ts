// ── Group Buying Domain Types ──────────────────────────────────────────────

export type DealStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PUBLISHED'
  | 'OPEN'
  | 'TARGET_REACHED'
  | 'PRICE_LOCKED'
  | 'PAYMENT_OPEN'
  | 'PAYMENT_COMPLETED'
  | 'ORDER_PLACED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'PICKUP_IN_PROGRESS'
  | 'COMPLETED'
  | 'TARGET_NOT_REACHED'
  | 'EXPIRED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'CANCELLED';

export type PricingModel = 'GUARANTEED' | 'THRESHOLD' | 'TARGET_OR_CANCEL';
export type PricingType = 'PARTICIPANT' | 'QUANTITY' | 'HYBRID';
export type FulfillmentType = 'PICKUP' | 'DELIVERY' | 'BOTH';
export type PaymentType = 'FULL' | 'ADVANCE' | 'PAY_AT_PICKUP';

export interface PriceTier {
  id: string;
  minQty: number;
  maxQty: number | null;
  price: number;
  label: string;
  isCurrentTier: boolean;
  isNextTier: boolean;
  unitsToUnlock?: number;
  savingsVsMrp?: number;
}

export interface GroupDealDto {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  description: string;
  imageUrl?: string;
  vendor: string;
  vendorId: string;
  vendorRating: number;
  vendorVerified?: boolean;
  // Pricing
  pricingModel: PricingModel;
  pricingType: PricingType;
  mrp: number;
  standardPrice: number;
  currentPrice: number;
  currentTierPrice: number;
  nextTierPrice?: number;
  nextTierUnitsNeeded?: number;
  priceTiers: PriceTier[];
  // Progress
  committedQty: number;
  targetQty: number;
  currentParticipants: number;
  targetParticipants: number;
  inventoryRemaining?: number;
  moqLabel: string;
  // Status & Timing
  dealStatus: DealStatus;
  daysLeft: number;
  dealEndsAt: string;
  priceLockedAt?: string;
  // Fulfillment
  pickupPoint: string;
  pickupDate?: string;
  pickupSlots?: string[];
  fulfillmentType: FulfillmentType;
  paymentType: PaymentType;
  // Badges
  isTrending?: boolean;
  isAlmostUnlocked?: boolean;
  isFestivalDeal?: boolean;
  isEndingSoon?: boolean;
}

export interface GroupOrderDto {
  id: string;
  dealId: string;
  title: string;
  category?: string;
  qty: number;
  unitPrice: number;
  total: number;
  savings?: number;
  status: 'CONFIRMED' | 'PAYMENT_PENDING' | 'PICKED_UP' | 'CANCELLED' | 'REFUNDED';
  qrCode: string;
  pickupPoint?: string;
  pickupDate?: string;
  pickupSlot?: string;
  authorizedCollectors?: AuthorizedCollector[];
  createdAt: string;
}

export interface AuthorizedCollector {
  id: string;
  name: string;
  relationship: string;
  authPin: string;
  expiresAt: string;
}

export interface DemandRequest {
  id: string;
  title: string;
  category: string;
  description?: string;
  interestedResidents: number;
  expectedQty: number;
  upvotes: number;
  targetUpvotes?: number;
  hasUpvoted: boolean;
  myCommittedQty?: number;
  preferredPriceMin?: number;
  preferredPriceMax?: number;
  preferredBrand?: string;
  preferredPackSize?: string;
  vendorOffers: VendorOffer[];
  status: 'OPEN' | 'VENDOR_OFFERED' | 'APPROVED' | 'LIVE' | 'FULFILLED';
}

export interface VendorOffer {
  id: string;
  demandId: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  vendorVerified: boolean;
  offeredPrice: number;
  minimumQty: number;
  maximumQty: number;
  deliveryDate: string;
  validUntil: string;
  terms?: string;
  isBestValue?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LIVE';
}

export interface MonthlyBasket {
  id: string;
  name: string;
  tagline?: string;
  items: BasketItem[];
  mrpTotal: number;
  groupPrice: number;
  savings: number;
  savingsPct: number;
  targetFamilies: number;
  committedFamilies: number;
  isRecurring: boolean;
  nextDeliveryDate: string;
  cutoffDate: string;
  imageUrl?: string;
}

export interface BasketItem {
  name: string;
  qty: string;
  mrp: number;
  groupPrice: number;
}

export interface CommunitySavings {
  totalSavedThisMonth: number;
  totalOrders: number;
  activeDeals: number;
  avgSavingPerOrder: number;
  totalKgsBought?: number;
  topCategory?: string;
  totalSavedAllTime?: number;
}

export interface BuyAgainSuggestion {
  dealId: string;
  orderId: string;
  title: string;
  category: string;
  lastPrice: number;
  currentPrice?: number;
  lastPurchasedAt: string;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface FestivalDealCategory {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  dealsCount: number;
  imageUrl?: string;
}

export interface BuyingGroup {
  id: string;
  name: string;
  tower: string;
  block: string;
  leaderName: string;
  leaderFlat: string;
  memberCount: number;
  totalSaved: number;
  activeDealsCount: number;
  description?: string;
  isMember?: boolean;
}

export interface CommunityAIQueryResponse {
  query: string;
  matchedDeals: GroupDealDto[];
  matchedDemands: DemandRequest[];
  suggestedAction: 'JOIN_DEAL' | 'UPVOTE_DEMAND' | 'CREATE_DEMAND';
  suggestedPrice?: number;
  estimatedCommunitySavings?: number;
  confidenceScore: number;
  explanation: string;
}

export interface OrderReview {
  id: string;
  orderId: string;
  dealId: string;
  residentName: string;
  productRating: number;
  deliveryRating: number;
  comment: string;
  photos?: string[];
  createdAt: string;
}

export interface OrderDispute {
  id: string;
  orderId: string;
  dealId: string;
  dealTitle: string;
  residentName: string;
  flat: string;
  reason: 'DAMAGED_ITEMS' | 'MISSING_QUANTITY' | 'POOR_QUALITY' | 'WRONG_ITEM' | 'NOT_DELIVERED';
  description: string;
  requestedResolution: 'REFUND' | 'REPLACEMENT';
  claimAmount: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REPLACED' | 'REFUNDED' | 'REJECTED';
  photoUrls?: string[];
  createdAt: string;
  resolvedAt?: string;
  vendorResponse?: string;
}

export interface CheckoutPaymentDetails {
  paymentMethod: 'UPI' | 'CREDIT_DEBIT_CARD' | 'NET_BANKING' | 'ADVANCE_DEPOSIT' | 'ESCROW_HOLD';
  amountToPayNow: number;
  escrowHoldAmount?: number;
  advanceDepositAmount?: number;
  deliveryAddressOrPickup: string;
  specialNotes?: string;
}
