import AsyncStorage from '@react-native-async-storage/async-storage';

export type DraftType = 'COMPLAINT' | 'MAINTENANCE_REQUEST' | 'MARKETPLACE_LISTING';

export interface OfflineDraft<T = unknown> {
  id: string;
  type: DraftType;
  communityId: number;
  payload: T;
  createdAt: string;
  updatedAt: string;
  title?: string;
}

const DRAFTS_KEY = '@mana/offline_drafts';

let mutex: Promise<void> = Promise.resolve();

function atomicUpdate(fn: (drafts: OfflineDraft[]) => OfflineDraft[]): Promise<void> {
  mutex = mutex.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_KEY);
      const drafts: OfflineDraft[] = raw ? JSON.parse(raw) : [];
      const updated = fn(drafts);
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    } catch {
      // silent — draft save failure should not crash the app
    }
  });
  return mutex;
}

export const offlineDraft = {
  async save<T>(
    type: DraftType,
    communityId: number,
    payload: T,
    title?: string,
    existingId?: string
  ): Promise<string> {
    const id = existingId ?? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await atomicUpdate((drafts) => {
      const idx = drafts.findIndex((d) => d.id === id);
      const entry: OfflineDraft<T> = {
        id,
        type,
        communityId,
        payload,
        createdAt: idx >= 0 ? drafts[idx].createdAt : now,
        updatedAt: now,
        title,
      };
      if (idx >= 0) {
        const copy = [...drafts];
        copy[idx] = entry;
        return copy;
      }
      return [...drafts, entry];
    });
    return id;
  },

  async getAll(communityId: number): Promise<OfflineDraft[]> {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_KEY);
      const drafts: OfflineDraft[] = raw ? JSON.parse(raw) : [];
      return drafts.filter((d) => d.communityId === communityId);
    } catch {
      return [];
    }
  },

  async getById(id: string): Promise<OfflineDraft | null> {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_KEY);
      const drafts: OfflineDraft[] = raw ? JSON.parse(raw) : [];
      return drafts.find((d) => d.id === id) ?? null;
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<void> {
    await atomicUpdate((drafts) => drafts.filter((d) => d.id !== id));
  },

  async count(communityId: number): Promise<number> {
    const all = await offlineDraft.getAll(communityId);
    return all.length;
  },
};
