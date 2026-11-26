import { durableStorageAdapter } from './storageAdapter';

const QUEUE_KEY = '@mana/request_queue_v2';
const SEQ_KEY = '@mana/request_queue_seq_v2';
const MAX_RETRIES = 5;

export interface QueueIdentity {
  userId: number;
  communityId: number | null;
}

export type QueueOperation =
  | { type: 'MARK_BILL_PAID'; billId: string }
  | { type: 'VISITOR_CHECK_IN'; passCode: string; gate: string; visitorName?: string }
  | { type: 'VISITOR_CHECK_OUT'; passCode: string; gate: string }
  | { type: 'EXPRESS_CLEARANCE'; passCode: string; gate: string }
  | {
      type: 'GATE_VISITOR_CHECK_IN';
      entityId?: number;
      passCode: string;
      gate: string;
      direction?: 'PICKUP' | 'DROP' | 'CHECK_IN' | 'CHECK_OUT';
      visitorName?: string;
      passNonce: string;
      localSeq: number;
      deviceId: string;
      deviceSignature: string;
      occurredAt: string;
    }
  | {
      type: 'GATE_SCHOOL_BUS_ENTRY';
      entityId?: number;
      passCode: string;
      gate: string;
      direction: 'PICKUP' | 'DROP' | 'CHECK_IN' | 'CHECK_OUT';
      passNonce: string;
      localSeq: number;
      deviceId: string;
      deviceSignature: string;
      occurredAt: string;
    }
  | {
      type: 'GATE_DIGITAL_PASS_SCAN';
      entityId?: number;
      passCode: string;
      gate: string;
      direction?: 'PICKUP' | 'DROP' | 'CHECK_IN' | 'CHECK_OUT';
      passNonce: string;
      localSeq: number;
      deviceId: string;
      deviceSignature: string;
      occurredAt: string;
    };

export interface QueuedRequest {
  id: string;
  seqId: number;
  operation: QueueOperation;
  identity: QueueIdentity;
  retryCount: number;
  createdAt: string;
  status: 'PENDING' | 'IN_FLIGHT' | 'CONFLICT' | 'FAILED';
  lastError?: string;
  conflictAt?: string;
}

let mutex: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutex.then(fn);
  mutex = result.then(() => {}, () => {});
  return result;
}

async function allocateSeqId(): Promise<number> {
  const raw = await durableStorageAdapter.getItem(SEQ_KEY);
  const prev = raw ? parseInt(raw, 10) || 0 : 0;
  const next = prev + 1;
  await durableStorageAdapter.setItem(SEQ_KEY, String(next));
  return next;
}

async function readQueue(): Promise<QueuedRequest[]> {
  const raw = await durableStorageAdapter.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalize any legacy records without seqId while preserving insertion order
    return parsed
      .map((item, idx) => ({
        ...item,
        seqId: typeof item.seqId === 'number' ? item.seqId : idx + 1,
      }))
      .sort((a, b) => a.seqId - b.seqId);
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedRequest[]): Promise<void> {
  const sorted = [...queue].sort((a, b) => a.seqId - b.seqId);
  await durableStorageAdapter.setItem(QUEUE_KEY, JSON.stringify(sorted));
}

function belongsTo(entry: QueuedRequest, identity: QueueIdentity): boolean {
  return entry.identity.userId === identity.userId && entry.identity.communityId === identity.communityId;
}

export const requestQueue = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * App-boot crash recovery: resets any items left stuck in `IN_FLIGHT`
   * after a process crash/battery kill back to `PENDING` so they retry at head of FIFO.
   */
  async rehydrateInFlight(): Promise<number> {
    let recovered = 0;
    await withMutex(async () => {
      const queue = await readQueue();
      let changed = false;
      for (const item of queue) {
        if (item.status === 'IN_FLIGHT') {
          item.status = 'PENDING';
          recovered++;
          changed = true;
        }
      }
      if (changed) await writeQueue(queue);
    });
    if (recovered > 0) notify();
    return recovered;
  },

  async enqueueMarkBillPaid(billId: string, identity: QueueIdentity): Promise<string> {
    if (!billId || !Number.isFinite(identity.userId) || identity.userId <= 0) {
      throw new Error('A bill id and signed-in user are required to queue this operation.');
    }
    const id = `mark-bill-paid-${identity.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let queuedId = id;
    await withMutex(async () => {
      const queue = await readQueue();
      const existing = queue.find(
        (entry) =>
          entry.operation.type === 'MARK_BILL_PAID' &&
          entry.operation.billId === billId &&
          belongsTo(entry, identity) &&
          (entry.status === 'PENDING' || entry.status === 'IN_FLIGHT')
      );
      if (existing) {
        queuedId = existing.id;
        return;
      }
      const seqId = await allocateSeqId();
      queue.push({
        id,
        seqId,
        operation: { type: 'MARK_BILL_PAID', billId },
        identity,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      });
      await writeQueue(queue);
    });
    notify();
    return queuedId;
  },

  async enqueue(operation: QueueOperation, identity: QueueIdentity, customId?: string): Promise<QueuedRequest> {
    if (!Number.isFinite(identity.userId) || identity.userId <= 0) {
      throw new Error('Signed-in identity required to queue offline operation.');
    }
    const id = customId || `op-${operation.type.toLowerCase()}-${identity.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let created!: QueuedRequest;

    await withMutex(async () => {
      const queue = await readQueue();
      const existing = queue.find((item) => item.id === id);
      if (existing) {
        created = existing;
        return;
      }
      const seqId = await allocateSeqId();
      created = {
        id,
        seqId,
        operation,
        identity,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };
      queue.push(created);
      await writeQueue(queue);
    });
    notify();
    return created;
  },

  /**
   * Durably commits a guard gate check-in / exit / express scan with a
   * monotonic `seqId` before flashing optimistic UI clearance.
   */
  async enqueueGuardOperation(
    operation: Exclude<QueueOperation, { type: 'MARK_BILL_PAID' }>,
    identity: QueueIdentity
  ): Promise<QueuedRequest> {
    if (!Number.isFinite(identity.userId) || identity.userId <= 0) {
      throw new Error('Signed-in guard identity required to queue gate operation.');
    }
    const id = `guard-${operation.type.toLowerCase()}-${identity.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let created!: QueuedRequest;

    await withMutex(async () => {
      const queue = await readQueue();
      const seqId = await allocateSeqId();
      created = {
        id,
        seqId,
        operation,
        identity,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };
      queue.push(created);
      await writeQueue(queue);
    });
    notify();
    return created;
  },

  /**
   * Drains pending items strictly in `seqId ASC` FIFO order.
   * - Marks current head `IN_FLIGHT` atomically before network dispatch.
   * - Halts immediately on transient network/5xx errors so later items cannot overtake earlier ones.
   * - Quarantines 409/4xx conflicts into Dead-Letter Conflict Queue (`CONFLICT`), keeping subsequent gate entries unblocked.
   */
  async processQueue(
    identity: QueueIdentity,
    executor: (req: QueuedRequest) => Promise<void>
  ): Promise<{ processed: number; succeeded: number; failed: number; conflicts: number }> {
    await this.rehydrateInFlight();

    const queue = (await this.getAll()).filter(
      (req) => belongsTo(req, identity) && req.status === 'PENDING'
    );
    const result = { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };

    for (const req of queue) {
      result.processed++;

      // Transition to IN_FLIGHT durably prior to execution
      await withMutex(async () => {
        const current = await readQueue();
        const item = current.find((entry) => entry.id === req.id);
        if (item) {
          item.status = 'IN_FLIGHT';
          await writeQueue(current);
        }
      });

      try {
        await executor(req);
        await this.remove(req.id);
        result.succeeded++;
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const conflict = status === 409 || status === 400 || status === 404 || status === 422;
        const retryable = !conflict && (status === undefined || status === 408 || status === 429 || status >= 500);

        await withMutex(async () => {
          const current = await readQueue();
          const item = current.find((entry) => entry.id === req.id);
          if (!item) return;
          item.retryCount++;
          item.lastError = conflict
            ? 'The server reported a conflict. Review this item before retrying.'
            : 'The server has not confirmed this operation.';
          if (conflict) item.conflictAt = new Date().toISOString();
          item.status = conflict
            ? 'CONFLICT'
            : !retryable || item.retryCount >= MAX_RETRIES
              ? 'FAILED'
              : 'PENDING';
          await writeQueue(current);
        });
        notify();

        if (conflict) {
          result.conflicts++;
          // Poison item quarantined to DLQ; proceed draining remaining items
          continue;
        }

        result.failed++;
        // Strict FIFO enforcement: stop draining immediately on transient failure
        break;
      }
    }
    return result;
  },

  async remove(id: string): Promise<void> {
    await withMutex(async () => {
      await writeQueue((await readQueue()).filter((entry) => entry.id !== id));
    });
    notify();
  },

  async retry(id: string): Promise<void> {
    await withMutex(async () => {
      const queue = await readQueue();
      const entry = queue.find((item) => item.id === id && (item.status === 'FAILED' || item.status === 'CONFLICT'));
      if (!entry) return;
      entry.status = 'PENDING';
      entry.retryCount = 0;
      entry.lastError = undefined;
      entry.conflictAt = undefined;
      await writeQueue(queue);
    });
    notify();
  },

  async getAll(): Promise<QueuedRequest[]> {
    return withMutex(readQueue);
  },

  async getConflicts(identity?: QueueIdentity): Promise<QueuedRequest[]> {
    const all = await this.getAll();
    return all.filter(
      (entry) =>
        (entry.status === 'CONFLICT' || entry.status === 'FAILED') &&
        (!identity || belongsTo(entry, identity))
    );
  },
};
