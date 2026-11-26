import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { requestQueue } from '@/services/requestQueue';
import { useAuth } from '@/hooks/useAuth';

export function useRequestQueue() {
  const { user } = useAuth();
  const userId = Number(user?.id);
  const communityId = user?.communityId ?? null;
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const all = await requestQueue.getAll();
    setPendingCount(all.filter((item) => item.status === 'PENDING' && item.identity.userId === userId && item.identity.communityId === communityId).length);
  }, [userId, communityId]);

  useEffect(() => {
    refresh();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Notify consumers — actual processing is their responsibility
        refresh();
      }
    });
    const unsubscribeQueue = requestQueue.subscribe(() => { void refresh(); });

    return () => { unsubscribe(); unsubscribeQueue(); };
  }, [refresh]);

  return { pendingCount, isSyncing, setIsSyncing, refresh };
}
