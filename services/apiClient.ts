import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '@/constants/config';

const ACCESS_TOKEN_KEY  = 'mana_access_token';
const REFRESH_TOKEN_KEY = 'mana_refresh_token';
const PUSH_TOKEN_KEY    = 'mana_push_token';

const webStore = {
  getItemAsync: (key: string) => Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItemAsync: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} return Promise.resolve(); },
  deleteItemAsync: (key: string) => { try { localStorage.removeItem(key); } catch {} return Promise.resolve(); },
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ── Token helpers ──────────────────────────────────────────────
export const tokenStore = {
  getAccess:      () => store.getItemAsync(ACCESS_TOKEN_KEY),
  getRefresh:     () => store.getItemAsync(REFRESH_TOKEN_KEY),
  getPushToken:   () => store.getItemAsync(PUSH_TOKEN_KEY),
  setAccess:      (t: string) => store.setItemAsync(ACCESS_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  setRefresh:     (t: string) => store.setItemAsync(REFRESH_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  setPushToken:   (t: string) => store.setItemAsync(PUSH_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  clearPushToken: () => store.deleteItemAsync(PUSH_TOKEN_KEY),
  clearAll:       async () => {
    await store.deleteItemAsync(ACCESS_TOKEN_KEY);
    await store.deleteItemAsync(REFRESH_TOKEN_KEY);
    await store.deleteItemAsync(PUSH_TOKEN_KEY);
  },
};

// ── Axios instance ─────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Helper to normalize endpoint path and prevent double /api prefix ─
export function normalizeApiPath(url?: string): string | undefined {
  if (!url) return url;
  let normalized = url.trim();
  // Strip all redundant leading '/api/' or 'api/' prefixes
  while (normalized.startsWith('/api/') || normalized.startsWith('api/')) {
    if (normalized.startsWith('/api/')) {
      normalized = normalized.substring(4);
    } else if (normalized.startsWith('api/')) {
      normalized = normalized.substring(3);
    }
  }
  if (normalized === '/api' || normalized === 'api') {
    return '';
  }
  if (normalized.length > 0 && !normalized.startsWith('/') && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = '/' + normalized;
  }
  return normalized;
}

function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Attach JWT on every request & normalize duplicate /api prefix
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  config.headers['X-Platform'] = 'mobile';
  config.headers['X-Correlation-Id'] = generateCorrelationId();

  // Fix Double /api Prefix Bug:
  // Since baseURL is configured as `${CONFIG.API_BASE_URL}/api`, any endpoint path passed with
  // a leading '/api/' or 'api/' (e.g. '/api/v1/emergency/sos/trigger') results in '/api/api/...'.
  // Strip the redundant leading '/api' from config.url so the resolved URL is always clean.
  if (config.url) {
    config.url = normalizeApiPath(config.url);
  }

  return config;
});

// Auto-refresh on 401
let refreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (refreshing) {
        // Queue calls while refresh is in-flight
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken: string) => {
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(original));
            },
            reject: (err: unknown) => reject(err),
          });
        });
      }

      refreshing = true;
      try {
        const refreshToken = await tokenStore.getRefresh();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        await tokenStore.setAccess(data.token);
        if (data.refreshToken) {
          await tokenStore.setRefresh(data.refreshToken);
        }
        refreshQueue.forEach((p) => p.resolve(data.token));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshErr) {
        await tokenStore.clearAll();
        refreshQueue.forEach((p) => p.reject(refreshErr));
        refreshQueue = [];
        // Redirect to login — handled by Expo Router's auth guard
        return Promise.reject(refreshErr);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api as apiClient };
export default api;
