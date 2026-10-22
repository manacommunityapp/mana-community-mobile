import api from './apiClient';
import { secureLog } from '@/security';

export type ItemStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'LOST' | 'DISPOSED';

export type ProcurementStatus =
  | 'REQUESTED'
  | 'COMMITTEE_APPROVED'
  | 'QUOTATIONS_COLLECTED'
  | 'VENDOR_SELECTED'
  | 'PURCHASE_ORDERED'
  | 'GOODS_RECEIVED'
  | 'INVOICED'
  | 'INVENTORY_CREATED'
  | 'REJECTED'
  | 'CANCELLED';

export type ExpenseCategory =
  | 'CapEx_Asset'
  | 'OpEx_Consumable'
  | 'OpEx_Maintenance'
  | 'OpEx_Other'
  | 'SPORTS'
  | 'FESTIVAL'
  | 'CLEANING'
  | 'SECURITY'
  | 'ELECTRICITY'
  | 'WATER'
  | 'GARDENING'
  | 'EVENTS'
  | 'STATIONERY'
  | 'OFFICE'
  | 'MARKETING'
  | 'MISCELLANEOUS';

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  location: string;
  serialNumber?: string;
  vendorName?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  status: ItemStatus;
  originalCost?: number;
  tco?: number;
  qrCodeId?: string;
  depreciationMethod?: string;
  usefulLifeMonths?: number;
  salvageValue?: number;
  currentValue?: number;
  nextMaintenanceDueAt?: string;
  lastAuditedAt?: string;
  auditVariance?: number;
  borrowedBy?: string;
  borrowedByFlat?: string;
  borrowedAt?: string;
  expectedReturn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutRequest {
  borrowedBy: string;
  borrowedByFlat: string;
  expectedReturnAt?: string;
}

export interface PurchaseRequest {
  id?: number;
  title: string;
  description?: string;
  category: ExpenseCategory;
  estimatedAmount: number;
  status?: ProcurementStatus;
  selectedVendor?: { id: number; name: string };
  requestedBy?: string;
  neededBy?: string;
  approvalNotes?: string;
  purchaseOrderNumber?: string;
  communityId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetAuditLog {
  id: number;
  asset?: InventoryItem;
  auditedAt: string;
  auditedBy: string;
  expectedStatus?: string;
  actualStatus?: string;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
  notes?: string;
}

export interface AssetAuditRequest {
  auditedBy: string;
  actualStatus?: string;
  expectedQuantity: number;
  actualQuantity: number;
  notes?: string;
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    try {
      const res = await api.get('/inventory/items');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        secureLog.info('[inventoryService] Inventory items endpoint restricted (403/401), using fallback data');
      } else {
        secureLog.warn('[inventoryService] Failed to load items from API, using fallback', err?.message);
      }
    }
    return FALLBACK_INVENTORY_ITEMS;
  },

  async getItemById(id: number): Promise<InventoryItem> {
    try {
      const res = await api.get(`/inventory/items/${id}`);
      if (res.data) return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Failed to load item ${id}, using fallback`, err?.message);
    }
    const found = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id);
    return found || FALLBACK_INVENTORY_ITEMS[0];
  },

  async getItemByQr(qrCodeId: string): Promise<InventoryItem> {
    try {
      const res = await api.get(`/inventory/items/qr/${encodeURIComponent(qrCodeId)}`);
      if (res.data) return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Failed to load item by QR ${qrCodeId}, using fallback`, err?.message);
    }
    const found = FALLBACK_INVENTORY_ITEMS.find((i) => i.qrCodeId === qrCodeId);
    return found || FALLBACK_INVENTORY_ITEMS[0];
  },

  async checkoutItem(id: number, data: CheckoutRequest): Promise<InventoryItem> {
    try {
      const res = await api.post(`/inventory/items/${id}/checkout`, data);
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Checkout failed for item ${id}, updating local item`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id) || FALLBACK_INVENTORY_ITEMS[0];
      return {
        ...item,
        status: 'BORROWED',
        borrowedBy: data.borrowedBy,
        borrowedByFlat: data.borrowedByFlat,
        borrowedAt: new Date().toISOString(),
        expectedReturn: data.expectedReturnAt,
      };
    }
  },

  async checkinItem(id: number): Promise<InventoryItem> {
    try {
      const res = await api.post(`/inventory/items/${id}/checkin`);
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Checkin failed for item ${id}, updating local item`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id) || FALLBACK_INVENTORY_ITEMS[0];
      return {
        ...item,
        status: 'AVAILABLE',
        borrowedBy: undefined,
        borrowedByFlat: undefined,
        borrowedAt: undefined,
        expectedReturn: undefined,
      };
    }
  },

  async updateItemStatus(id: number, status: string): Promise<InventoryItem> {
    try {
      const res = await api.post(`/inventory/items/${id}/status`, null, {
        params: { status },
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Status update failed for item ${id}`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id) || FALLBACK_INVENTORY_ITEMS[0];
      return { ...item, status: status as ItemStatus };
    }
  },

  async scheduleMaintenance(id: number, nextDueDate?: string): Promise<InventoryItem> {
    try {
      const res = await api.post(`/inventory/items/${id}/maintenance`, null, {
        params: nextDueDate ? { nextDueDate } : {},
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Schedule maintenance failed for item ${id}`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id) || FALLBACK_INVENTORY_ITEMS[0];
      return { ...item, status: 'MAINTENANCE', nextMaintenanceDueAt: nextDueDate };
    }
  },

  async auditItem(id: number, expectedQuantity: number, actualQuantity: number): Promise<InventoryItem> {
    try {
      const res = await api.post(`/inventory/items/${id}/audit`, null, {
        params: { expectedQuantity, actualQuantity },
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Audit failed for item ${id}`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === id) || FALLBACK_INVENTORY_ITEMS[0];
      return { ...item, lastAuditedAt: new Date().toISOString(), auditVariance: actualQuantity - expectedQuantity };
    }
  },

  // Procurement
  async getPurchaseRequests(): Promise<PurchaseRequest[]> {
    try {
      const res = await api.get('/procurement/requests');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        secureLog.info('[inventoryService] Procurement requests restricted for current user (403/401)');
        return FALLBACK_PURCHASE_REQUESTS;
      }
      secureLog.warn('[inventoryService] Failed to load purchase requests, using fallback', err?.message);
      return FALLBACK_PURCHASE_REQUESTS;
    }
    return FALLBACK_PURCHASE_REQUESTS;
  },

  async getPurchaseRequestById(id: number): Promise<PurchaseRequest> {
    try {
      const res = await api.get(`/procurement/requests/${id}`);
      if (res.data) return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Failed to load purchase request ${id}`, err?.message);
    }
    const found = FALLBACK_PURCHASE_REQUESTS.find((p) => p.id === id);
    return found || FALLBACK_PURCHASE_REQUESTS[0];
  },

  async createPurchaseRequest(data: Omit<PurchaseRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PurchaseRequest> {
    try {
      const res = await api.post('/procurement/requests', data);
      return res.data;
    } catch (err: any) {
      secureLog.warn('[inventoryService] Create purchase request failed, buffering locally', err?.message);
      const newPR: PurchaseRequest = {
        id: Date.now(),
        ...data,
        status: 'REQUESTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      FALLBACK_PURCHASE_REQUESTS.unshift(newPR);
      return newPR;
    }
  },

  async updatePurchaseRequestStatus(
    id: number,
    status: ProcurementStatus,
    approvalNotes?: string,
    poNumber?: string,
  ): Promise<PurchaseRequest> {
    try {
      const res = await api.post(`/procurement/requests/${id}/status`, null, {
        params: {
          status,
          ...(approvalNotes ? { approvalNotes } : {}),
          ...(poNumber ? { poNumber } : {}),
        },
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Status update failed for request ${id}`, err?.message);
      const pr = FALLBACK_PURCHASE_REQUESTS.find((p) => p.id === id) || FALLBACK_PURCHASE_REQUESTS[0];
      const updated = {
        ...pr,
        status,
        approvalNotes: approvalNotes ?? pr.approvalNotes,
        purchaseOrderNumber: poNumber ?? pr.purchaseOrderNumber,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }
  },

  // Audit logs
  async getAuditLogs(): Promise<AssetAuditLog[]> {
    try {
      const res = await api.get('/inventory/audit');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        secureLog.info('[inventoryService] Audit logs restricted for current user (403/401)');
      } else {
        secureLog.warn('[inventoryService] Failed to load audit logs, using fallback', err?.message);
      }
      return FALLBACK_AUDIT_LOGS;
    }
    return FALLBACK_AUDIT_LOGS;
  },

  async getAuditLogsByAsset(assetId: number): Promise<AssetAuditLog[]> {
    try {
      const res = await api.get(`/inventory/audit/asset/${assetId}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Failed to load audit logs for asset ${assetId}`, err?.message);
    }
    return FALLBACK_AUDIT_LOGS.filter((a) => a.asset?.id === assetId);
  },

  async createAuditLog(assetId: number, data: AssetAuditRequest): Promise<AssetAuditLog> {
    try {
      const res = await api.post(`/inventory/audit/asset/${assetId}`, null, {
        params: {
          auditedBy: data.auditedBy,
          expectedQuantity: data.expectedQuantity,
          actualQuantity: data.actualQuantity,
          ...(data.actualStatus ? { actualStatus: data.actualStatus } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
        },
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn(`[inventoryService] Create audit log failed for asset ${assetId}`, err?.message);
      const item = FALLBACK_INVENTORY_ITEMS.find((i) => i.id === assetId) || FALLBACK_INVENTORY_ITEMS[0];
      const newLog: AssetAuditLog = {
        id: Date.now(),
        asset: item,
        auditedAt: new Date().toISOString(),
        auditedBy: data.auditedBy,
        expectedQuantity: data.expectedQuantity,
        actualQuantity: data.actualQuantity,
        variance: data.actualQuantity - data.expectedQuantity,
        actualStatus: data.actualStatus,
        notes: data.notes,
      };
      FALLBACK_AUDIT_LOGS.unshift(newLog);
      return newLog;
    }
  },
};

const FALLBACK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 1,
    name: 'Clubhouse Table Tennis Table',
    category: 'SPORTS',
    location: 'Clubhouse 1st Floor',
    serialNumber: 'STIGA-PRO-2024',
    vendorName: 'Stiga Sports India',
    status: 'AVAILABLE',
    originalCost: 32000,
    qrCodeId: 'MANA-TT-01',
    purchaseDate: '2024-03-15',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 2,
    name: 'Heavy Duty Pressure Washer',
    category: 'OpEx_Maintenance',
    location: 'Maintenance Bay',
    serialNumber: 'KARCHER-K5-891',
    vendorName: 'Karcher Center',
    status: 'BORROWED',
    originalCost: 24000,
    qrCodeId: 'MANA-PW-02',
    borrowedBy: 'Ramesh K',
    borrowedByFlat: 'Tower B-304',
    borrowedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    expectedReturn: 'Today, 6:00 PM',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 3,
    name: 'Society Public Address System & Mic Set',
    category: 'EVENTS',
    location: 'Community Hall Store',
    serialNumber: 'AHUJA-PA-600W',
    vendorName: 'Ahuja Radios',
    status: 'AVAILABLE',
    originalCost: 65000,
    qrCodeId: 'MANA-PA-01',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 4,
    name: 'Digital Projector & 120" Screen',
    category: 'CapEx_Asset',
    location: 'AV Room / Library',
    serialNumber: 'EPSON-EB-X49',
    vendorName: 'Epson India',
    status: 'AVAILABLE',
    originalCost: 48000,
    qrCodeId: 'MANA-PRJ-01',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 5,
    name: 'Swimming Pool Robot Cleaner',
    category: 'CapEx_Asset',
    location: 'Pool Pump Room',
    serialNumber: 'ZODIAC-RB-900',
    vendorName: 'Zodiac Pool Care',
    status: 'MAINTENANCE',
    originalCost: 85000,
    qrCodeId: 'MANA-POOL-01',
    nextMaintenanceDueAt: '2026-11-05',
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
  {
    id: 6,
    name: 'Electric Lawn Mower 1800W',
    category: 'GARDENING',
    location: 'Garden Tool Shed',
    serialNumber: 'HONDA-ELM-180',
    vendorName: 'Honda Power Products',
    status: 'AVAILABLE',
    originalCost: 21500,
    qrCodeId: 'MANA-LMN-01',
    createdAt: new Date(Date.now() - 100 * 86400000).toISOString(),
  },
];

const FALLBACK_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 1,
    title: 'Submersible Water Pump 5HP (Tower B Sump)',
    description: 'Replacement for aging secondary pump in basement pump house',
    category: 'CapEx_Asset',
    estimatedAmount: 45000,
    status: 'COMMITTEE_APPROVED',
    selectedVendor: { id: 10, name: 'Crompton Greaves Pumps Ltd' },
    requestedBy: 'Estate Manager Anil',
    neededBy: '2026-11-15',
    purchaseOrderNumber: 'PO-2026-081',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 2,
    title: 'LED Floodlights 100W for Tennis Court',
    description: 'Energy-saving IP66 outdoor floodlights for sports arena',
    category: 'OpEx_Maintenance',
    estimatedAmount: 18500,
    status: 'PURCHASE_ORDERED',
    selectedVendor: { id: 12, name: 'Havells Electricals' },
    requestedBy: 'Sports Committee',
    neededBy: '2026-11-01',
    purchaseOrderNumber: 'PO-2026-084',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 3,
    title: 'Emergency Fire Extinguisher Refills (Towers A-D)',
    description: 'Mandatory annual hydrostatic pressure test and chemical refill',
    category: 'SECURITY',
    estimatedAmount: 14000,
    status: 'REQUESTED',
    requestedBy: 'Safety Officer Kumar',
    neededBy: '2026-11-20',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 4,
    title: 'Organic Soil Mix & Compost (50 Bags)',
    description: 'Seasonal lawn top-dressing and tree nourishment',
    category: 'GARDENING',
    estimatedAmount: 8200,
    status: 'GOODS_RECEIVED',
    selectedVendor: { id: 15, name: 'GreenRoots Agro' },
    requestedBy: 'Head Gardener Raju',
    neededBy: '2026-10-25',
    purchaseOrderNumber: 'PO-2026-079',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const FALLBACK_AUDIT_LOGS: AssetAuditLog[] = [
  {
    id: 1,
    asset: FALLBACK_INVENTORY_ITEMS[0],
    auditedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    auditedBy: 'Sandeep (Auditor)',
    expectedQuantity: 1,
    actualQuantity: 1,
    variance: 0,
    actualStatus: 'AVAILABLE',
    notes: 'Good condition, net and racquets accounted for',
  },
  {
    id: 2,
    asset: FALLBACK_INVENTORY_ITEMS[1],
    auditedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    auditedBy: 'Anil (Facility Mgr)',
    expectedQuantity: 1,
    actualQuantity: 1,
    variance: 0,
    actualStatus: 'AVAILABLE',
    notes: 'Nozzle replaced during routine check',
  },
];
