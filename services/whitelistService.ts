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

export const whitelistService = {
  async getMyWhitelist(): Promise<WhitelistEntry[]> {
    try {
      const res = await api.get<WhitelistEntry[]>('/visitors/whitelist');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addToWhitelist(data: AddWhitelistRequest): Promise<WhitelistEntry> {
    try {
      const res = await api.post<WhitelistEntry>('/visitors/whitelist', data);
      return res.data;
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
