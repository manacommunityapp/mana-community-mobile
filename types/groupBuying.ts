export type DealCategory =
  | 'GROCERIES'
  | 'DAIRY_EGGS'
  | 'HOME_KITCHEN'
  | 'FRUITS_VEGETABLES'
  | 'BAKERY'
  | 'PERSONAL_CARE'
  | 'BEVERAGES'
  | 'SNACKS'
  | string;

export type DealStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'LOCKED'
  | 'ORDERED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PICKUP_IN_PROGRESS'
  | 'COMPLETED';

export type TierStatus = 'UNLOCKED' | 'NEXT' | 'LOCKED';

export type PricingModel = 'THRESHOLD' | 'VOLUME' | 'FLAT' | 'GUARANTEED' | 'TARGET_OR_CANCEL';

export interface DealTier {
  id?: string;
  minQuantity?: number;
  minQty: number;
  maxQty?: number | null;
  price: number;
  discountPercent?: number;
  pricePerUnit?: number;
  description?: string;
  label: string;
  status?: TierStatus;
  isCurrentTier?: boolean;
  isNextTier?: boolean;
  unitsToUnlock?: number;
}

export type PriceTier = DealTier;

export interface GroupDeal {
  id: string;
  title: string;
  description: string;
  category: DealCategory;
  subCategory?: string;
  imageUrl: string;
  productName: string;
  unit: string;
  originalPrice: number;
  mrp: number;
  standardPrice: number;
  currentTierPrice: number;
  currentPrice: number;
  lowestPrice: number;
  targetQuantity: number;
  targetQty: number;
  currentQuantity: number;
  committedQty: number;
  minCommitmentQty?: number;
  maxCommitmentQty?: number;
  joinedCount: number;
  savingsSoFar: number;
  status: DealStatus;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  pickupDate?: string;
  pickupLocation: string;
  pickupPoint: string;
  pickupSlots?: string[];
  vendorName: string;
  vendor: string;
  vendorRating: number;
  vendorVerified: boolean;
  vendorId?: string;
  pricingModel: PricingModel;
  priceTiers: PriceTier[];
  tiers: DealTier[];
  highlights?: string[];
  termsAndConditions?: string[];
  isLocked?: boolean;
  priceLockedAt?: string;
  nextTierUnitsNeeded: number;
  daysLeft: number;
  nextTierPrice: number;
  isTrending?: boolean;
  isFestivalDeal?: boolean;
  isEndingSoon?: boolean;
  dealEndsAt?: string;
  isAlmostUnlocked?: boolean;
  shortfallUnits?: number;
  currentParticipants?: number;
  targetParticipants?: number;
  dealStatus?: string;
  fulfillmentType?: string;
  moqLabel?: string;
  paymentType?: string;
  inventoryRemaining?: number;
}

export type GroupDealDto = GroupDeal;

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export interface AuthorizedCollector {
  id?: string;
  name: string;
  phone?: string;
  relation?: string;
  relationship?: string;
  isAuthorized?: boolean;
  authPin?: string;
  expiresAt?: string;
}

export interface GroupOrder {
  id: string;
  dealId: string;
  dealTitle: string;
  title?: string;
  productName?: string;
  userId?: string;
  userName?: string;
  userApartment?: string;
  unitPrice: number;
  quantity: number;
  qty?: number;
  totalPrice?: number;
  total?: number;
  savings?: number;
  committedPrice?: number;
  finalPrice?: number;
  finalAmount?: number;
  totalCommittedAmount?: number;
  status: OrderStatus;
  paymentStatus?: string;
  placedAt?: string;
  authorizedCollectors?: AuthorizedCollector[];
  createdAt?: string;
  joinedAt?: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
  pickupToken?: string;
  pickupSlot?: string;
  deliverySlot?: string;
  deliveryAddress?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  trackingNumber?: string;
  pickupLocation?: string;
  pickupPoint?: string;
  pickupDate?: string;
  pickupOtp?: string;
  deliveryOtp?: string;
  pickupQrCode?: string;
  qrCode?: string;
  qrToken?: string;
  deliveredAt?: string;
  imageUrl?: string;
  unit?: string;
  rating?: number;
  reviewComment?: string;
  disputeReason?: string;
  refundAmount?: number;
  refundReason?: string;
  tierPriceRefundAmount?: number;
}

export type GroupOrderDto = GroupOrder;

export interface BuyingGroup {
  id: string;
  dealId?: string;
  name?: string;
  tower: string;
  block?: string;
  leaderName?: string;
  leaderFlat?: string;
  leaderId?: string;
  membersCount?: number;
  memberCount?: number;
  activeDealsCount?: number;
  totalQuantity?: number;
  targetQuantity?: number;
  totalSaved?: number;
  totalSavings?: number;
  description?: string;
  status?: 'FORMING' | 'LOCKED' | 'ORDERED' | 'DELIVERED';
  isMember?: boolean;
  createdAt?: string;
}

export interface OrderDispute {
  id: string;
  orderId: string;
  dealId?: string;
  userId?: string;
  reason: string;
  claimAmount?: number;
  description: string;
  requestedResolution?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export interface VerifyPickupResponse {
  success: boolean;
  order?: GroupOrder;
  message?: string;
}

export interface VendorOfferScoring {
  priceScore: number;
  vendorRatingScore: number;
  fulfillmentRateScore: number;
  onTimeRateScore: number;
  lowCancellationScore: number;
  lowDisputeScore: number;
  qualityScore: number;
  moqFeasibilityScore: number;
  compositeScore: number;
  isBestValue: boolean;
  scoringHighlights: string[];
}

export interface VendorOffer {
  id: string;
  demandId: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  isVerified?: boolean;
  vendorVerified?: boolean;
  pricePerUnit: number;
  offeredPrice?: number;
  moq: number;
  minimumQty?: number;
  estimatedDeliveryDays?: number;
  deliveryDate?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isBestValue?: boolean;
  fulfillmentRate: number;
  onTimeRate: number;
  cancellationRate: number;
  disputeRate: number;
  qualityScore: number;
  scoring?: VendorOfferScoring;
}

export interface DemandRequest {
  id: string;
  title: string;
  productName?: string;
  category: string;
  description?: string;
  interestedResidents: number;
  expectedQty: number;
  expectedQuantity?: number;
  targetQuantity?: number;
  targetUpvotes?: number;
  upvotes: number;
  hasUpvoted: boolean;
  preferredPriceMin?: number;
  preferredPriceMax?: number;
  preferredBrand?: string;
  preferredBrands?: string[];
  suggestedBy?: string;
  suggestedAt?: string;
  status: 'OPEN' | 'VENDOR_OFFERED' | 'APPROVED' | 'LIVE' | 'FULFILLED' | 'GATHERING_DEMAND' | 'VENDOR_BIDDING' | 'DEAL_FORMED' | 'EXPIRED';
  vendorOffers: VendorOffer[];
  dealId?: string;
  imageUrl?: string;
}

export type DemandPool = DemandRequest;

export interface TowerSavings {
  tower: string;
  orders: number;
  totalSaved: number;
}

export interface MonthlyBuyingPower {
  totalSaved: number;
  totalOrders: number;
  activeDeals: number;
  totalKgBought: number;
  avgSavingPerOrder: number;
  topSavingCategory: string;
  collectiveDiscountPercent: number;
  heroMilestoneText: string;
}

export interface CommunitySavings {
  totalSavedAllTime: number;
  totalOrdersAllTime: number;
  activeParticipants: number;
  thisMonthSaved: number;
  totalSavedThisMonth: number;
  totalOrders: number;
  activeDeals: number;
  avgSavingPerOrder: number;
  totalKgsBought: number;
  monthlyBuyingPower: MonthlyBuyingPower;
  topDealsThisMonth: {
    dealTitle: string;
    savings: number;
    participants: number;
  }[];
  towerLeaderboard: TowerSavings[];
}

export interface DealFilterState {
  category?: DealCategory | 'ALL';
  status?: DealStatus | 'ALL';
  sortBy?: 'endingSoon' | 'discount' | 'popularity' | 'priceLowToHigh';
  search?: string;
}

export interface JoinDealPayload {
  dealId: string;
  quantity: number;
  deliverySlot?: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
}

export interface CreateDemandPayload {
  title?: string;
  productName?: string;
  category: DealCategory;
  description?: string;
  preferredPriceMin?: number;
  preferredPriceMax?: number;
  preferredBrand?: string;
  preferredBrands?: string[];
  expectedQty?: number;
  expectedQuantity?: number;
}

export interface MonthlyCommunityBasket {
  id: string;
  name?: string;
  title?: string;
  month?: string;
  category?: string;
  tagline?: string;
  description?: string;
  imageUrl?: string;
  items: {
    id?: string;
    name: string;
    packSize?: string;
    quantity: number;
    unit?: string;
    mrp?: number;
    groupPrice: number;
    estimatedPrice?: number;
    savedAmount?: number;
  }[];
  mrpTotal?: number;
  totalEstimated?: number;
  totalSavings?: number;
  groupPrice: number;
  targetFamilies: number;
  committedFamilies: number;
  enrolledFamilies?: number;
  status?: string;
  deliveryDate?: string;
  nextDeliveryDate?: string;
  cutoffDate?: string;
  isSubscribed?: boolean;
  isRecurring?: boolean;
  savingsPct?: number;
  savings?: number;
}

export type MonthlyBasket = MonthlyCommunityBasket;

export interface BuyAgainItem {
  id: string;
  title?: string;
  dealId?: string;
  productName: string;
  category?: string;
  imageUrl: string;
  lastBoughtDaysAgo: number;
  lastPurchasedAt?: string;
  lastPrice: number;
  savings?: number;
  lastPurchasedPrice?: number;
  currentPrice?: number;
  currentDealPrice?: number;
  lastOrderedDate?: string;
  suggestedDealId?: string;
  isAvailable?: boolean;
  activeGroupBuyAvailable?: boolean;
  groupBuyPrice?: number;
  unit?: string;
}

export type BuyAgainSuggestion = BuyAgainItem;

export interface FestivalCategoryItem {
  id: string;
  name: string;
  emoji?: string;
  dealsCount?: number;
}

export interface FestivalCampaign {
  id: string;
  name: string;
  tagline: string;
  bannerImage: string;
  festivalDate: string;
  daysRemaining: number;
  categories: (string | FestivalCategoryItem)[];
}

export interface CommunityAIQueryResponse {
  query?: string;
  suggestedAction?: string;
  action?: string;
  answer?: string;
  dealMatches?: GroupDeal[];
  matchedDeals?: GroupDeal[];
  matchedDemands?: DemandRequest[];
  explanation?: string;
  confidenceScore?: number;
  confidence?: number;
  suggestedPrice?: number;
  estimatedCommunitySavings?: number;
}