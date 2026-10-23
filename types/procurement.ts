export type SupplierVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type RFQStatus = 'DRAFT' | 'OPEN' | 'QUOTES_RECEIVED' | 'COMPARING' | 'AWARDED' | 'CANCELLED' | 'CLOSED';
export type QuoteStatus = 'SUBMITTED' | 'SHORTLISTED' | 'AWARDED' | 'REJECTED' | 'WITHDRAWN';
export type POStatus = 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'FULFILLED' | 'PARTIAL' | 'CANCELLED';
export type ProcurementCategory =
  | 'CLEANING_SUPPLIES' | 'ELECTRICAL' | 'PLUMBING' | 'OFFICE_SUPPLIES'
  | 'GARDENING' | 'SECURITY_EQUIPMENT' | 'FURNITURE' | 'IT_EQUIPMENT'
  | 'FOOD_BEVERAGE' | 'MAINTENANCE' | 'PACKAGING' | 'OTHER';

export interface SupplierProfile {
  id: number;
  businessName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstNumber?: string;
  pan?: string;
  address: string;
  city: string;
  pincode: string;
  categories: ProcurementCategory[];
  serviceArea: string[];
  verificationStatus: SupplierVerificationStatus;
  rating: number;
  reviewCount: number;
  fulfillmentRate: number;
  onTimeRate: number;
  totalOrders: number;
  description?: string;
  logoUrl?: string;
  certifications?: string[];
  createdAt: string;
}

export interface SupplierProduct {
  id: number;
  supplierId: number;
  supplierName: string;
  name: string;
  description?: string;
  category: ProcurementCategory;
  unit: string;
  wholesalePrice: number;
  retailPrice?: number;
  moq: number;
  maxOrderQty?: number;
  gstPercent: number;
  leadTimeDays: number;
  inStock: boolean;
  imageUrl?: string;
  specifications?: Record<string, string>;
  createdAt: string;
}

export interface RFQItem {
  id?: number;
  productName: string;
  description?: string;
  category: ProcurementCategory;
  unit: string;
  quantity: number;
  targetPricePerUnit?: number;
  specifications?: string;
}

export interface ProcurementRFQ {
  id: number;
  rfqNumber: string;
  title: string;
  description?: string;
  status: RFQStatus;
  communityId: number;
  requestedBy: string;
  items: RFQItem[];
  deliveryLocation: string;
  deliveryDeadline: string;
  quotationDeadline: string;
  estimatedValue?: number;
  approvedBudget?: number;
  invitedSupplierIds?: number[];
  quotesReceived: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuoteItem {
  rfqItemId?: number;
  productName: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  gstPercent: number;
  totalPrice: number;
  leadTimeDays: number;
  notes?: string;
}

export interface SupplierQuote {
  id: number;
  rfqId: number;
  supplierId: number;
  supplierName: string;
  supplierRating: number;
  status: QuoteStatus;
  items: SupplierQuoteItem[];
  subTotal: number;
  gstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  validUntil: string;
  deliveryDate: string;
  paymentTerms: string;
  notes?: string;
  score?: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  rfqId?: number;
  rfqNumber?: string;
  supplierId: number;
  supplierName: string;
  status: POStatus;
  items: SupplierQuoteItem[];
  subTotal: number;
  gstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  deliveryDeadline: string;
  deliveryAddress: string;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementStats {
  totalRFQs: number;
  activeRFQs: number;
  totalPOs: number;
  totalSpend: number;
  totalSavings: number;
  activeSuppliers: number;
  avgQuotesPerRFQ: number;
}

export interface CreateRFQPayload {
  title: string;
  description?: string;
  items: Omit<RFQItem, 'id'>[];
  deliveryLocation: string;
  deliveryDeadline: string;
  quotationDeadline: string;
  estimatedValue?: number;
  approvedBudget?: number;
  notes?: string;
}

export interface QuoteComparisonRow {
  itemName: string;
  unit: string;
  quantity: number;
  quotes: Array<{
    supplierId: number;
    supplierName: string;
    pricePerUnit: number;
    total: number;
    leadDays: number;
  }>;
}

// Phase 2 ──────────────────────────────────────────────────────────────────

export interface CreateSupplierPayload {
  businessName: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  gstNumber?: string;
  address: string;
  city: string;
  pincode: string;
  categories: string;
  serviceArea?: string;
  description?: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  category: ProcurementCategory;
  unit: string;
  wholesalePrice: number;
  retailPrice?: number;
  moq: number;
  gstPercent: number;
  leadTimeDays: number;
}

export interface QuoteItemSubmit {
  rfqItemId?: number;
  productName: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  gstPercent: number;
  leadTimeDays: number;
  notes?: string;
}

export interface SubmitQuotePayload {
  supplierId: number;
  items: QuoteItemSubmit[];
  deliveryCharge?: number;
  validUntil: string;
  deliveryDate: string;
  paymentTerms?: string;
  notes?: string;
}

export interface CategorySpend {
  category: string;
  spend: number;
  poCount: number;
}

export interface SupplierSpend {
  supplierId: number;
  supplierName: string;
  spend: number;
  poCount: number;
}

export interface ProcurementAnalytics {
  totalSpend: number;
  totalSavings: number;
  savingsRate: number;
  categorySpend: CategorySpend[];
  topSuppliers: SupplierSpend[];
  totalRFQs: number;
  awardedRFQs: number;
  avgQuotesPerRFQ: number;
  pendingPOValue: number;
}

// Phase 4: BulkBuy Campaigns ──────────────────────────────────────────────

export type BulkBuyCampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMMITTED' | 'AWARDED' | 'CLOSED' | 'CANCELLED';
export type CommitmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface BulkBuyPriceTier {
  minQuantity: number;
  pricePerUnit: number;
}

export interface BulkBuyCampaign {
  id: number;
  title: string;
  description?: string;
  productName: string;
  category: ProcurementCategory;
  unit: string;
  minOrderQuantity: number;
  targetQuantity?: number;
  currentQuantity: number;
  priceTiers: BulkBuyPriceTier[];
  currentEffectivePrice?: number;
  retailPrice?: number;
  supplierId?: number;
  supplierName?: string;
  deadlineDate: string;
  deliveryDate?: string;
  status: BulkBuyCampaignStatus;
  commitmentCount: number;
  communityId: number;
  createdBy?: string;
  myCommitmentQuantity?: number;
  myCommitmentId?: number;
  createdAt: string;
}

export interface BulkBuyCommitment {
  id: number;
  campaignId: number;
  userId: number;
  userName: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: CommitmentStatus;
  createdAt: string;
}

export interface CreateBulkBuyCampaignPayload {
  title: string;
  description?: string;
  productName: string;
  category: ProcurementCategory;
  unit: string;
  minOrderQuantity: number;
  targetQuantity?: number;
  priceTiers: BulkBuyPriceTier[];
  retailPrice?: number;
  deadlineDate: string;
  deliveryDate?: string;
}

export interface CommitToCampaignPayload {
  quantity: number;
}

// Phase 5: Reverse Auction ───────────────────────────────────────────────────

export type AuctionBidStatus = 'ACTIVE' | 'WITHDRAWN' | 'AWARDED';

export interface AuctionBid {
  id: number;
  rfqId: number;
  supplierId?: number;
  supplierName: string;
  bidAmount: number;
  deliveryDays?: number;
  notes?: string;
  status: AuctionBidStatus;
  rank: number;
  isMyBid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionRFQ {
  id: number;
  rfqNumber: string;
  title: string;
  description?: string;
  status: RFQStatus;
  communityId: number;
  requestedBy: string;
  primaryItem: string;
  deliveryLocation: string;
  deliveryDeadline: string;
  quotationDeadline: string;
  auctionDeadline?: string;
  reservePrice?: number;
  estimatedValue?: number;
  bidCount: number;
  lowestBid?: number;
  myBid?: AuctionBid;
  createdAt: string;
}

export interface PlaceAuctionBidPayload {
  bidAmount: number;
  deliveryDays?: number;
  notes?: string;
}

export interface EnableAuctionPayload {
  auctionDeadline: string;
  reservePrice?: number;
}
