import api from './apiClient';
import type {
  VendorProfile,
  VendorProduct,
  VendorDashboardStats,
  VendorFulfillmentManifest,
  VendorBooking,
  BookingStatus,
  VendorWorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  VendorInvoice,
  InvoiceStatus,
  VendorReview,
} from '@/types/vendor';

export type {
  VendorBooking,
  BookingStatus,
  VendorWorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  VendorInvoice,
  InvoiceStatus,
  VendorReview,
  VendorProfile,
  VendorProduct,
  VendorDashboardStats,
  VendorFulfillmentManifest,
};

const SAMPLE_VENDORS: VendorProfile[] = [
  {
    id: 'v1', businessName: 'ABC Wholesale Foods', categories: ['Grocery', 'Pulses', 'Dry Fruits', 'Festival Foods'],
    isVerified: true, isGSTVerified: true, isFSSAIVerified: true, isCommunityApproved: true,
    rating: 4.8, totalOrders: 327, memberSince: '2026-01',
    fulfillmentRate: 98, onTimeRate: 96, cancellationRate: 1.2, disputeRate: 0.4,
    activeDeals: 5, description: 'Wholesale grocery supplier with 15 years in Hyderabad. Direct farm-to-community sourcing.',
    city: 'Hyderabad', tags: ['Bulk Grocery', 'Direct Sourcing', 'FSSAI Certified'],
  },
  {
    id: 'v2', businessName: 'FreshMart Direct', categories: ['Fresh Produce', 'Fruits', 'Vegetables', 'Dairy'],
    isVerified: true, isGSTVerified: true, isFSSAIVerified: true, isCommunityApproved: true,
    rating: 4.6, totalOrders: 218, memberSince: '2026-03',
    fulfillmentRate: 95, onTimeRate: 93, cancellationRate: 2.1, disputeRate: 0.8,
    activeDeals: 3, description: 'Farm-fresh seasonal produce with next-day community delivery.',
    city: 'Hyderabad',
  },
  {
    id: 'v3', businessName: 'Sri Traders', categories: ['Grocery', 'Rice', 'Spices', 'Oils'],
    isVerified: true, isGSTVerified: true, isFSSAIVerified: true, isCommunityApproved: true,
    rating: 4.9, totalOrders: 512, memberSince: '2025-11',
    fulfillmentRate: 99, onTimeRate: 98, cancellationRate: 0.6, disputeRate: 0.2,
    activeDeals: 4, description: 'Decade-old rice and spice merchant. Premium quality with GI-tagged products.',
    city: 'Hyderabad', tags: ['GI Tagged', 'Premium Quality', 'Zero Disputes'],
  },
];

const SAMPLE_BOOKINGS: VendorBooking[] = [
  { id: 'b1', residentName: 'Ramesh Kumar', customerName: 'Ramesh Kumar', flatNumber: 'A-402', flat: 'A-402', serviceName: 'AC Maintenance', service: 'AC Maintenance', date: '2026-10-06', timeSlot: '10:00 AM', time: '10:00 AM', status: 'PENDING', phone: '9876543210', amount: 800 },
  { id: 'b2', residentName: 'Priya Sharma', customerName: 'Priya Sharma', flatNumber: 'B-105', flat: 'B-105', serviceName: 'Plumbing Repair', service: 'Plumbing Repair', date: '2026-10-06', timeSlot: '02:00 PM', time: '02:00 PM', status: 'CONFIRMED', phone: '9876543211', amount: 450 },
];

const SAMPLE_WORK_ORDERS: VendorWorkOrder[] = [
  { id: 'wo1', title: 'Clubhouse Lighting Repair', society: 'Mana Residency', block: 'Clubhouse', description: 'Replace ballast and LED tubes in badminton court', priority: 'HIGH', status: 'ASSIGNED', assignedDate: '2026-10-04', dueDate: '2026-10-07', customerName: 'Society Admin', flat: 'Clubhouse', location: 'Badminton Court' },
  { id: 'wo2', title: 'Main Gate Boom Barrier Check', society: 'Mana Residency', block: 'Gate 1', description: 'Periodic motor lubrication and loop sensor check', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedDate: '2026-10-03', dueDate: '2026-10-08', customerName: 'Security Desk', flat: 'Gate 1', location: 'Gate 1 Entry' },
];

const SAMPLE_INVOICES: VendorInvoice[] = [
  { id: 'inv1', invoiceNumber: 'INV-2026-001', residentName: 'Ramesh Kumar', customerName: 'Ramesh Kumar', flatNumber: 'A-402', flat: 'A-402', amount: 1200, date: '2026-10-01', issuedAt: '2026-10-01', dueDate: '2026-10-15', status: 'SENT', description: 'AC Filter cleaning and gas top-up', service: 'AC Service' },
  { id: 'inv2', invoiceNumber: 'INV-2026-002', residentName: 'Priya Sharma', customerName: 'Priya Sharma', flatNumber: 'B-105', flat: 'B-105', amount: 850, date: '2026-09-28', issuedAt: '2026-09-28', paidAt: '2026-09-30', dueDate: '2026-10-10', status: 'PAID', description: 'Kitchen sink trap replacement', service: 'Plumbing' },
];

const SAMPLE_REVIEWS: VendorReview[] = [
  { id: 'rev1', residentName: 'Suresh Menon', customerName: 'Suresh Menon', rating: 5, comment: 'Prompt service and very clean work!', date: '2026-10-02', service: 'Electrical' },
  { id: 'rev2', residentName: 'Ananya Roy', customerName: 'Ananya Roy', rating: 4.5, comment: 'Punctual and resolved the issue quickly.', date: '2026-09-29', service: 'Plumbing' },
];

export const vendorService = {
  // ── Commerce Methods ──
  async getVendorProfile(vendorId: string): Promise<VendorProfile> {
    try {
      const res = await api.get<VendorProfile>(`/vendors/${vendorId}`);
      return res.data;
    } catch {
      return SAMPLE_VENDORS.find(v => v.id === vendorId) ?? SAMPLE_VENDORS[0];
    }
  },

  async getVendorProducts(vendorId: string): Promise<VendorProduct[]> {
    try {
      const res = await api.get<VendorProduct[]>(`/vendors/${vendorId}/products`);
      return res.data;
    } catch {
      return [
        { id: 'p1', vendorId, name: 'Aashirvaad Atta 10 KG', category: 'Grocery', subCategory: 'Atta', brand: 'Aashirvaad', sku: 'ATT-1002', description: 'Premium whole wheat atta.', imageUrls: [], mrp: 680, sellingPrice: 620, gst: 5, packSize: '10 KG', availableQty: 240, committedQty: 73, minOrderQty: 20, fulfillmentType: 'BOTH', status: 'ACTIVE' },
        { id: 'p2', vendorId, name: 'Tata Sampann Toor Dal 5 KG', category: 'Grocery', subCategory: 'Dal', brand: 'Tata Sampann', sku: 'DAL-2005', description: 'Unpolished double-filtered toor dal.', imageUrls: [], mrp: 620, sellingPrice: 580, gst: 5, packSize: '5 KG', availableQty: 180, committedQty: 62, minOrderQty: 20, fulfillmentType: 'PICKUP', status: 'ACTIVE' },
        { id: 'p3', vendorId, name: 'Fortune Sunflower Oil 5L', category: 'Grocery', subCategory: 'Oils', brand: 'Fortune', sku: 'OIL-5005', description: 'Refined sunflower oil, zero cholesterol.', imageUrls: [], mrp: 750, sellingPrice: 700, gst: 5, packSize: '5 L', availableQty: 120, committedQty: 58, minOrderQty: 10, fulfillmentType: 'BOTH', status: 'ACTIVE' },
      ];
    }
  },

  async getVendorDashboardStats(vendorId?: string): Promise<VendorDashboardStats> {
    try {
      const res = await api.get<VendorDashboardStats>(`/vendors/${vendorId ?? 'me'}/dashboard`);
      return res.data;
    } catch {
      return {
        activeDeals: 12, todayOrders: 238, unitsSold: 1482, todayRevenue: 384500,
        pendingOrders: 32, pendingSettlement: 72000,
        totalParticipants: 846, unitsCommitted: 3241,
        topProduct: '10 KG Basmati Rice', topProductUnits: 347, topProductPrice: 499,
        rating: 4.8, totalReviews: 46, todayBookings: 3, pendingBookings: 2,
        activeWorkOrders: 4, monthRevenue: 42500,
      };
    }
  },

  async getFulfillmentManifest(dealId: string): Promise<VendorFulfillmentManifest> {
    try {
      const res = await api.get<VendorFulfillmentManifest>(`/vendors/deals/${dealId}/manifest`);
      return res.data;
    } catch {
      return {
        dealId, dealTitle: 'Aashirvaad Atta 10 KG',
        totalQty: 73, totalRevenue: 42705,
        pickupLocation: 'Mana Residency Clubhouse',
        deliveryDate: '2026-10-09', status: 'PROCESSING',
        orders: [
          { id: 'vo1', dealId, dealTitle: 'Aashirvaad Atta 10 KG', flat: 'A-101', residentName: 'Ramesh Patel',   qty: 2, total: 1170, status: 'READY', orderId: 'GB-2026-00191' },
          { id: 'vo2', dealId, dealTitle: 'Aashirvaad Atta 10 KG', flat: 'A-204', residentName: 'Sneha Verma',    qty: 3, total: 1755, status: 'READY', orderId: 'GB-2026-00192' },
          { id: 'vo3', dealId, dealTitle: 'Aashirvaad Atta 10 KG', flat: 'B-301', residentName: 'Kiran Rao',      qty: 1, total: 585,  status: 'NEW',   orderId: 'GB-2026-00193' },
          { id: 'vo4', dealId, dealTitle: 'Aashirvaad Atta 10 KG', flat: 'B-405', residentName: 'Vikram Singh',   qty: 4, total: 2340, status: 'READY', orderId: 'GB-2026-00194' },
          { id: 'vo5', dealId, dealTitle: 'Aashirvaad Atta 10 KG', flat: 'C-201', residentName: 'Priya Sharma',   qty: 2, total: 1170, status: 'NEW',   orderId: 'GB-2026-00195' },
        ],
      };
    }
  },

  // ── Legacy Portal Methods for /vendor/tabs/* ──
  async getDashboardStats(): Promise<VendorDashboardStats> {
    return this.getVendorDashboardStats();
  },

  async getBookings(): Promise<VendorBooking[]> {
    try {
      const res = await api.get<VendorBooking[]>('/vendor/bookings');
      return res.data;
    } catch {
      return SAMPLE_BOOKINGS;
    }
  },

  async acceptBooking(id: string): Promise<void> {
    try { await api.post(`/vendor/bookings/${id}/accept`); } catch {}
  },

  async startBooking(id: string): Promise<void> {
    try { await api.post(`/vendor/bookings/${id}/start`); } catch {}
  },

  async completeBooking(id: string): Promise<void> {
    try { await api.post(`/vendor/bookings/${id}/complete`); } catch {}
  },

  async cancelBooking(id: string): Promise<void> {
    try { await api.post(`/vendor/bookings/${id}/cancel`); } catch {}
  },

  async getWorkOrders(): Promise<VendorWorkOrder[]> {
    try {
      const res = await api.get<VendorWorkOrder[]>('/vendor/work-orders');
      return res.data;
    } catch {
      return SAMPLE_WORK_ORDERS;
    }
  },

  async updateWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
    try { await api.put(`/vendor/work-orders/${id}/status`, { status }); } catch {}
  },

  async getInvoices(): Promise<VendorInvoice[]> {
    try {
      const res = await api.get<VendorInvoice[]>('/vendor/invoices');
      return res.data;
    } catch {
      return SAMPLE_INVOICES;
    }
  },

  async sendInvoice(data: any): Promise<void> {
    try { await api.post('/vendor/invoices', data); } catch {}
  },

  async getReviews(): Promise<VendorReview[]> {
    try {
      const res = await api.get<VendorReview[]>('/vendor/reviews');
      return res.data;
    } catch {
      return SAMPLE_REVIEWS;
    }
  },
  async createGroupDealCampaign(data: any): Promise<any> {
    try {
      const res = await api.post('/group-buying/vendor/deals', data);
      return res.data;
    } catch {
      return { id: 'deal-' + Date.now(), ...data, dealStatus: 'OPEN', currentParticipants: 0, committedQty: 0 };
    }
  },

  async getVendorActiveDeals(vendorId: string): Promise<any[]> {
    try {
      const res = await api.get(`/vendors/${vendorId}/deals`);
      return res.data;
    } catch {
      return [
        {
          id: 'd1', title: 'Aashirvaad Atta 10 KG', category: 'Grocery',
          pricingModel: 'THRESHOLD', mrp: 680, currentTierPrice: 585, nextTierPrice: 560,
          committedQty: 73, targetQty: 100, currentParticipants: 41,
          dealStatus: 'OPEN', daysLeft: 3, dealEndsAt: '2026-10-07T18:00:00Z',
          pickupPoint: 'Clubhouse Desk', fulfillmentType: 'BOTH',
        },
        {
          id: 'd5', title: 'Tata Sampann Toor Dal 5 KG', category: 'Grocery',
          pricingModel: 'TARGET_OR_CANCEL', mrp: 620, currentTierPrice: 520,
          committedQty: 62, targetQty: 100, currentParticipants: 44,
          dealStatus: 'OPEN', daysLeft: 4, dealEndsAt: '2026-10-08T18:00:00Z',
          pickupPoint: 'Clubhouse Desk', fulfillmentType: 'PICKUP',
        }
      ];
    }
  },

  async createGroupDeal(data: any): Promise<any> {
    try {
      const res = await api.post('/vendors/deals', data);
      return res.data;
    } catch {
      return {
        id: `d-${Date.now()}`,
        ...data,
        committedQty: 0,
        currentParticipants: 0,
        dealStatus: 'OPEN',
        createdAt: new Date().toISOString(),
      };
    }
  },

  async updateManifestOrderStatus(dealId: string, orderId: string, status: string): Promise<void> {
    try {
      await api.put(`/vendors/deals/${dealId}/manifest/orders/${orderId}`, { status });
    } catch {}
  },

  async submitDemandOffer(demandId: string, data: { offeredPrice: number; minimumQty: number; maximumQty?: number; deliveryDate?: string; terms?: string }): Promise<any> {
    try {
      const res = await api.post(`/group-buying/demand/${demandId}/offers`, data);
      return res.data;
    } catch {
      return { id: 'offer-' + Date.now(), demandId, ...data, status: 'PENDING' };
    }
  },
};
