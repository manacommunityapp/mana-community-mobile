import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureLog } from '@/security';

const QUEUE_KEY = 'mana_offline_queue';

export type OfflineAction = {
  id: string;
  timestamp: number;
  service: string;
  method: string;
  args: unknown[];
};

let isOnline = true;
let listeners: Array<(online: boolean) => void> = [];

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
};

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
