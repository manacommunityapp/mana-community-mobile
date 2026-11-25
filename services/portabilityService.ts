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
    try {
      const res = await apiClient.get('/identity/portability/score');
      const data = res.data?.data ?? res.data;
      if (data && typeof data.score !== 'undefined') {
        return {
          score: Number(data.score) || 0,
          paymentScore: data.paymentScore != null ? Number(data.paymentScore) : undefined,
          participation: data.participation != null ? Number(data.participation) : undefined,
          tenureMonths: data.tenureMonths != null ? Number(data.tenureMonths) : 0,
          badges: Array.isArray(data.badges) ? data.badges : [],
        };
      }
    } catch {}

    const res = await apiClient.get('/reputation/my-score');
    const data = res.data?.data ?? res.data;
    return {
      score: Number(data.score) || 0,
      paymentScore: data.paymentScore != null ? Number(data.paymentScore) : undefined,
      participation: data.participation != null ? Number(data.participation) : undefined,
      tenureMonths: data.tenureMonths != null ? Number(data.tenureMonths) : 0,
      badges: Array.isArray(data.badges) ? data.badges : [],
    };
  },

  async getMyToken(): Promise<PortabilityToken | null> {
    try {
      const res = await apiClient.get('/identity/portability/token');
      const data = res.data?.data ?? res.data;
      if (data && data.tokenHash) {
        return {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          claimedAt: data.claimedAt,
        };
      }
    } catch {}

    try {
      const res = await apiClient.get('/reputation/portability-token');
      const data = res.data?.data ?? res.data;
      if (data && data.tokenHash) {
        return {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          claimedAt: data.claimedAt,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async generateToken(): Promise<PortabilityToken> {
    try {
      const res = await apiClient.post('/identity/portability/token');
      const data = res.data?.data ?? res.data;
      if (data && data.tokenHash) {
        return {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          claimedAt: data.claimedAt,
        };
      }
    } catch {}

    try {
      const res = await apiClient.get('/identity/portability/token');
      const data = res.data?.data ?? res.data;
      if (data && data.tokenHash) {
        return {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          claimedAt: data.claimedAt,
        };
      }
    } catch {}

    const res = await apiClient.post('/reputation/portability-token');
    const data = res.data?.data ?? res.data;
    return {
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      claimedAt: data.claimedAt,
    };
  },
};
