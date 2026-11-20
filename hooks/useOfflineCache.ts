import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineCache, CACHE_KEYS, CACHE_TTLS } from '@/services/offlineCache';
import { useTenant } from '@/context/TenantContext';

export interface OfflineCacheResult<T> {
  data: T | null;
  isStale: boolean;
  cacheAgeMinutes: number | null;
  isOffline: boolean;
}

export function useOfflineCache<T>(
  key: keyof typeof CACHE_KEYS,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean } = {}
): OfflineCacheResult<T> & { refresh: () => Promise<void> } {
  const { communityId } = useTenant();
  const cacheKey = CACHE_KEYS[key];
  const ttl = CACHE_TTLS[cacheKey] ?? 15;
  const { enabled = true } = options;

  const [result, setResult] = useState<OfflineCacheResult<T>>({
    data: null,
    isStale: false,
    cacheAgeMinutes: null,
    isOffline: false,
  });

  const refresh = useCallback(async () => {
    if (!communityId || !enabled) return;

    const netState = await NetInfo.fetch();
    const online = !!(netState.isConnected && netState.isInternetReachable);

    if (online) {
      try {
        const fresh = await fetcher();
        await offlineCache.set(cacheKey, fresh, ttl, communityId);
        setResult({ data: fresh, isStale: false, cacheAgeMinutes: 0, isOffline: false });
      } catch {
        const stale = await offlineCache.getStale<T>(cacheKey, communityId);
        const cachedAt = await offlineCache.cachedAt(cacheKey, communityId);
        const ageMinutes = cachedAt
          ? Math.floor((Date.now() - cachedAt.getTime()) / 60_000)
          : null;
        setResult({
          data: stale?.data ?? null,
          isStale: stale?.isStale ?? false,
          cacheAgeMinutes: ageMinutes,
          isOffline: false,
        });
      }
    } else {
      const stale = await offlineCache.getStale<T>(cacheKey, communityId);
      const cachedAt = await offlineCache.cachedAt(cacheKey, communityId);
      const ageMinutes = cachedAt
        ? Math.floor((Date.now() - cachedAt.getTime()) / 60_000)
        : null;
      setResult({
        data: stale?.data ?? null,
        isStale: stale?.isStale ?? false,
        cacheAgeMinutes: ageMinutes,
        isOffline: true,
      });
    }
  }, [communityId, cacheKey, ttl, fetcher, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...result, refresh };
}
