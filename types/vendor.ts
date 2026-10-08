// ── Vendor Domain Types ─────────────────────────────────────────────────────

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';

export interface VendorBooking {
  id: string;
  residentName?: string;
  customerName?: string;
  flatNumber?: string;
  flat?: string;
  serviceName?: string;
  service?: string;
  date?: string;
  timeSlot?: string;
  time?: string;
  status: BookingStatus;
  notes?: string;
  phone?: string;
  amount?: number;
}

export interface VendorWorkOrder {
  id: string;
  title: string;
  society?: string;
  block?: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedDate?: string;
  dueDate?: string;
  customerName?: string;
  flat?: string;
  location?: string;
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  residentName?: string;
  customerName?: string;
  flatNumber?: string;
  flat?: string;
  amount: number;
  date?: string;
  issuedAt?: string;
  paidAt?: string;
  dueDate?: string;
  status: InvoiceStatus;
  description?: string;
  service?: string;
}

export interface VendorReview {
  id: string;
  residentName?: string;
  customerName?: string;
  rating: number;
  comment: string;
  date: string;
  service?: string;
}

export interface VendorProfile {
  id: string;
  businessName: string;
  ownerName?: string;
  categories: string[];
  isVerified: boolean;
  isGSTVerified: boolean;
  isFSSAIVerified: boolean;
  isCommunityApproved: boolean;
  rating: number;
  totalOrders: number;
  memberSince: string;
  fulfillmentRate: number;
  onTimeRate: number;
  cancellationRate: number;
  disputeRate: number;
  activeDeals: number;
  coverImageUrl?: string;
  logoUrl?: string;
  description?: string;
  city?: string;
  tags?: string[];
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  name: string;
  category: string;
  subCategory?: string;
  brand?: string;
  sku: string;
  description?: string;
  imageUrls: string[];
  mrp: number;
  sellingPrice: number;
  gst: number;
  hsnCode?: string;
  packSize: string;
  availableQty: number;
  committedQty?: number;
  minOrderQty: number;
  expiryDate?: string;
  returnPolicy?: string;
  fulfillmentType: 'PICKUP' | 'DELIVERY' | 'BOTH';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface VendorDealTemplate {
  id: string;
  name: string;
  description?: string;
  productIds: string[];
  defaultPriceTiers: Array<{ minQty: number; price: number; label: string }>;
  defaultFulfillmentType: string;
  defaultPickupLocation?: string;
  defaultPaymentType: string;
}

export interface VendorDashboardStats {
  activeDeals?: number;
  todayOrders?: number;
  unitsSold?: number;
  todayRevenue?: number;
  pendingOrders?: number;
  pendingSettlement?: number;
  totalParticipants?: number;
  unitsCommitted?: number;
  topProduct?: string;
  topProductUnits?: number;
  topProductPrice?: number;
  rating?: number;
  totalReviews?: number;
  todayBookings?: number;
  pendingBookings?: number;
  activeWorkOrders?: number;
  monthRevenue?: number;
}

export interface VendorOrder {
  id: string;
  dealId: string;
  dealTitle: string;
  flat: string;
  residentName: string;
  qty: number;
  total: number;
  status: 'NEW' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'COMPLETED';
  pickupDate?: string;
  orderId: string;
}

export interface VendorFulfillmentManifest {
  dealId: string;
  dealTitle: string;
  totalQty: number;
  totalRevenue: number;
  pickupLocation: string;
  deliveryDate: string;
  status: string;
  orders: VendorOrder[];
}

export interface VendorSettlement {
  id: string;
  vendorId: string;
  dealId: string;
  dealTitle: string;
  grossSales: number;
  platformFeePct: number;
  platformFeeAmount: number;
  taxDeducted: number;
  netPayoutAmount: number;
  payoutStatus: 'PENDING_DELIVERY' | 'ESCROW_HOLD' | 'PROCESSED' | 'PAID';
  bankAccountLast4: string;
  bankName: string;
  settledAt?: string;
  createdAt: string;
  orderCount: number;
}

export interface VendorCommerceAnalytics {
  totalGrossRevenue: number;
  totalOrdersFulfilled: number;
  averageOrderValue: number;
  sellThroughRate: number;
  repeatBuyerPct: number;
  onTimeDeliveryRate: number;
  disputeResolutionRate: number;
  topProducts: Array<{ name: string; unitsSold: number; revenue: number; marginPct: number }>;
  monthlyRevenueChart: Array<{ month: string; revenue: number; orders: number }>;
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
}
