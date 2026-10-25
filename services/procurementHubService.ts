import api from './apiClient';
import type {
  SupplierProfile, SupplierProduct, ProcurementRFQ, SupplierQuote,
  PurchaseOrder, ProcurementStats, CreateRFQPayload, ProcurementCategory,
} from '../types/procurement';

const BASE = '/api/procurement-hub';

// ── Supplier Marketplace ───────────────────────────────────────────────────

export async function getSuppliers(params?: {
  category?: ProcurementCategory;
  city?: string;
  search?: string;
  verified?: boolean;
}): Promise<SupplierProfile[]> {
  try {
    const { data } = await api.get(`${BASE}/suppliers`, { params });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getSupplier(id: number): Promise<SupplierProfile> {
  const { data } = await api.get(`${BASE}/suppliers/${id}`);
  return data;
}

export async function getSupplierProducts(supplierId: number, category?: ProcurementCategory): Promise<SupplierProduct[]> {
  try {
    const { data } = await api.get(`${BASE}/suppliers/${supplierId}/products`, { params: { category } });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAllProducts(params?: {
  category?: ProcurementCategory;
  search?: string;
  maxPrice?: number;
}): Promise<SupplierProduct[]> {
  try {
    const { data } = await api.get(`${BASE}/products`, { params });
    return data ?? [];
  } catch {
    return [];
  }
}

// ── RFQ Management ────────────────────────────────────────────────────────

export async function getRFQs(status?: string): Promise<ProcurementRFQ[]> {
  try {
    const { data } = await api.get(`${BASE}/rfqs`, { params: { status } });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getRFQ(id: number): Promise<ProcurementRFQ> {
  const { data } = await api.get(`${BASE}/rfqs/${id}`);
  return data;
}

export async function createRFQ(payload: CreateRFQPayload): Promise<ProcurementRFQ> {
  try {
    const { data } = await api.post(`${BASE}/rfqs`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to create RFQ. Please try again.');
  }
}

export async function publishRFQ(id: number): Promise<ProcurementRFQ> {
  try {
    const { data } = await api.post(`${BASE}/rfqs/${id}/publish`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to publish RFQ.');
  }
}

export async function cancelRFQ(id: number, reason?: string): Promise<ProcurementRFQ> {
  try {
    const { data } = await api.post(`${BASE}/rfqs/${id}/cancel`, { reason });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to cancel RFQ.');
  }
}

// ── Quotes ────────────────────────────────────────────────────────────────

export async function getRFQQuotes(rfqId: number): Promise<SupplierQuote[]> {
  try {
    const { data } = await api.get(`${BASE}/rfqs/${rfqId}/quotes`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function awardQuote(rfqId: number, quoteId: number): Promise<PurchaseOrder> {
  try {
    const { data } = await api.post(`${BASE}/rfqs/${rfqId}/award/${quoteId}`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to award quote. Please try again.');
  }
}

// ── Purchase Orders ───────────────────────────────────────────────────────

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  try {
    const { data } = await api.get(`${BASE}/purchase-orders`, { params: { status } });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await api.get(`${BASE}/purchase-orders/${id}`);
  return data;
}

export async function updatePOStatus(id: number, status: string, notes?: string): Promise<PurchaseOrder> {
  try {
    const { data } = await api.post(`${BASE}/purchase-orders/${id}/status`, { status, notes });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to update purchase order status.');
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function getProcurementStats(): Promise<ProcurementStats> {
  try {
    const { data } = await api.get(`${BASE}/stats`);
    return data;
  } catch {
    return {} as ProcurementStats;
  }
}

// ── Phase 2: Supplier Management ──────────────────────────────────────────

export async function createSupplier(payload: import('../types/procurement').CreateSupplierPayload): Promise<SupplierProfile> {
  try {
    const { data } = await api.post(`${BASE}/suppliers`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to create supplier profile. Please try again.');
  }
}

export async function verifySupplier(id: number): Promise<SupplierProfile> {
  try {
    const { data } = await api.put(`${BASE}/suppliers/${id}/verify`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to verify supplier.');
  }
}

export async function addSupplierProduct(
  supplierId: number,
  payload: import('../types/procurement').CreateProductPayload,
): Promise<SupplierProduct> {
  try {
    const { data } = await api.post(`${BASE}/suppliers/${supplierId}/products`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to add product. Please try again.');
  }
}

// ── Phase 2: Quote Submission ─────────────────────────────────────────────

export async function submitQuote(
  rfqId: number,
  payload: import('../types/procurement').SubmitQuotePayload,
): Promise<SupplierQuote> {
  try {
    const { data } = await api.post(`${BASE}/rfqs/${rfqId}/quotes`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to submit quote. Please try again.');
  }
}

// ── Phase 2: Analytics ────────────────────────────────────────────────────

export async function getProcurementAnalytics(): Promise<import('../types/procurement').ProcurementAnalytics> {
  try {
    const { data } = await api.get(`${BASE}/analytics`);
    return data;
  } catch {
    return {} as import('../types/procurement').ProcurementAnalytics;
  }
}

// ── Phase 4: BulkBuy Campaigns ────────────────────────────────────────────

export async function getBulkBuyCampaigns(
  status?: string,
): Promise<import('../types/procurement').BulkBuyCampaign[]> {
  try {
    const { data } = await api.get(`${BASE}/bulk-buy/campaigns`, { params: { status } });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getBulkBuyCampaign(
  id: number,
): Promise<import('../types/procurement').BulkBuyCampaign> {
  const { data } = await api.get(`${BASE}/bulk-buy/campaigns/${id}`);
  return data;
}

export async function createBulkBuyCampaign(
  payload: import('../types/procurement').CreateBulkBuyCampaignPayload,
): Promise<import('../types/procurement').BulkBuyCampaign> {
  try {
    const { data } = await api.post(`${BASE}/bulk-buy/campaigns`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to create campaign. Please try again.');
  }
}

export async function activateBulkBuyCampaign(
  id: number,
): Promise<import('../types/procurement').BulkBuyCampaign> {
  try {
    const { data } = await api.post(`${BASE}/bulk-buy/campaigns/${id}/activate`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to activate campaign.');
  }
}

export async function commitToCampaign(
  campaignId: number,
  payload: import('../types/procurement').CommitToCampaignPayload,
): Promise<import('../types/procurement').BulkBuyCommitment> {
  try {
    const { data } = await api.post(`${BASE}/bulk-buy/campaigns/${campaignId}/commit`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to commit to campaign. Please try again.');
  }
}

export async function cancelCampaignCommitment(campaignId: number): Promise<void> {
  try {
    await api.delete(`${BASE}/bulk-buy/campaigns/${campaignId}/commit`);
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to cancel commitment.');
  }
}

export async function getCampaignCommitments(
  campaignId: number,
): Promise<import('../types/procurement').BulkBuyCommitment[]> {
  try {
    const { data } = await api.get(`${BASE}/bulk-buy/campaigns/${campaignId}/commitments`);
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Phase 5: Reverse Auctions ─────────────────────────────────────────────

export async function getOpenAuctions(): Promise<import('../types/procurement').AuctionRFQ[]> {
  try {
    const { data } = await api.get(`${BASE}/auctions`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function enableAuctionMode(
  rfqId: number,
  payload: import('../types/procurement').EnableAuctionPayload,
): Promise<import('../types/procurement').AuctionRFQ> {
  try {
    const { data } = await api.post(`${BASE}/rfqs/${rfqId}/enable-auction`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to enable auction mode.');
  }
}

export async function getAuctionBids(
  rfqId: number,
): Promise<import('../types/procurement').AuctionBid[]> {
  try {
    const { data } = await api.get(`${BASE}/auctions/${rfqId}/bids`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function placeAuctionBid(
  rfqId: number,
  payload: import('../types/procurement').PlaceAuctionBidPayload,
): Promise<import('../types/procurement').AuctionBid> {
  try {
    const { data } = await api.post(`${BASE}/auctions/${rfqId}/bids`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to place bid. Please try again.');
  }
}

export async function withdrawAuctionBid(rfqId: number): Promise<void> {
  try {
    await api.delete(`${BASE}/auctions/${rfqId}/bids`);
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to withdraw bid.');
  }
}

export async function awardAuctionBid(rfqId: number, bidId: number): Promise<import('../types/procurement').AuctionBid> {
  try {
    const { data } = await api.post(`${BASE}/auctions/${rfqId}/bids/${bidId}/award`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to award bid.');
  }
}

// ── Phase 7: Purchase Calendar ────────────────────────────────────────────

export async function getCalendarEntries(): Promise<import('../types/procurement').PurchaseCalendarEntry[]> {
  try {
    const { data } = await api.get(`${BASE}/calendar`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUpcomingCalendarItems(): Promise<import('../types/procurement').PurchaseCalendarEntry[]> {
  try {
    const { data } = await api.get(`${BASE}/calendar/upcoming`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createCalendarEntry(
  payload: import('../types/procurement').CreateCalendarEntryPayload,
): Promise<import('../types/procurement').PurchaseCalendarEntry> {
  try {
    const { data } = await api.post(`${BASE}/calendar`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to create calendar entry. Please try again.');
  }
}

export async function updateCalendarEntry(
  id: number,
  payload: Partial<import('../types/procurement').CreateCalendarEntryPayload>,
): Promise<import('../types/procurement').PurchaseCalendarEntry> {
  try {
    const { data } = await api.put(`${BASE}/calendar/${id}`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to update calendar entry.');
  }
}

export async function deleteCalendarEntry(id: number): Promise<void> {
  try {
    await api.delete(`${BASE}/calendar/${id}`);
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to delete calendar entry.');
  }
}

export async function createRFQFromCalendar(id: number): Promise<import('../types/procurement').ProcurementRFQ> {
  try {
    const { data } = await api.post(`${BASE}/calendar/${id}/create-rfq`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to create RFQ from calendar entry.');
  }
}

// ── Phase 8: Supplier Reliability ────────────────────────────────────────────

export async function getSupplierPerformance(
  supplierId: number,
): Promise<import('../types/procurement').SupplierPerformanceEvent[]> {
  try {
    const { data } = await api.get(`${BASE}/suppliers/${supplierId}/performance`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function recordPerformanceEvent(
  supplierId: number,
  payload: import('../types/procurement').RecordPerformancePayload,
): Promise<import('../types/procurement').SupplierReliabilityScore> {
  try {
    const { data } = await api.post(`${BASE}/suppliers/${supplierId}/performance`, payload);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to record performance event.');
  }
}

export async function getSupplierReliability(
  supplierId: number,
): Promise<import('../types/procurement').SupplierReliabilityScore> {
  try {
    const { data } = await api.get(`${BASE}/suppliers/${supplierId}/reliability`);
    return data;
  } catch {
    return {} as import('../types/procurement').SupplierReliabilityScore;
  }
}

export async function getReliabilityLeaderboard(): Promise<import('../types/procurement').SupplierReliabilityScore[]> {
  try {
    const { data } = await api.get(`${BASE}/suppliers/reliability-leaderboard`);
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Phase 9: Mana Buddy AI + Reorder + Savings ────────────────────────────────

export async function parseBuddyRFQ(text: string): Promise<import('../types/procurement').BuddyRFQDraft> {
  try {
    const { data } = await api.post(`${BASE}/mana-buddy/parse-rfq`, { text });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to parse RFQ. Please try again.');
  }
}

export async function getReorderSuggestions(): Promise<import('../types/procurement').ReorderSuggestion[]> {
  try {
    const { data } = await api.get(`${BASE}/reorder-suggestions`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getSavingsDashboard(): Promise<import('../types/procurement').SavingsDashboard> {
  try {
    const { data } = await api.get(`${BASE}/savings-dashboard`);
    return data;
  } catch {
    return {} as import('../types/procurement').SavingsDashboard;
  }
}

const procurementHubService = {
  getSuppliers, getSupplier, getSupplierProducts, getAllProducts,
  getRFQs, getRFQ, createRFQ, publishRFQ, cancelRFQ,
  getRFQQuotes, awardQuote,
  getPurchaseOrders, getPurchaseOrder, updatePOStatus,
  getProcurementStats,
  createSupplier, verifySupplier, addSupplierProduct,
  submitQuote, getProcurementAnalytics,
  getBulkBuyCampaigns, getBulkBuyCampaign, createBulkBuyCampaign,
  activateBulkBuyCampaign, commitToCampaign, cancelCampaignCommitment,
  getCampaignCommitments,
  getOpenAuctions, enableAuctionMode, getAuctionBids,
  placeAuctionBid, withdrawAuctionBid, awardAuctionBid,
  getCalendarEntries, getUpcomingCalendarItems,
  createCalendarEntry, updateCalendarEntry, deleteCalendarEntry, createRFQFromCalendar,
  getSupplierPerformance, recordPerformanceEvent, getSupplierReliability, getReliabilityLeaderboard,
  parseBuddyRFQ, getReorderSuggestions, getSavingsDashboard,
};

export default procurementHubService;
