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
  const { data } = await api.get(`${BASE}/suppliers`, { params });
  return data;
}

export async function getSupplier(id: number): Promise<SupplierProfile> {
  const { data } = await api.get(`${BASE}/suppliers/${id}`);
  return data;
}

export async function getSupplierProducts(supplierId: number, category?: ProcurementCategory): Promise<SupplierProduct[]> {
  const { data } = await api.get(`${BASE}/suppliers/${supplierId}/products`, { params: { category } });
  return data;
}

export async function getAllProducts(params?: {
  category?: ProcurementCategory;
  search?: string;
  maxPrice?: number;
}): Promise<SupplierProduct[]> {
  const { data } = await api.get(`${BASE}/products`, { params });
  return data;
}

// ── RFQ Management ────────────────────────────────────────────────────────

export async function getRFQs(status?: string): Promise<ProcurementRFQ[]> {
  const { data } = await api.get(`${BASE}/rfqs`, { params: { status } });
  return data;
}

export async function getRFQ(id: number): Promise<ProcurementRFQ> {
  const { data } = await api.get(`${BASE}/rfqs/${id}`);
  return data;
}

export async function createRFQ(payload: CreateRFQPayload): Promise<ProcurementRFQ> {
  const { data } = await api.post(`${BASE}/rfqs`, payload);
  return data;
}

export async function publishRFQ(id: number): Promise<ProcurementRFQ> {
  const { data } = await api.post(`${BASE}/rfqs/${id}/publish`);
  return data;
}

export async function cancelRFQ(id: number, reason?: string): Promise<ProcurementRFQ> {
  const { data } = await api.post(`${BASE}/rfqs/${id}/cancel`, { reason });
  return data;
}

// ── Quotes ────────────────────────────────────────────────────────────────

export async function getRFQQuotes(rfqId: number): Promise<SupplierQuote[]> {
  const { data } = await api.get(`${BASE}/rfqs/${rfqId}/quotes`);
  return data;
}

export async function awardQuote(rfqId: number, quoteId: number): Promise<PurchaseOrder> {
  const { data } = await api.post(`${BASE}/rfqs/${rfqId}/award/${quoteId}`);
  return data;
}

// ── Purchase Orders ───────────────────────────────────────────────────────

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  const { data } = await api.get(`${BASE}/purchase-orders`, { params: { status } });
  return data;
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await api.get(`${BASE}/purchase-orders/${id}`);
  return data;
}

export async function updatePOStatus(id: number, status: string, notes?: string): Promise<PurchaseOrder> {
  const { data } = await api.post(`${BASE}/purchase-orders/${id}/status`, { status, notes });
  return data;
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function getProcurementStats(): Promise<ProcurementStats> {
  const { data } = await api.get(`${BASE}/stats`);
  return data;
}

// ── Phase 2: Supplier Management ──────────────────────────────────────────

export async function createSupplier(payload: import('../types/procurement').CreateSupplierPayload): Promise<SupplierProfile> {
  const { data } = await api.post(`${BASE}/suppliers`, payload);
  return data;
}

export async function verifySupplier(id: number): Promise<SupplierProfile> {
  const { data } = await api.put(`${BASE}/suppliers/${id}/verify`);
  return data;
}

export async function addSupplierProduct(
  supplierId: number,
  payload: import('../types/procurement').CreateProductPayload,
): Promise<SupplierProduct> {
  const { data } = await api.post(`${BASE}/suppliers/${supplierId}/products`, payload);
  return data;
}

// ── Phase 2: Quote Submission ─────────────────────────────────────────────

export async function submitQuote(
  rfqId: number,
  payload: import('../types/procurement').SubmitQuotePayload,
): Promise<SupplierQuote> {
  const { data } = await api.post(`${BASE}/rfqs/${rfqId}/quotes`, payload);
  return data;
}

// ── Phase 2: Analytics ────────────────────────────────────────────────────

export async function getProcurementAnalytics(): Promise<import('../types/procurement').ProcurementAnalytics> {
  const { data } = await api.get(`${BASE}/analytics`);
  return data;
}

// ── Phase 4: BulkBuy Campaigns ────────────────────────────────────────────

export async function getBulkBuyCampaigns(
  status?: string,
): Promise<import('../types/procurement').BulkBuyCampaign[]> {
  const { data } = await api.get(`${BASE}/bulk-buy/campaigns`, { params: { status } });
  return data;
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
  const { data } = await api.post(`${BASE}/bulk-buy/campaigns`, payload);
  return data;
}

export async function activateBulkBuyCampaign(
  id: number,
): Promise<import('../types/procurement').BulkBuyCampaign> {
  const { data } = await api.post(`${BASE}/bulk-buy/campaigns/${id}/activate`);
  return data;
}

export async function commitToCampaign(
  campaignId: number,
  payload: import('../types/procurement').CommitToCampaignPayload,
): Promise<import('../types/procurement').BulkBuyCommitment> {
  const { data } = await api.post(`${BASE}/bulk-buy/campaigns/${campaignId}/commit`, payload);
  return data;
}

export async function cancelCampaignCommitment(campaignId: number): Promise<void> {
  await api.delete(`${BASE}/bulk-buy/campaigns/${campaignId}/commit`);
}

export async function getCampaignCommitments(
  campaignId: number,
): Promise<import('../types/procurement').BulkBuyCommitment[]> {
  const { data } = await api.get(`${BASE}/bulk-buy/campaigns/${campaignId}/commitments`);
  return data;
}

// ── Phase 5: Reverse Auctions ─────────────────────────────────────────────

export async function getOpenAuctions(): Promise<import('../types/procurement').AuctionRFQ[]> {
  const { data } = await api.get(`${BASE}/auctions`);
  return data;
}

export async function enableAuctionMode(
  rfqId: number,
  payload: import('../types/procurement').EnableAuctionPayload,
): Promise<import('../types/procurement').AuctionRFQ> {
  const { data } = await api.post(`${BASE}/rfqs/${rfqId}/enable-auction`, payload);
  return data;
}

export async function getAuctionBids(
  rfqId: number,
): Promise<import('../types/procurement').AuctionBid[]> {
  const { data } = await api.get(`${BASE}/auctions/${rfqId}/bids`);
  return data;
}

export async function placeAuctionBid(
  rfqId: number,
  payload: import('../types/procurement').PlaceAuctionBidPayload,
): Promise<import('../types/procurement').AuctionBid> {
  const { data } = await api.post(`${BASE}/auctions/${rfqId}/bids`, payload);
  return data;
}

export async function withdrawAuctionBid(rfqId: number): Promise<void> {
  await api.delete(`${BASE}/auctions/${rfqId}/bids`);
}

export async function awardAuctionBid(rfqId: number, bidId: number): Promise<import('../types/procurement').AuctionBid> {
  const { data } = await api.post(`${BASE}/auctions/${rfqId}/bids/${bidId}/award`);
  return data;
}

// ── Phase 7: Purchase Calendar ────────────────────────────────────────────

export async function getCalendarEntries(): Promise<import('../types/procurement').PurchaseCalendarEntry[]> {
  const { data } = await api.get(`${BASE}/calendar`);
  return data;
}

export async function getUpcomingCalendarItems(): Promise<import('../types/procurement').PurchaseCalendarEntry[]> {
  const { data } = await api.get(`${BASE}/calendar/upcoming`);
  return data;
}

export async function createCalendarEntry(
  payload: import('../types/procurement').CreateCalendarEntryPayload,
): Promise<import('../types/procurement').PurchaseCalendarEntry> {
  const { data } = await api.post(`${BASE}/calendar`, payload);
  return data;
}

export async function updateCalendarEntry(
  id: number,
  payload: Partial<import('../types/procurement').CreateCalendarEntryPayload>,
): Promise<import('../types/procurement').PurchaseCalendarEntry> {
  const { data } = await api.put(`${BASE}/calendar/${id}`, payload);
  return data;
}

export async function deleteCalendarEntry(id: number): Promise<void> {
  await api.delete(`${BASE}/calendar/${id}`);
}

export async function createRFQFromCalendar(id: number): Promise<import('../types/procurement').ProcurementRFQ> {
  const { data } = await api.post(`${BASE}/calendar/${id}/create-rfq`);
  return data;
}

// ── Phase 8: Supplier Reliability ────────────────────────────────────────────

export async function getSupplierPerformance(
  supplierId: number,
): Promise<import('../types/procurement').SupplierPerformanceEvent[]> {
  const { data } = await api.get(`${BASE}/suppliers/${supplierId}/performance`);
  return data;
}

export async function recordPerformanceEvent(
  supplierId: number,
  payload: import('../types/procurement').RecordPerformancePayload,
): Promise<import('../types/procurement').SupplierReliabilityScore> {
  const { data } = await api.post(`${BASE}/suppliers/${supplierId}/performance`, payload);
  return data;
}

export async function getSupplierReliability(
  supplierId: number,
): Promise<import('../types/procurement').SupplierReliabilityScore> {
  const { data } = await api.get(`${BASE}/suppliers/${supplierId}/reliability`);
  return data;
}

export async function getReliabilityLeaderboard(): Promise<import('../types/procurement').SupplierReliabilityScore[]> {
  const { data } = await api.get(`${BASE}/suppliers/reliability-leaderboard`);
  return data;
}

// ── Phase 9: Mana Buddy AI + Reorder + Savings ────────────────────────────────

export async function parseBuddyRFQ(text: string): Promise<import('../types/procurement').BuddyRFQDraft> {
  const { data } = await api.post(`${BASE}/mana-buddy/parse-rfq`, { text });
  return data;
}

export async function getReorderSuggestions(): Promise<import('../types/procurement').ReorderSuggestion[]> {
  const { data } = await api.get(`${BASE}/reorder-suggestions`);
  return data;
}

export async function getSavingsDashboard(): Promise<import('../types/procurement').SavingsDashboard> {
  const { data } = await api.get(`${BASE}/savings-dashboard`);
  return data;
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
