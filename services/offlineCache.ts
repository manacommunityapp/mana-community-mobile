import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
  communityId: number;
}

function cacheKey(key: string, communityId: number): string {
  return `@mana/cache/${communityId}/${key}`;
}

export const offlineCache = {
  async set<T>(key: string, data: T, ttlMinutes: number, communityId: number): Promise<void> {
    const now = new Date();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
      communityId,
    };
    await AsyncStorage.setItem(cacheKey(key, communityId), JSON.stringify(entry));
  },

  async get<T>(key: string, communityId: number): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(cacheKey(key, communityId));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (new Date(entry.expiresAt) < new Date()) return null;
      return entry.data;
    } catch {
      return null;
    }
  },

  async getStale<T>(key: string, communityId: number): Promise<{ data: T; isStale: boolean } | null> {
    try {
      const raw = await AsyncStorage.getItem(cacheKey(key, communityId));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const isStale = new Date(entry.expiresAt) < new Date();
      return { data: entry.data, isStale };
    } catch {
      return null;
    }
  },

  async cachedAt(key: string, communityId: number): Promise<Date | null> {
    try {
      const raw = await AsyncStorage.getItem(cacheKey(key, communityId));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<unknown>;
      return new Date(entry.cachedAt);
    } catch {
      return null;
    }
  },

  async remove(key: string, communityId: number): Promise<void> {
    await AsyncStorage.removeItem(cacheKey(key, communityId));
  },

  async clearForCommunity(communityId: number): Promise<void> {
    const all = await AsyncStorage.getAllKeys();
    const prefix = `@mana/cache/${communityId}/`;
    const toRemove = all.filter((k) => k.startsWith(prefix));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  },
};

export const CACHE_KEYS = {
  UPCOMING_ACTIVITIES: 'upcoming_activities',
  PAYMENTS_DUE: 'payments_due',
  BOOKINGS: 'bookings',
  COMMUNITY_ANNOUNCEMENTS: 'community_announcements',
  USER_PROFILE: 'user_profile',
  COMMUNITY_INFO: 'community_info',
} as const;

export const CACHE_TTLS: Record<string, number> = {
  upcoming_activities: 15,
  payments_due: 60,
  bookings: 15,
  community_announcements: 30,
  user_profile: 1440,
  community_info: 1440,
};
