import { useState, useEffect, useCallback } from 'react';
import { backgroundSync, SyncStatus, ConflictRecord } from '@/services/backgroundSync';
import { requestQueue } from '@/services/requestQueue';
import { useAuth } from '@/hooks/useAuth';

export interface BackgroundSyncState {
  syncStatus: SyncStatus;
  pendingCount: number;
  conflictCount: number;
  conflicts: ConflictRecord[];
  triggerSync: () => Promise<void>;
}

export function useBackgroundSync(): BackgroundSyncState {
  const { user } = useAuth();
  const userId = Number(user?.id);
  const communityId = user?.communityId ?? null;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(backgroundSync.getStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(backgroundSync.getConflicts().length);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(backgroundSync.getConflicts());

  useEffect(() => {
    const refresh = async () => {
      await backgroundSync.refresh();
      const queue = await requestQueue.getAll();
      const ownQueue = queue.filter((item) => item.identity.userId === userId && item.identity.communityId === communityId);
      setPendingCount(ownQueue.filter((item) => item.status === 'PENDING').length);
      setConflicts(backgroundSync.getConflicts());
      setConflictCount(backgroundSync.getConflicts().length);
    };
    void refresh();

    const unsubscribe = backgroundSync.addListener((status, pending, conflictCnt) => {
      setSyncStatus(status);
      setPendingCount(pending);
      setConflictCount(conflictCnt);
      setConflicts(backgroundSync.getConflicts());
    });
    const unsubscribeQueue = requestQueue.subscribe(() => { void refresh(); });
    return () => { unsubscribe(); unsubscribeQueue(); };
  }, [userId, communityId]);

  const triggerSync = useCallback(async () => {
    await backgroundSync.run();
  }, []);

  return { syncStatus, pendingCount, conflictCount, conflicts, triggerSync };
}
