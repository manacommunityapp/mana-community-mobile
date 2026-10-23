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
};

export default procurementHubService;
