import { useState, useEffect, useCallback } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { requestQueue } from '@/services/requestQueue';
import { useAuth } from '@/hooks/useAuth';

export function useOfflineSync() {
  const { user } = useAuth();
  const userId = Number(user?.id);
  const communityId = user?.communityId ?? null;
  const [isOnline, setIsOnline] = useState(offlineSyncService.isOnline);
  const [queueSize, setQueueSize] = useState(0);

  const refresh = useCallback(async () => {
    const queue = await requestQueue.getAll();
    setQueueSize(queue.filter((item) => item.status === 'PENDING' && item.identity.userId === userId && item.identity.communityId === communityId).length);
  }, [userId, communityId]);

  useEffect(() => {
    void refresh();
    const unsub = offlineSyncService.onStatusChange((online) => {
      setIsOnline(online);
      if (online) void refresh();
    });
    const unsubQueue = requestQueue.subscribe(() => { void refresh(); });
    return () => { unsub(); unsubQueue(); };
  }, [refresh]);

  return { isOnline, queueSize };
}
