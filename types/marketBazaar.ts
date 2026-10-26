export type MarketEventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type MarketStallStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'UNAVAILABLE';
export type MarketApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface MarketEventDto {
  id: number | string;
  title: string;
  description?: string;
  communityId?: number | string;
  communityName?: string;
  city?: string;
  venue?: string;
  startsAt: string;
  endsAt?: string;
  status: MarketEventStatus;
  category?: string;
  bannerUrl?: string;
  vendorCount?: number;
  availableStallCount?: number;
}

export interface MarketStallDto {
  id: number | string;
  eventId: number | string;
  stallNumber: string;
  zone?: string;
  packageId?: number | string;
  packageName: string;
  description?: string;
  size?: string;
  price: number;
  currency?: string;
  facilities?: string[];
  allowedCategories?: string[];
  status: MarketStallStatus;
}

export interface MarketApplicationDto {
  id: number | string;
  eventId: number | string;
  eventTitle?: string;
  stallId?: number | string;
  stallNumber?: string;
  vendorName: string;
  businessName?: string;
  category: string;
  phone: string;
  products: string;
  complianceDocuments?: string[];
  status: MarketApplicationStatus;
  requestedAt?: string;
  amountDue?: number;
  currency?: string;
  bookingId?: number | string;
  paymentOrderId?: string;
  rejectionReason?: string;
}

export interface MarketEventFilters {
  query?: string;
  city?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface MarketApplicationRequest {
  stallId: number | string;
  vendorName: string;
  businessName: string;
  category: string;
  phone: string;
  products: string;
  complianceDocuments?: string[];
}

export interface CreateMarketEventRequest {
  title: string;
  description?: string;
  communityId: number | string;
  venue: string;
  city?: string;
  startsAt: string;
  endsAt?: string;
  category?: string;
}

export interface CreateMarketStallRequest {
  stallNumber: string;
  zone?: string;
  packageName: string;
  description?: string;
  size?: string;
  price: number;
  currency?: string;
  facilities?: string[];
  allowedCategories?: string[];
}
