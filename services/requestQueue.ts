import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  headers: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  tags?: string[];
}

const QUEUE_KEY = '@mana/request_queue';

// Simple mutex: chain all reads/writes through this promise
let mutex: Promise<void> = Promise.resolve();

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutex.then(fn);
  mutex = result.then(
    () => {},
    () => {},
  );
  return result;
}

async function readQueue(): Promise<QueuedRequest[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
}

async function writeQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const requestQueue = {
  async enqueue(
    req: Omit<QueuedRequest, 'id' | 'retryCount' | 'createdAt'>,
  ): Promise<string> {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const entry: QueuedRequest = {
      ...req,
      id,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    await withMutex(async () => {
      const queue = await readQueue();
      queue.push(entry);
      await writeQueue(queue);
    });
    return id;
  },

  async processQueue(
    executor: (req: QueuedRequest) => Promise<void>,
  ): Promise<void> {
    const queue = await this.getAll();
    for (const req of queue) {
      if (req.retryCount >= req.maxRetries) {
        await this.remove(req.id);
        continue;
      }
      try {
        await executor(req);
        await this.remove(req.id);
      } catch {
        await withMutex(async () => {
          const current = await readQueue();
          const idx = current.findIndex((r) => r.id === req.id);
          if (idx !== -1) {
            current[idx].retryCount += 1;
            if (current[idx].retryCount >= current[idx].maxRetries) {
              current.splice(idx, 1);
            }
            await writeQueue(current);
          }
        });
      }
    }
  },

  async remove(id: string): Promise<void> {
    await withMutex(async () => {
      const queue = await readQueue();
      await writeQueue(queue.filter((r) => r.id !== id));
    });
  },

  async getAll(): Promise<QueuedRequest[]> {
    return readQueue();
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
