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
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[inventoryService] Failed to load items', err);
      throw err;
    }
  },

  async getItemById(id: number): Promise<InventoryItem> {
    const res = await api.get(`/inventory/items/${id}`);
    return res.data;
  },

  async getItemByQr(qrCodeId: string): Promise<InventoryItem> {
    const res = await api.get(`/inventory/items/qr/${encodeURIComponent(qrCodeId)}`);
    return res.data;
  },

  async checkoutItem(id: number, data: CheckoutRequest): Promise<InventoryItem> {
    const res = await api.post(`/inventory/items/${id}/checkout`, data);
    return res.data;
  },

  async checkinItem(id: number): Promise<InventoryItem> {
    const res = await api.post(`/inventory/items/${id}/checkin`);
    return res.data;
  },

  async updateItemStatus(id: number, status: string): Promise<InventoryItem> {
    const res = await api.post(`/inventory/items/${id}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  async scheduleMaintenance(id: number, nextDueDate?: string): Promise<InventoryItem> {
    const res = await api.post(`/inventory/items/${id}/maintenance`, null, {
      params: nextDueDate ? { nextDueDate } : {},
    });
    return res.data;
  },

  async auditItem(id: number, expectedQuantity: number, actualQuantity: number): Promise<InventoryItem> {
    const res = await api.post(`/inventory/items/${id}/audit`, null, {
      params: { expectedQuantity, actualQuantity },
    });
    return res.data;
  },

  // Procurement
  async getPurchaseRequests(): Promise<PurchaseRequest[]> {
    try {
      const res = await api.get('/procurement/requests');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[inventoryService] Failed to load purchase requests', err);
      throw err;
    }
  },

  async getPurchaseRequestById(id: number): Promise<PurchaseRequest> {
    const res = await api.get(`/procurement/requests/${id}`);
    return res.data;
  },

  async createPurchaseRequest(data: Omit<PurchaseRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PurchaseRequest> {
    const res = await api.post('/procurement/requests', data);
    return res.data;
  },

  async updatePurchaseRequestStatus(
    id: number,
    status: ProcurementStatus,
    approvalNotes?: string,
    poNumber?: string,
  ): Promise<PurchaseRequest> {
    const res = await api.post(`/procurement/requests/${id}/status`, null, {
      params: {
        status,
        ...(approvalNotes ? { approvalNotes } : {}),
        ...(poNumber ? { poNumber } : {}),
      },
    });
    return res.data;
  },

  // Audit logs
  async getAuditLogs(): Promise<AssetAuditLog[]> {
    try {
      const res = await api.get('/inventory/audit');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.error('[inventoryService] Failed to load audit logs', err);
      throw err;
    }
  },

  async getAuditLogsByAsset(assetId: number): Promise<AssetAuditLog[]> {
    const res = await api.get(`/inventory/audit/asset/${assetId}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async createAuditLog(assetId: number, data: AssetAuditRequest): Promise<AssetAuditLog> {
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
  },
};
