import api from './apiClient';

export interface HubUsageEntry {
  hubId: string;
  hubLabel: string;
  clickCount: number;
  lastUsedAt: string;
  score: number;
}

export const hubUsageService = {
  trackClick: (userId: number, hubId: string, hubLabel: string) =>
    api.post('/hub-usage/track', { userId: String(userId), hubId, hubLabel }),

  getTopHubs: (userId: number, limit = 5): Promise<HubUsageEntry[]> =>
    api.get(`/hub-usage/top/${userId}`, { params: { limit } }).then(r => r.data),
};
