import apiClient from './apiClient';

export interface ReputationScore {
  score: number;
  paymentScore?: number;
  participation?: number;
  tenureMonths: number;
  badges: { type: string; label: string; earnedAt: string }[];
}

export interface PortabilityToken {
  tokenHash: string;
  expiresAt: string;
  claimedAt?: string;
}

export const portabilityService = {
  async getMyScore(): Promise<ReputationScore> {
    const res = await apiClient.get('/api/reputation/my-score');
    return res.data?.data ?? res.data;
  },

  async getMyToken(): Promise<PortabilityToken | null> {
    try {
      const res = await apiClient.get('/api/reputation/portability-token');
      return res.data?.data ?? res.data ?? null;
    } catch {
      return null;
    }
  },

  async generateToken(): Promise<PortabilityToken> {
    const res = await apiClient.post('/api/reputation/portability-token');
    return res.data?.data ?? res.data;
  },
};
