import { useState, useEffect, useCallback } from 'react';
import { backgroundSync, SyncStatus, ConflictRecord } from '@/services/backgroundSync';
import { requestQueue } from '@/services/requestQueue';

export interface BackgroundSyncState {
  syncStatus: SyncStatus;
  pendingCount: number;
  conflictCount: number;
  conflicts: ConflictRecord[];
  triggerSync: () => Promise<void>;
}

export function useBackgroundSync(): BackgroundSyncState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(backgroundSync.getStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(backgroundSync.getConflicts().length);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(backgroundSync.getConflicts());

  useEffect(() => {
    requestQueue.getAll().then((q) => setPendingCount(q.length));

    const unsubscribe = backgroundSync.addListener((status, pending, conflictCnt) => {
      setSyncStatus(status);
      setPendingCount(pending);
      setConflictCount(conflictCnt);
      setConflicts(backgroundSync.getConflicts());
    });
    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    await backgroundSync.run();
  }, []);

  return { syncStatus, pendingCount, conflictCount, conflicts, triggerSync };
}
