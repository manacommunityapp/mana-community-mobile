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
  VendorSettlement,
  VendorCommerceAnalytics,
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

export const vendorService = {
  // ── Commerce Methods ──
  async getVendorProfile(vendorId: string): Promise<VendorProfile> {
    const res = await api.get<VendorProfile>(`/vendors/${vendorId}`);
    return res.data;
  },
  async getVendorProducts(vendorId: string): Promise<VendorProduct[]> {
    const res = await api.get<VendorProduct[]>(`/vendors/${vendorId}/products`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async getVendorDashboardStats(vendorId?: string): Promise<VendorDashboardStats> {
    const res = await api.get<VendorDashboardStats>(`/vendors/${vendorId ?? 'me'}/dashboard`);
    return res.data;
  },
  async getFulfillmentManifest(dealId: string): Promise<VendorFulfillmentManifest> {
    const res = await api.get<VendorFulfillmentManifest>(`/vendors/deals/${dealId}/manifest`);
    return res.data;
  },
  async getDashboardStats(): Promise<VendorDashboardStats> {
    return this.getVendorDashboardStats();
  },

  async getBookings(): Promise<VendorBooking[]> {
    const res = await api.get<VendorBooking[]>('/vendor/bookings');
    return Array.isArray(res.data) ? res.data : [];
  },
  async acceptBooking(id: string): Promise<void> {
    await api.post(`/vendor/bookings/${id}/accept`);
  },
  async startBooking(id: string): Promise<void> {
    await api.post(`/vendor/bookings/${id}/start`);
  },
  async completeBooking(id: string): Promise<void> {
    await api.post(`/vendor/bookings/${id}/complete`);
  },
  async cancelBooking(id: string): Promise<void> {
    await api.post(`/vendor/bookings/${id}/cancel`);
  },
  async getWorkOrders(): Promise<VendorWorkOrder[]> {
    const res = await api.get<VendorWorkOrder[]>('/vendor/work-orders');
    return Array.isArray(res.data) ? res.data : [];
  },
  async updateWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
    await api.put(`/vendor/work-orders/${id}/status`, { status });
  },
  async getInvoices(): Promise<VendorInvoice[]> {
    const res = await api.get<VendorInvoice[]>('/vendor/invoices');
    return Array.isArray(res.data) ? res.data : [];
  },
  async sendInvoice(data: any): Promise<void> {
    await api.post('/vendor/invoices', data);
  },
  async getReviews(): Promise<VendorReview[]> {
    const res = await api.get<VendorReview[]>('/vendor/reviews');
    return Array.isArray(res.data) ? res.data : [];
  },
  async createGroupDealCampaign(data: any): Promise<any> {
    const res = await api.post('/group-buying/vendor/deals', data);
    return res.data;
  },
  async getVendorActiveDeals(vendorId: string): Promise<any[]> {
    const res = await api.get<any[]>(`/vendors/${vendorId}/deals`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async createGroupDeal(data: any): Promise<any> {
    const res = await api.post('/vendors/deals', data);
    return res.data;
  },
  async updateManifestOrderStatus(dealId: string, orderId: string, status: string): Promise<void> {
    await api.put(`/vendors/deals/${dealId}/manifest/orders/${orderId}`, { status });
  },
  async submitDemandOffer(demandId: string, data: { offeredPrice: number; minimumQty: number; maximumQty?: number; deliveryDate?: string; terms?: string }): Promise<any> {
    const res = await api.post(`/group-buying/demand/${demandId}/offers`, data);
    return res.data;
  },
  async addProduct(productData: Partial<VendorProduct>): Promise<VendorProduct> {
    const res = await api.post<VendorProduct>('/vendors/products', productData);
    return res.data;
  },
  async updateProduct(productId: string, updates: Partial<VendorProduct>): Promise<void> {
    await api.put(`/vendors/products/${productId}`, updates);
  },
  async adjustStock(productId: string, newQty: number): Promise<void> {
    await api.post(`/vendors/products/${productId}/adjust-stock`, { availableQty: newQty });
  },
  async getSettlements(vendorId?: string): Promise<VendorSettlement[]> {
    const res = await api.get<VendorSettlement[]>(`/vendors/${vendorId || 'me'}/settlements`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async requestSettlementPayout(settlementId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/vendors/settlements/${settlementId}/request-payout`);
    return res.data;
  },

  async getCommerceAnalytics(vendorId?: string): Promise<VendorCommerceAnalytics> {
    const res = await api.get<VendorCommerceAnalytics>(`/vendors/${vendorId || 'me'}/analytics`);
    return res.data;
  },

};
