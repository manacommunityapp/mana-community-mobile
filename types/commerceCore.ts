export type CommerceChannel = 'MARKETPLACE' | 'GROUP_BUYING' | 'FOOD' | 'DEALS' | 'VENDOR';

export type CommerceOrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export interface CommerceOrderItem {
  id?: number;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  totalPrice?: number;
  thumbnailUrl?: string;
}

export interface CommerceCheckoutRequest {
  channel: CommerceChannel;
  sellerId?: number;
  sellerType?: string;
  sellerName?: string;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: string;
  deliverySlot?: string;
  paymentMethod?: string;
  items: CommerceOrderItem[];
}

export interface CommerceOrder {
  id: number;
  orderNumber: string;
  channel: CommerceChannel;
  buyerId?: number;
  sellerId?: number;
  sellerType?: string;
  sellerName?: string;
  status: CommerceOrderStatus;
  fulfillmentType: string;
  deliveryAddress?: string;
  deliverySlot?: string;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discountAmount: number;
  totalAmount: number;
  handoverOtp?: string;
  handoverQrCode?: string;
  items: CommerceOrderItem[];
  createdAt: string;
}

export interface HandoverVerificationRequest {
  orderNumber: string;
  enteredOtp: string;
}

export interface HandoverVerificationResponse {
  success?: boolean;
  verified?: boolean;
  orderNumber: string;
  status: string;
  verifiedAt?: string;
  message: string;
}

export interface CommerceHandoverPassDto {
  id?: number;
  orderNumber: string;
  channel: string;
  handoverOtp: string;
  qrToken?: string;
  pickupPoint?: string;
  pickupSlot?: string;
  buyerName?: string;
  buyerFlat?: string;
  itemSummary?: string;
  totalQuantity?: number;
  totalAmount?: number;
  status: string;
  expiresAt?: string;
}
