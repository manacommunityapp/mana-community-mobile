import api from './apiClient';

export type WatchlistSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WatchlistStatus = 'ACTIVE' | 'RESOLVED' | 'UNDER_REVIEW';

export interface WatchlistEntry {
  id: number;
  name: string;
  photo?: string;
  vehicleNumber?: string;
  phone?: string;
  reason: string;
  severity: WatchlistSeverity;
  status: WatchlistStatus;
  reportedBy?: string;
  reportedByResidentId?: number;
  communityId?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  alertCount?: number;
}

export interface AddWatchlistRequest {
  name: string;
  vehicleNumber?: string;
  phone?: string;
  reason: string;
  severity: WatchlistSeverity;
  notes?: string;
}

export const watchlistService = {
  async getCommunityWatchlist(): Promise<WatchlistEntry[]> {
    try {
      const res = await api.get<WatchlistEntry[]>('/security/watchlist');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addToWatchlist(data: AddWatchlistRequest): Promise<WatchlistEntry> {
    try {
      const res = await api.post<WatchlistEntry>('/security/watchlist', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add to watchlist. Please try again.');
    }
  },

  async updateWatchlistEntry(id: number, data: Partial<AddWatchlistRequest>): Promise<WatchlistEntry> {
    try {
      const res = await api.put<WatchlistEntry>(`/security/watchlist/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update watchlist entry.');
    }
  },

  async resolveWatchlistEntry(id: number, notes?: string): Promise<WatchlistEntry> {
    try {
      const res = await api.patch<WatchlistEntry>(`/security/watchlist/${id}/resolve`, { notes });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to resolve watchlist entry.');
    }
  },

  async checkWatchlist(query: string): Promise<WatchlistEntry[]> {
    try {
      const res = await api.get<WatchlistEntry[]>('/security/watchlist/check', { params: { query } });
      return res.data ?? [];
    } catch {
      return [];
    }
  },
};
