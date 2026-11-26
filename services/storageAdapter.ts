import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV, type MMKV } from 'react-native-mmkv';

let mmkvInstance: MMKV | null = null;
let mmkvInitialized = false;

function getMmkv(): MMKV | null {
  if (mmkvInitialized) return mmkvInstance;
  mmkvInitialized = true;
  try {
    mmkvInstance = createMMKV({ id: 'mana_guard_wal_v1' });
  } catch {
    // Expected in Expo Go / Jest / Web where Nitro JSI native binding is absent
    mmkvInstance = null;
  }
  return mmkvInstance;
}

/**
 * Durable crash-safe storage adapter preferring native memory-mapped MMKV
 * for synchronous zero-lag durability, falling back cleanly to AsyncStorage.
 */
export const durableStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const mmkv = getMmkv();
    if (mmkv) {
      return mmkv.getString(key) ?? null;
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    const mmkv = getMmkv();
    if (mmkv) {
      mmkv.set(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const mmkv = getMmkv();
    if (mmkv) {
      mmkv.remove(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },

  isMmkvActive(): boolean {
    return getMmkv() !== null;
  },
};
