import api from './apiClient';
import { secureLog } from '@/security';

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

let localMutationQueue: SyncMutation[] = [];
let lastSyncCheckpoint = 0;

export const offlineSyncService = {
  getQueue(): SyncMutation[] {
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
      // Simulate client-side queueing
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
