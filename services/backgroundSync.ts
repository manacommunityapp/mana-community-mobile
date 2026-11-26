import NetInfo from '@react-native-community/netinfo';
import api from './apiClient';
import { useAuth } from '@/hooks/useAuth';
import { requestQueue, QueuedRequest, QueueIdentity } from './requestQueue';
import { offlineGateEngine, type BatchSyncResponse } from './offlineGateEngine';

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

function operationEndpoint(op: QueuedRequest['operation']): string {
  switch (op.type) {
    case 'MARK_BILL_PAID':
      return `/personal-finance/bills/${encodeURIComponent(op.billId)}/mark-paid`;
    case 'EXPRESS_CLEARANCE':
      return '/partners/delivery/verify';
    case 'VISITOR_CHECK_IN':
      return '/visitors/check-in';
    case 'VISITOR_CHECK_OUT':
      return '/visitors/check-out';
    case 'GATE_VISITOR_CHECK_IN':
    case 'GATE_SCHOOL_BUS_ENTRY':
    case 'GATE_DIGITAL_PASS_SCAN':
      return '/v1/sync/push';
  }
}

async function refreshConflicts(identity: QueueIdentity): Promise<void> {
  const queue = await requestQueue.getAll();
  conflictLog = queue
    .filter((item) => item.status === 'CONFLICT' && item.identity.userId === identity.userId && item.identity.communityId === identity.communityId)
    .map((item) => ({ requestId: item.id, url: operationEndpoint(item.operation), method: 'POST', detectedAt: item.conflictAt ?? item.createdAt }));
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
      const batchConflicts: ConflictRecord[] = [];
      const gateQueued = queued.filter(
        (q) =>
          q.operation.type === 'GATE_VISITOR_CHECK_IN' ||
          q.operation.type === 'GATE_SCHOOL_BUS_ENTRY' ||
          q.operation.type === 'GATE_DIGITAL_PASS_SCAN',
      );

      // Reconcile signed offline gate entries as an ordered atomic batch via /api/v1/sync/push
      if (gateQueued.length > 0 && identity.communityId != null) {
        const firstGateOp = gateQueued[0].operation as Extract<
          QueuedRequest['operation'],
          { deviceId: string }
        >;
        const deviceId = firstGateOp.deviceId || (await offlineGateEngine.getOrCreateDeviceId());
        try {
          const mutations = gateQueued.map((q) => {
            const op = q.operation as Extract<QueuedRequest['operation'], { deviceId: string }>;
            const entityType =
              op.type === 'GATE_SCHOOL_BUS_ENTRY'
                ? 'SCHOOL_BUS_ENTRY'
                : op.type === 'GATE_DIGITAL_PASS_SCAN'
                ? 'DIGITAL_PASS'
                : 'VISITOR_PASS';
            return {
              clientMutationId: q.id,
              entityType,
              entityId: op.entityId ?? null,
              operation: 'UPDATE',
              payloadJson: JSON.stringify({
                passCode: op.passCode,
                childId: op.entityId,
                direction: op.direction ?? 'PICKUP',
                action: op.direction === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
                gate: op.gate,
              }),
              clientTimestamp: op.occurredAt,
              localSeq: op.localSeq,
              passNonce: op.passNonce,
              passCode: op.passCode,
              gateName: op.gate,
              deviceSignature: op.deviceSignature,
            };
          });

          const pushRes = await api.post<BatchSyncResponse>('/v1/sync/push', {
            userId: identity.userId,
            deviceId,
            communityId: identity.communityId,
            mutations,
          });
          const ackMap = new Map((pushRes.data?.acks ?? []).map((a) => [a.clientMutationId, a]));

          for (const req of gateQueued) {
            result.processed++;
            const ack = ackMap.get(req.id);
            if (!ack || ack.status === 'APPLIED') {
              await requestQueue.remove(req.id);
              result.succeeded++;
            } else {
              // Quarantine conflict / replay rejection in DLQ while preserving other synced items
              await requestQueue.remove(req.id);
              result.failed++;
              batchConflicts.push({
                requestId: req.id,
                url: '/v1/sync/push',
                method: 'POST',
                serverResponse: `${ack.status}: ${ack.conflictReason || ack.message}`,
                detectedAt: new Date().toISOString(),
              });
            }
          }

          await api
            .post('/v1/sync/pull', {
              userId: identity.userId,
              deviceId,
              communityId: identity.communityId,
              sinceChangeId: pushRes.data?.newCheckpointChangeId ?? 0,
            })
            .catch(() => undefined);
          await offlineGateEngine.registerAndRefreshRoster().catch(() => undefined);
        } catch {
          result.failed += gateQueued.length;
        }
      }

      const processed = await requestQueue.processQueue(identity, async (req: QueuedRequest) => {
        if (req.operation.type === 'MARK_BILL_PAID') {
          await api.post(`/personal-finance/bills/${encodeURIComponent(req.operation.billId)}/mark-paid`, {}, { headers: { 'Idempotency-Key': req.id } });
        } else if (req.operation.type === 'EXPRESS_CLEARANCE') {
          await api.post('/partners/delivery/verify', { passCode: req.operation.passCode, gateName: req.operation.gate }, { headers: { 'Idempotency-Key': req.id } });
        } else if (req.operation.type === 'VISITOR_CHECK_IN') {
          await api.post('/visitors/check-in', { passCode: req.operation.passCode, gate: req.operation.gate, visitorName: req.operation.visitorName }, { headers: { 'Idempotency-Key': req.id } });
        } else if (req.operation.type === 'VISITOR_CHECK_OUT') {
          await api.post('/visitors/check-out', { passCode: req.operation.passCode, gate: req.operation.gate }, { headers: { 'Idempotency-Key': req.id } });
        } else if (
          req.operation.type === 'GATE_VISITOR_CHECK_IN' ||
          req.operation.type === 'GATE_SCHOOL_BUS_ENTRY' ||
          req.operation.type === 'GATE_DIGITAL_PASS_SCAN'
        ) {
          // Already reconciled in batch above when online
          return;
        }
      });
      result.processed += processed.processed;
      result.succeeded += processed.succeeded;
      result.failed += processed.failed;
      await refreshConflicts(identity);
      if (batchConflicts.length > 0) {
        conflictLog = [...conflictLog, ...batchConflicts];
      }
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
