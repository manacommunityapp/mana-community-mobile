import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@mana/request_queue_v2';
const MAX_RETRIES = 5;

export interface QueueIdentity {
  userId: number;
  communityId: number | null;
}

export interface QueuedRequest {
  id: string;
  operation: { type: 'MARK_BILL_PAID'; billId: string };
  identity: QueueIdentity;
  retryCount: number;
  createdAt: string;
  status: 'PENDING' | 'CONFLICT' | 'FAILED';
  lastError?: string;
  conflictAt?: string;
}

let mutex: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutex.then(fn);
  mutex = result.then(() => {}, () => {});
  return result;
}

async function readQueue(): Promise<QueuedRequest[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function belongsTo(entry: QueuedRequest, identity: QueueIdentity): boolean {
  return entry.identity.userId === identity.userId && entry.identity.communityId === identity.communityId;
}

export const requestQueue = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async enqueueMarkBillPaid(billId: string, identity: QueueIdentity): Promise<string> {
    if (!billId || !Number.isFinite(identity.userId) || identity.userId <= 0) {
      throw new Error('A bill id and signed-in user are required to queue this operation.');
    }
    const id = `mark-bill-paid-${identity.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let queuedId = id;
    await withMutex(async () => {
      const queue = await readQueue();
      const existing = queue.find((entry) => entry.operation.type === 'MARK_BILL_PAID' && entry.operation.billId === billId && belongsTo(entry, identity) && entry.status === 'PENDING');
      if (existing) {
        queuedId = existing.id;
        return;
      }
      queue.push({ id, operation: { type: 'MARK_BILL_PAID', billId }, identity, retryCount: 0, createdAt: new Date().toISOString(), status: 'PENDING' });
      await writeQueue(queue);
    });
    notify();
    return queuedId;
  },

  async processQueue(identity: QueueIdentity, executor: (req: QueuedRequest) => Promise<void>): Promise<{ processed: number; succeeded: number; failed: number; conflicts: number }> {
    const queue = await this.getAll();
    const result = { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    for (const req of queue) {
      if (!belongsTo(req, identity) || req.status !== 'PENDING') continue;
      result.processed++;
      try {
        await executor(req);
        await this.remove(req.id);
        result.succeeded++;
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const conflict = status === 409;
        const retryable = status === undefined || status === 408 || status === 429 || status >= 500;
        await withMutex(async () => {
          const current = await readQueue();
          const item = current.find((entry) => entry.id === req.id);
          if (!item) return;
          item.retryCount++;
          item.lastError = conflict ? 'The server reported a conflict. Review this item before retrying.' : 'The server has not confirmed this operation.';
          if (conflict) item.conflictAt = new Date().toISOString();
          item.status = conflict ? 'CONFLICT' : !retryable || item.retryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';
          await writeQueue(current);
        });
        notify();
        if (conflict) result.conflicts++;
        else result.failed++;
      }
    }
    return result;
  },

  async remove(id: string): Promise<void> {
    await withMutex(async () => { await writeQueue((await readQueue()).filter((entry) => entry.id !== id)); });
    notify();
  },

  async retry(id: string): Promise<void> {
    await withMutex(async () => {
      const queue = await readQueue();
      const entry = queue.find((item) => item.id === id && item.status === 'FAILED');
      if (!entry) return;
      entry.status = 'PENDING';
      entry.retryCount = 0;
      entry.lastError = undefined;
      await writeQueue(queue);
    });
    notify();
  },

  async getAll(): Promise<QueuedRequest[]> {
    return withMutex(readQueue);
  },

};
