import api from './apiClient';

export function deterministicTenantBucket(flagKey: string, communityId: number): number {
  const str = `${flagKey}:${communityId}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000;
}

export function isRushHourWindow(hour: number, minute: number): boolean {
  const mins = hour * 60 + minute;
  return (mins >= 7 * 60 + 30 && mins < 10 * 60 + 30) || (mins >= 17 * 60 + 30 && mins < 20 * 60 + 30);
}

export const releaseSafetyService = {
  async evaluateTenantFlag(flagKey: string, communityId: number): Promise<any> {
    const res = await api.get<any>('/api/v1/release/flags/evaluate', { params: { flagKey, communityId } });
    return res.data;
  },

  async reportCanaryTelemetry(flagKey: string, p99LatencyMs: number, errorRateBps: number): Promise<any> {
    const res = await api.post<any>(`/api/v1/release/flags/${encodeURIComponent(flagKey)}/telemetry`, {
      p99LatencyMs,
      errorRateBps,
    });
    return res.data;
  },
};
