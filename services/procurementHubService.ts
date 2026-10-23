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

const procurementHubService = {
  getSuppliers, getSupplier, getSupplierProducts, getAllProducts,
  getRFQs, getRFQ, createRFQ, publishRFQ, cancelRFQ,
  getRFQQuotes, awardQuote,
  getPurchaseOrders, getPurchaseOrder, updatePOStatus,
  getProcurementStats,
};

export default procurementHubService;
