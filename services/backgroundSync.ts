import NetInfo from '@react-native-community/netinfo';
import api from './apiClient';
import { useAuth } from '@/hooks/useAuth';
import { requestQueue, QueuedRequest, QueueIdentity } from './requestQueue';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR';

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: ConflictRecord[];
}

export interface ConflictRecord {
  requestId: string;
  url: string;
  method: string;
  serverResponse?: string;
  detectedAt: string;
}

type SyncListener = (status: SyncStatus, pending: number, conflicts: number) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = 'IDLE';
let conflictLog: ConflictRecord[] = [];
let running = false;

function emit(pending: number) {
  for (const l of listeners) l(currentStatus, pending, conflictLog.length);
}

function currentIdentity(): QueueIdentity | null {
  const user = useAuth.getState().user;
  if (!user?.id) return null;
  return { userId: Number(user.id), communityId: user.communityId ?? null };
}

async function refreshConflicts(identity: QueueIdentity): Promise<void> {
  const queue = await requestQueue.getAll();
  conflictLog = queue
    .filter((item) => item.status === 'CONFLICT' && item.identity.userId === identity.userId && item.identity.communityId === identity.communityId)
    .map((item) => ({ requestId: item.id, url: `/personal-finance/bills/${item.operation.billId}/mark-paid`, method: 'POST', detectedAt: item.conflictAt ?? item.createdAt }));
}

export const backgroundSync = {
  async refresh(): Promise<void> {
    const identity = currentIdentity();
    if (!identity) {
      conflictLog = [];
      emit(0);
      return;
    }
    await refreshConflicts(identity);
    const queue = await requestQueue.getAll();
    emit(queue.filter((item) => item.status === 'PENDING' && item.identity.userId === identity.userId && item.identity.communityId === identity.communityId).length);
  },

  addListener(listener: SyncListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getStatus(): SyncStatus { return currentStatus; },
  getConflicts(): ConflictRecord[] { return [...conflictLog]; },

  async clearConflict(requestId: string): Promise<void> {
    await requestQueue.remove(requestId);
    conflictLog = conflictLog.filter((c) => c.requestId !== requestId);
    const identity = currentIdentity();
    const pending = identity ? (await requestQueue.getAll()).filter((item) => item.identity.userId === identity.userId && item.identity.communityId === identity.communityId && item.status === 'PENDING').length : 0;
    emit(pending);
  },

  async run(): Promise<SyncResult> {
    if (running) return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
    const identity = currentIdentity();
    if (!identity) return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
    running = true;
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || netState.isInternetReachable === false) {
        const pending = (await requestQueue.getAll()).filter((item) => item.status === 'PENDING' && item.identity.userId === identity.userId && item.identity.communityId === identity.communityId);
        emit(pending.length);
        return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
      }

      currentStatus = 'SYNCING';
      const queued = (await requestQueue.getAll()).filter((item) => item.identity.userId === identity.userId && item.identity.communityId === identity.communityId && item.status === 'PENDING');
      emit(queued.length);

      const result: SyncResult = { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
      const processed = await requestQueue.processQueue(identity, async (req: QueuedRequest) => {
        if (req.operation.type === 'MARK_BILL_PAID') {
          await api.post(`/personal-finance/bills/${encodeURIComponent(req.operation.billId)}/mark-paid`, {}, { headers: { 'Idempotency-Key': req.id } });
        }
      });
      result.processed = processed.processed;
      result.succeeded = processed.succeeded;
      result.failed = processed.failed;
      await refreshConflicts(identity);
      result.conflicts = [...conflictLog];
      const remaining = (await requestQueue.getAll()).filter((item) => item.status === 'PENDING' && item.identity.userId === identity.userId && item.identity.communityId === identity.communityId);
      currentStatus = result.failed > 0 || processed.conflicts > 0 ? 'ERROR' : 'IDLE';
      emit(remaining.length);
      return result;
    } catch (error) {
      currentStatus = 'ERROR';
      throw error;
    } finally {
      running = false;
    }
  },
};
