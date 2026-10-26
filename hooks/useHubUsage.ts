import { useCallback, useEffect, useState } from 'react';
import { hubUsageService, HubUsageEntry } from '@/services/hubUsageService';
import { useAuth } from './useAuth';

export function useHubUsage() {
  const { user } = useAuth();
  const [topHubIds, setTopHubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTopHubs = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const hubs = await hubUsageService.getTopHubs(user.id, 5);
      setTopHubIds(hubs.map(h => h.hubId));
    } catch {
      setTopHubIds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTopHubs();
  }, [fetchTopHubs]);

  const trackClick = useCallback(async (hubId: string, hubLabel: string) => {
    if (!user?.id) return;
    try {
      await hubUsageService.trackClick(user.id, hubId, hubLabel);
      fetchTopHubs();
    } catch {}
  }, [user?.id, fetchTopHubs]);

  return { topHubIds, trackClick, loading, refetch: fetchTopHubs };
}
