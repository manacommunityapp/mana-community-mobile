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

const MOCK_PERSONAL: AmcRecord[] = [
  {
    id: -1, scope: 'PERSONAL', category: 'AC', itemName: 'Bedroom AC',
    brand: 'Daikin', model: 'FTKF35TV16U', serialNumber: 'DK-2021-38472',
    purchaseDate: '2021-06-15', warrantyExpiry: '2024-06-15',
    amcStartDate: '2024-07-01', amcExpiry: '2025-11-15',
    amcVendor: 'Cool Air Services', amcPhone: '9876543210', amcAmount: 4500,
    notes: 'Annual service due every June.',
  },
  {
    id: -2, scope: 'PERSONAL', category: 'REFRIGERATOR', itemName: 'Kitchen Fridge',
    brand: 'LG', model: 'GL-T292RPZY', serialNumber: 'LG-RF-2022-91043',
    purchaseDate: '2022-01-10', warrantyExpiry: '2027-01-10',
    amcVendor: 'LG Care', amcPhone: '1800-180-9999', amcAmount: 1800,
  },
  {
    id: -3, scope: 'PERSONAL', category: 'WASHING_MACHINE', itemName: 'Front Load Washer',
    brand: 'Samsung', model: 'WW70T552DAX', serialNumber: 'SAM-WM-2023-55671',
    purchaseDate: '2023-03-22', warrantyExpiry: '2026-03-22',
    amcExpiry: '2025-12-31',
    amcVendor: 'Samsung Service', amcPhone: '1800-5-7267864', amcAmount: 2200,
  },
];

const MOCK_SOCIETY: AmcRecord[] = [
  {
    id: -4, scope: 'SOCIETY', category: 'ELEVATOR', itemName: 'Tower A Elevator',
    brand: 'Otis', model: 'Gen2-L',
    purchaseDate: '2018-04-01', warrantyExpiry: '2023-04-01',
    amcStartDate: '2023-05-01', amcExpiry: '2025-11-20',
    amcVendor: 'Otis India Pvt Ltd', amcPhone: '9980001234', amcAmount: 85000,
    notes: 'Quarterly maintenance includes oil change and brake check.',
  },
  {
    id: -5, scope: 'SOCIETY', category: 'GENERATOR', itemName: 'DG Set 500 KVA',
    brand: 'Cummins', model: 'C500D5',
    purchaseDate: '2017-09-12',
    amcStartDate: '2024-01-01', amcExpiry: '2026-12-31',
    amcVendor: 'PowerGen Services', amcPhone: '9811223344', amcAmount: 120000,
  },
  {
    id: -6, scope: 'SOCIETY', category: 'PEST_CONTROL', itemName: 'Society Pest Control',
    amcStartDate: '2025-01-01', amcExpiry: '2025-10-31',
    amcVendor: 'HiCare Services', amcPhone: '1800-102-9222', amcAmount: 18000,
    notes: 'Quarterly spraying. Next: common areas + parking.',
  },
];

export const amcService = {
  async getRecords(scope?: AmcScope): Promise<AmcRecord[]> {
    try {
      const res = await api.get<AmcRecord[]>('/amc', { params: scope ? { scope } : undefined });
      if (res.data?.length > 0) return res.data;
    } catch {}
    return scope === 'SOCIETY' ? MOCK_SOCIETY : MOCK_PERSONAL;
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
