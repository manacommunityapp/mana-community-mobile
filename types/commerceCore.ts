export type CommerceChannel = 'MARKETPLACE' | 'GROUP_BUY' | 'MANA_DEALS' | 'FOOD_OS';

export type CommerceOrderStatus = 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'READY_FOR_PICKUP' 
  | 'OUT_FOR_DELIVERY' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'DISPUTED' 
  | 'REFUNDED';

export type DeliveryMethod = 'COMMUNITY_GATE_PICKUP' | 'DOORSTEP_DELIVERY' | 'VENDOR_STORE_PICKUP';

export interface CommerceOrderItemDto {
  id?: string;
  sourceProductId: string;
  sourceVariantId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  imageUrl?: string;
  selectedOptionsJson?: string;
}

export interface CommerceHandoverPassDto {
  id?: string;
  orderNumber?: string;
  qrPayload: string;
  verificationPin: string;
  passType: string;
  pickupLocation: string;
  pickupSlot?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface CommercePaymentDto {
  id?: string;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED' | 'FAILED';
  transactionReference?: string;
  amount: number;
  escrowReleaseStatus?: string;
  escrowReleasedAt?: string;
}

export interface CommerceOrderDto {
  id: string;
  orderNumber: string;
  channel: CommerceChannel;
  status: CommerceOrderStatus;
  userId: string;
  buyerName: string;
  buyerPhone?: string;
  buyerApartment?: string;
  vendorId?: string;
  vendorName?: string;
  sellerUserId?: string;
  itemsTotal: number;
  communityDiscount: number;
  deliveryFee: number;
  taxes: number;
  grandTotal: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  scheduledDeliverySlot?: string;
  groupBuyDealId?: string;
  items: CommerceOrderItemDto[];
  handoverPass?: CommerceHandoverPassDto;
  payment?: CommercePaymentDto;
  createdAt: string;
  updatedAt?: string;
}

export interface CommerceCheckoutRequest {
  channel: CommerceChannel;
  vendorId?: string;
  vendorName?: string;
  sellerUserId?: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  scheduledDeliverySlot?: string;
  groupBuyDealId?: string;
  paymentMethod: string;
  items: {
    sourceProductId: string;
    sourceVariantId?: string;
    productName: string;
    variantName?: string;
    sku?: string;
    unitPrice: number;
    quantity: number;
    imageUrl?: string;
    selectedOptionsJson?: string;
  }[];
}

export interface HandoverVerificationRequest {
  qrPayload?: string;
  orderNumber?: string;
  verificationPin?: string;
}

export interface HandoverVerificationResponse {
  verified: boolean;
  orderNumber: string;
  buyerName: string;
  buyerApartment?: string;
  itemCount: number;
  grandTotal: number;
  message: string;
}

export interface CommerceReviewDto {
  id?: string;
  orderId: string;
  channel: CommerceChannel;
  sourceProductId?: string;
  vendorId?: string;
  rating: number;
  reviewTitle?: string;
  comment?: string;
  reviewMediaJson?: string;
  isVerifiedPurchase?: boolean;
  createdAt?: string;
}

export interface CommerceDisputeDto {
  id?: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  details?: string;
  evidenceMediaJson?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'REFUNDED' | 'REJECTED' | 'RESOLVED';
  resolutionNotes?: string;
  refundAmount?: number;
  createdAt?: string;
}

export interface CommerceSettlementDto {
  id?: string;
  vendorId: string;
  orderId: string;
  orderNumber: string;
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  payoutStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'ON_HOLD';
  payoutReference?: string;
  payoutBatchId?: string;
  settledAt?: string;
  createdAt?: string;
}