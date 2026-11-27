import api from './apiClient';
import type { AdRequest, AdResponse, ImpressionEvent } from '@/types/adtech';

export const adtechService = {
  async requestAd(req: AdRequest): Promise<AdResponse | null> {
    const res = await api.post<AdResponse | undefined>('/adtech/ad-request', req);
    if (res.status === 204 || !res.data) {
      return null;
    }
    return res.data;
  },

  async fireImpression(event: ImpressionEvent): Promise<void> {
    await api.post('/adtech/impression', event);
  },

  async fireClick(impressionId: string, campaignId: string): Promise<void> {
    await api.post('/adtech/click', { impressionId, campaignId });
  },
};
