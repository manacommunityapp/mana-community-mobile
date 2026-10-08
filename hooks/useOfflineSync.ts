import { useState, useEffect } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(offlineSyncService.isOnline);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const unsub = offlineSyncService.onStatusChange((online) => {
      setIsOnline(online);
      if (online) {
        offlineSyncService.getQueueSize().then(setQueueSize);
      }
    });

    offlineSyncService.getQueueSize().then(setQueueSize);
    return unsub;
  }, []);

  return { isOnline, queueSize };
}
