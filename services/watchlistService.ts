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

const MOCK_WATCHLIST: WatchlistEntry[] = [
  { id: 1, name: 'Unknown Salesperson', reason: 'Aggressive cold-calling, refused to leave', severity: 'MEDIUM', status: 'ACTIVE', reportedBy: 'Tower A, Flat 802', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), alertCount: 3 },
  { id: 2, name: 'Suspicious Vehicle KA-05-XY-9999', vehicleNumber: 'KA-05-XY-9999', reason: "Loitering near children's park multiple times", severity: 'HIGH', status: 'ACTIVE', reportedBy: 'Security Guard', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), alertCount: 1 },
];

export const watchlistService = {
  async getCommunityWatchlist(): Promise<WatchlistEntry[]> {
    try {
      const res = await api.get<WatchlistEntry[]>('/security/watchlist');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_WATCHLIST;
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
      const res = await api.patch<WatchlistEntry>(`/security/watchlist/${id}/status`, {
        status: 'RESOLVED',
        notes,
      });
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
