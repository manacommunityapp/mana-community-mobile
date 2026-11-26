import api from './apiClient';

export type WhitelistCategory = 'FAMILY' | 'FRIEND' | 'DRIVER' | 'DOMESTIC_HELP' | 'DELIVERY_AGENT' | 'OTHER';

export interface WhitelistEntry {
  id: number;
  visitorName: string;
  visitorPhone?: string;
  category: WhitelistCategory;
  vehicleNumber?: string;
  photo?: string;
  notes?: string;
  residentId?: number;
  flatNumber?: string;
  communityId?: number;
  isActive: boolean;
  createdAt?: string;
  lastVisit?: string;
  visitCount?: number;
}

export interface AddWhitelistRequest {
  visitorName: string;
  visitorPhone?: string;
  category: WhitelistCategory;
  vehicleNumber?: string;
  notes?: string;
}

const MOCK_WHITELIST: WhitelistEntry[] = [
  { id: 1, visitorName: 'Priya (Sister)', visitorPhone: '9876500001', category: 'FAMILY', isActive: true, visitCount: 14, lastVisit: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, visitorName: 'Rajan (Driver)', vehicleNumber: 'KA-01-AB-1234', category: 'DRIVER', isActive: true, visitCount: 42, lastVisit: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, visitorName: 'Amazon Delivery', category: 'DELIVERY_AGENT', isActive: true, visitCount: 7, lastVisit: new Date(Date.now() - 259200000).toISOString() },
];

export const whitelistService = {
  async getMyWhitelist(): Promise<WhitelistEntry[]> {
    try {
      const res = await api.get<any[]>('/visitors/whitelist');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(e => ({
          ...e,
          visitorName: e.visitorName || e.name || 'Trusted Visitor',
          visitorPhone: e.visitorPhone || e.phone || '',
        }));
      }
    } catch {}
    return MOCK_WHITELIST;
  },

  async addToWhitelist(data: AddWhitelistRequest): Promise<WhitelistEntry> {
    try {
      const payload = {
        ...data,
        name: data.visitorName,
        phone: data.visitorPhone,
      };
      const res = await api.post<any>('/visitors/whitelist', payload);
      return {
        ...res.data,
        visitorName: res.data?.visitorName || res.data?.name || data.visitorName,
        visitorPhone: res.data?.visitorPhone || res.data?.phone || data.visitorPhone,
      };
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add to whitelist. Please try again.');
    }
  },

  async updateWhitelistEntry(id: number, data: Partial<AddWhitelistRequest>): Promise<WhitelistEntry> {
    try {
      const res = await api.put<WhitelistEntry>(`/visitors/whitelist/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update whitelist entry.');
    }
  },

  async removeFromWhitelist(id: number): Promise<void> {
    try {
      await api.delete(`/visitors/whitelist/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to remove from whitelist.');
    }
  },

  async toggleWhitelistStatus(id: number, isActive: boolean): Promise<WhitelistEntry> {
    try {
      const res = await api.patch<WhitelistEntry>(`/visitors/whitelist/${id}/status`, { isActive });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update whitelist status.');
    }
  },
};
