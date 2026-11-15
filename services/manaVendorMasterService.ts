import api from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManaVendor {
  id: number;
  communityId?: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankDetails?: string;
  categories?: string;
  rating?: number;
  sourceModule: 'FINANCE' | 'PROCUREMENT' | 'MANUAL';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateManaVendorRequest {
  communityId: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankDetails?: string;
  categories?: string;
}

export interface UpdateManaVendorRequest extends Partial<Omit<CreateManaVendorRequest, 'communityId'>> {}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = '/api/vendors/master';

export const manaVendorMasterService = {
  listActive: (communityId: number): Promise<ManaVendor[]> =>
    api.get(`${BASE}/active`, { params: { communityId } }).then(r => r.data),

  search: (communityId: number, q: string): Promise<ManaVendor[]> =>
    api.get(`${BASE}/search`, { params: { communityId, q } }).then(r => r.data),

  create: (req: CreateManaVendorRequest): Promise<ManaVendor> =>
    api.post(BASE, req).then(r => r.data),

  update: (communityId: number, id: number, req: UpdateManaVendorRequest): Promise<ManaVendor> =>
    api.patch(`${BASE}/${id}`, req, { params: { communityId } }).then(r => r.data),

  deactivate: (communityId: number, id: number): Promise<void> =>
    api.delete(`${BASE}/${id}`, { params: { communityId } }).then(() => undefined),
};
