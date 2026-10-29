import api from './apiClient';

export type AmcCategory =
  | 'AC' | 'REFRIGERATOR' | 'WASHING_MACHINE' | 'TV' | 'WATER_HEATER'
  | 'MICROWAVE' | 'DISHWASHER' | 'INVERTER' | 'ELEVATOR' | 'GENERATOR'
  | 'PEST_CONTROL' | 'CCTV' | 'FIRE_SAFETY' | 'WATER_TANK' | 'PUMP' | 'OTHER';

export type AmcScope = 'PERSONAL' | 'SOCIETY';

export interface AmcRecord {
  id: number;
  itemName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: AmcCategory;
  scope: AmcScope;
  purchaseDate?: string;
  warrantyExpiry?: string;
  amcStartDate?: string;
  amcExpiry?: string;
  amcVendor?: string;
  amcPhone?: string;
  amcAmount?: number;
  notes?: string;
  flatNumber?: string;
  createdAt?: string;
}

export interface CreateAmcRequest {
  itemName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: AmcCategory;
  scope: AmcScope;
  purchaseDate?: string;
  warrantyExpiry?: string;
  amcStartDate?: string;
  amcExpiry?: string;
  amcVendor?: string;
  amcPhone?: string;
  amcAmount?: number;
  notes?: string;
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const AMC_CATEGORY_META: Record<AmcCategory, { label: string; icon: string; color: string }> = {
  AC:              { label: 'Air Conditioner', icon: '❄️', color: '#0284C7' },
  REFRIGERATOR:    { label: 'Refrigerator',    icon: '🧊', color: '#0284C7' },
  WASHING_MACHINE: { label: 'Washing Machine', icon: '🫧', color: '#7C3AED' },
  TV:              { label: 'Television',       icon: '📺', color: '#1F2937' },
  WATER_HEATER:    { label: 'Water Heater',    icon: '🔥', color: '#DC2626' },
  MICROWAVE:       { label: 'Microwave',       icon: '📡', color: '#B45309' },
  DISHWASHER:      { label: 'Dishwasher',      icon: '🍽️', color: '#0D9488' },
  INVERTER:        { label: 'Inverter/UPS',    icon: '⚡', color: '#D97706' },
  ELEVATOR:        { label: 'Elevator',        icon: '🛗', color: '#4F46E5' },
  GENERATOR:       { label: 'Generator',       icon: '🔌', color: '#374151' },
  PEST_CONTROL:    { label: 'Pest Control',    icon: '🐛', color: '#16A34A' },
  CCTV:            { label: 'CCTV/Security',   icon: '📷', color: '#4B5563' },
  FIRE_SAFETY:     { label: 'Fire Safety',     icon: '🔥', color: '#DC2626' },
  WATER_TANK:      { label: 'Water Tank',      icon: '💧', color: '#0284C7' },
  PUMP:            { label: 'Water Pump',      icon: '💧', color: '#0369A1' },
  OTHER:           { label: 'Other',           icon: '🔧', color: '#6B7280' },
};

export const amcService = {
  async getRecords(scope?: AmcScope): Promise<AmcRecord[]> {
    try {
      const res = await api.get<AmcRecord[]>('/amc', { params: scope ? { scope } : undefined });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async createRecord(data: CreateAmcRequest): Promise<AmcRecord> {
    try {
      const res = await api.post<AmcRecord>('/amc', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add item. Please try again.');
    }
  },

  async updateRecord(id: number, data: Partial<CreateAmcRequest>): Promise<AmcRecord> {
    try {
      const res = await api.put<AmcRecord>(`/amc/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update. Please try again.');
    }
  },

  async deleteRecord(id: number): Promise<void> {
    try {
      await api.delete(`/amc/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to delete.');
    }
  },

  daysUntil,

  getExpiryStatus(days: number | null): { color: string; bg: string; label: string } {
    if (days === null) return { color: '#6B7280', bg: '#F3F4F6', label: 'No date set' };
    if (days < 0) return { color: '#DC2626', bg: '#FEE2E2', label: 'Expired' };
    if (days <= 30) return { color: '#DC2626', bg: '#FEE2E2', label: `${days}d left` };
    if (days <= 90) return { color: '#D97706', bg: '#FEF3C7', label: `${days}d left` };
    return { color: '#059669', bg: '#D1FAE5', label: `${days}d left` };
  },
};
