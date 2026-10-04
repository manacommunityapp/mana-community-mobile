import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './apiClient';
import { secureLog } from '@/security';

const QUEUE_KEY = 'mana_offline_queue';

export type OfflineAction = {
  id: string;
  timestamp: number;
  service: string;
  method: string;
  args: unknown[];
};

export interface SyncMutation {
  mutationId: string;
  societyId: number;
  userId: number;
  entityType: 'TICKET' | 'VISITOR_PASS' | 'PAYMENT' | 'FEED_POST' | 'METER_READING';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payloadJson: string;
  vectorTimestamp: number;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  createdAt: string;
}

export interface SyncPushRequest {
  societyId: number;
  clientMutations: {
    clientMutationId: string;
    entityType: string;
    action: string;
    payloadJson: string;
    clientVectorTimestamp: number;
  }[];
}

export interface SyncPushResponse {
  acceptedMutationIds: string[];
  conflictedMutationIds: string[];
  serverCheckpoint: number;
  status: string;
}

export interface SyncPullResponse {
  changes: {
    changeLogId: number;
    entityType: string;
    action: string;
    entityId: number;
    payloadJson: string;
    serverVectorTimestamp: number;
  }[];
  newCheckpoint: number;
}

let isOnline = true;
let listeners: Array<(online: boolean) => void> = [];
let localMutationQueue: SyncMutation[] = [];
let lastSyncCheckpoint = 0;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function loadQueue(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: OfflineAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    secureLog.warn('[OfflineSync] Failed to persist queue', err);
  }
}

const serviceRegistry: Record<string, () => Promise<Record<string, (...args: any[]) => Promise<unknown>>>> = {
  parking: () => import('@/services/parkingService').then((m) => m.parkingService as any),
  homeServices: () => import('@/services/homeServicesService').then((m) => m.homeServicesService as any),
};

async function resolveService(name: string): Promise<Record<string, (...args: any[]) => Promise<unknown>> | null> {
  const factory = serviceRegistry[name];
  if (!factory) return null;
  try {
    return await factory();
  } catch {
    return null;
  }
}

export const offlineSyncService = {
  init() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnline;
      isOnline = !!state.isConnected && !!state.isInternetReachable;

      listeners.forEach((fn) => fn(isOnline));

      if (wasOffline && isOnline) {
        secureLog.debug('[OfflineSync] Back online — flushing queue');
        this.flush();
      }
    });
  },

  get isOnline() {
    return isOnline;
  },

  onStatusChange(fn: (online: boolean) => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  async enqueue(service: string, method: string, args: unknown[]): Promise<string> {
    const action: OfflineAction = {
      id: generateId(),
      timestamp: Date.now(),
      service,
      method,
      args,
    };
    const queue = await loadQueue();
    queue.push(action);
    await saveQueue(queue);
    secureLog.debug(`[OfflineSync] Queued ${service}.${method} (${action.id})`);
    return action.id;
  },

  async flush(): Promise<{ success: number; failed: number }> {
    const queue = await loadQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    const remaining: OfflineAction[] = [];
    let success = 0;
    let failed = 0;

    for (const action of queue) {
      try {
        const svc = await resolveService(action.service);
        if (svc && typeof svc[action.method] === 'function') {
          await svc[action.method](...action.args);
          success++;
        } else {
          secureLog.warn(`[OfflineSync] Unknown ${action.service}.${action.method}`);
          remaining.push(action);
          failed++;
        }
      } catch (err) {
        secureLog.warn(`[OfflineSync] Retry failed for ${action.id}`, err);
        remaining.push(action);
        failed++;
      }
    }

    await saveQueue(remaining);
    secureLog.debug(`[OfflineSync] Flush complete: ${success} ok, ${failed} kept`);
    return { success, failed };
  },

  async getQueueSize(): Promise<number> {
    const queue = await loadQueue();
    return queue.length;
  },

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  getServerQueue(): SyncMutation[] {
    return [...localMutationQueue];
  },

  enqueueMutation(
    societyId: number,
    userId: number,
    entityType: SyncMutation['entityType'],
    action: SyncMutation['action'],
    payload: any
  ): SyncMutation {
    const mutation: SyncMutation = {
      mutationId: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      societyId,
      userId,
      entityType,
      action,
      payloadJson: JSON.stringify(payload),
      vectorTimestamp: Date.now(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    localMutationQueue.push(mutation);
    return mutation;
  },

  async pushPendingMutations(societyId: number = 1): Promise<SyncPushResponse> {
    const pending = localMutationQueue.filter((m) => m.status === 'PENDING');
    if (pending.length === 0) {
      return { acceptedMutationIds: [], conflictedMutationIds: [], serverCheckpoint: lastSyncCheckpoint, status: 'NOOP' };
    }

    const payload: SyncPushRequest = {
      societyId,
      clientMutations: pending.map((m) => ({
        clientMutationId: m.mutationId,
        entityType: m.entityType,
        action: m.action,
        payloadJson: m.payloadJson,
        clientVectorTimestamp: m.vectorTimestamp,
      })),
    };

    try {
      const res = await api.post<SyncPushResponse>('/api/v1/sync/push', payload);
      const acceptedSet = new Set(res.data.acceptedMutationIds);
      localMutationQueue.forEach((m) => {
        if (acceptedSet.has(m.mutationId)) {
          m.status = 'SYNCED';
        }
      });
      lastSyncCheckpoint = res.data.serverCheckpoint || lastSyncCheckpoint;
      return res.data;
    } catch (err) {
      secureLog.warn('OfflineSync: Push failed (offline)', err);
      localMutationQueue.forEach((m) => {
        if (m.status === 'PENDING') m.status = 'SYNCED';
      });
      return {
        acceptedMutationIds: pending.map((m) => m.mutationId),
        conflictedMutationIds: [],
        serverCheckpoint: Date.now(),
        status: 'OFFLINE_LOCAL_PROCESSED',
      };
    }
  },

  async pullDeltaChanges(societyId: number = 1): Promise<SyncPullResponse> {
    try {
      const res = await api.get<SyncPullResponse>(`/api/v1/sync/pull?societyId=${societyId}&checkpoint=${lastSyncCheckpoint}`);
      lastSyncCheckpoint = res.data.newCheckpoint;
      return res.data;
    } catch {
      return {
        changes: [],
        newCheckpoint: lastSyncCheckpoint,
      };
    }
  },

  clearSynced(): void {
    localMutationQueue = localMutationQueue.filter((m) => m.status === 'PENDING');
  },
};
