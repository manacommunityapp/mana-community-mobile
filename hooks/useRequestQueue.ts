import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { requestQueue, QueuedRequest } from '@/services/requestQueue';

export function useRequestQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const all = await requestQueue.getAll();
    setPendingCount(all.length);
  }, []);

  const enqueue = useCallback(
    async (req: Omit<QueuedRequest, 'id' | 'retryCount' | 'createdAt'>) => {
      const id = await requestQueue.enqueue(req);
      await refresh();
      return id;
    },
    [refresh],
  );

  useEffect(() => {
    refresh();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Notify consumers — actual processing is their responsibility
        refresh();
      }
    });

    return () => unsubscribe();
  }, [refresh]);

  return { pendingCount, isSyncing, setIsSyncing, enqueue, refresh };
}
