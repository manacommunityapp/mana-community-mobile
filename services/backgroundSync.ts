import NetInfo from '@react-native-community/netinfo';
import { requestQueue, QueuedRequest } from './requestQueue';

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

function emit(pending: number) {
  for (const l of listeners) l(currentStatus, pending, conflictLog.length);
}

async function executeRequest(req: QueuedRequest): Promise<{ ok: boolean; conflict: boolean }> {
  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    if (res.status === 409) {
      return { ok: false, conflict: true };
    }
    return { ok: res.ok, conflict: false };
  } catch {
    return { ok: false, conflict: false };
  }
}

export const backgroundSync = {
  addListener(listener: SyncListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getStatus(): SyncStatus { return currentStatus; },
  getConflicts(): ConflictRecord[] { return [...conflictLog]; },

  clearConflict(requestId: string): void {
    conflictLog = conflictLog.filter((c) => c.requestId !== requestId);
  },

  async run(): Promise<SyncResult> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      const pending = await requestQueue.getAll();
      emit(pending.length);
      return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
    }

    currentStatus = 'SYNCING';
    const queued = await requestQueue.getAll();
    emit(queued.length);

    const result: SyncResult = { processed: 0, succeeded: 0, failed: 0, conflicts: [] };

    for (const req of queued) {
      result.processed++;
      const { ok, conflict } = await executeRequest(req);

      if (conflict) {
        const record: ConflictRecord = {
          requestId: req.id,
          url: req.url,
          method: req.method,
          detectedAt: new Date().toISOString(),
        };
        conflictLog.push(record);
        result.conflicts.push(record);
        await requestQueue.remove(req.id);
        result.failed++;
      } else if (ok) {
        await requestQueue.remove(req.id);
        result.succeeded++;
      } else {
        result.failed++;
      }
    }

    const remaining = await requestQueue.getAll();
    currentStatus = result.failed > 0 ? 'ERROR' : 'IDLE';
    emit(remaining.length);
    return result;
  },
};
