import apiClient from './apiClient';

export type InsightSeverity = 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';

export interface CommunityInsight {
  id: number;
  insightType: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendation?: string;
  generatedAt: string;
}

export interface MetricsSnapshot {
  snapshotDate: string;
  collectionRate: number;
  openComplaints: number;
  activeResidentsPct: number;
}

export const insightsService = {
  async getActiveInsights(communityId: number): Promise<CommunityInsight[]> {
    const res = await apiClient.get('/api/insights/active', { params: { communityId } });
    return res.data?.data ?? res.data ?? [];
  },

  async getLatestMetrics(communityId: number): Promise<MetricsSnapshot | null> {
    try {
      const res = await apiClient.get('/api/insights/metrics', { params: { communityId } });
      return res.data?.data ?? res.data ?? null;
    } catch {
      return null;
    }
  },
};
