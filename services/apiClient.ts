import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '@/constants/config';

// ── Standard API envelope types ────────────────────────────────
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  correlationId: string;
  timestamp: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public correlationId?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Last correlationId received from the server
let _lastCorrelationId: string | undefined;
export function getLastCorrelationId(): string | undefined {
  return _lastCorrelationId;
}

// Module-level communityId set by TenantProvider (commit C)
let _communityId: number | null = null;
export function setTenantCommunityId(id: number | null): void {
  _communityId = id;
}

const ACCESS_TOKEN_KEY    = 'mana_access_token';
const REFRESH_TOKEN_KEY   = 'mana_refresh_token';
const PUSH_TOKEN_KEY      = 'mana_push_token';
// Encrypted snapshot of the last-known UserProfileResponse, used for offline launch.
// Written after every successful getProfile() call; cleared on logout.
const CACHED_PROFILE_KEY  = 'mana_cached_profile';

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
  getAccess:          () => store.getItemAsync(ACCESS_TOKEN_KEY),
  getRefresh:         () => store.getItemAsync(REFRESH_TOKEN_KEY),
  getPushToken:       () => store.getItemAsync(PUSH_TOKEN_KEY),
  setAccess:          (t: string) => store.setItemAsync(ACCESS_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  setRefresh:         (t: string) => store.setItemAsync(REFRESH_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  setPushToken:       (t: string) => store.setItemAsync(PUSH_TOKEN_KEY, t, SECURE_STORE_OPTIONS),
  clearPushToken:     () => store.deleteItemAsync(PUSH_TOKEN_KEY),
  // Cached profile for offline launch
  getCachedProfile:   () => store.getItemAsync(CACHED_PROFILE_KEY),
  setCachedProfile:   (json: string) => store.setItemAsync(CACHED_PROFILE_KEY, json, SECURE_STORE_OPTIONS),
  clearCachedProfile: () => store.deleteItemAsync(CACHED_PROFILE_KEY),
  clearAll:           async () => {
    await store.deleteItemAsync(ACCESS_TOKEN_KEY);
    await store.deleteItemAsync(REFRESH_TOKEN_KEY);
    await store.deleteItemAsync(PUSH_TOKEN_KEY);
    await store.deleteItemAsync(CACHED_PROFILE_KEY);
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
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateTraceparent(): string {
  let traceId = '';
  let spanId = '';
  for (let i = 0; i < 32; i++) traceId += Math.floor(Math.random() * 16).toString(16);
  for (let i = 0; i < 16; i++) spanId += Math.floor(Math.random() * 16).toString(16);
  return `00-${traceId}-${spanId}-01`;
}

function generateIdempotencyKey(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

// Attach JWT on every request & normalize duplicate /api prefix
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  config.headers['X-Platform'] = 'mobile';
  const correlationId = generateCorrelationId();
  config.headers['X-Correlation-ID'] = correlationId;
  config.headers['X-Correlation-Id'] = correlationId;
  config.headers['traceparent'] = generateTraceparent();

  // Idempotency key for mutating requests
  const method = (config.method ?? '').toUpperCase();
  if (['POST', 'PUT', 'PATCH'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = generateIdempotencyKey();
  }

  // Tenant context header (populated by TenantProvider)
  if (_communityId != null) {
    config.headers['X-Community-ID'] = String(_communityId);
  }

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
  (res) => {
    // Capture correlationId from response header
    const hdr = res.headers?.['x-correlation-id'] as string | undefined;
    if (hdr) _lastCorrelationId = hdr;

    // Unwrap ApiEnvelope if present
    const body = res.data as ApiEnvelope<unknown> | unknown;
    if (
      body !== null &&
      typeof body === 'object' &&
      'success' in (body as object) &&
      'data' in (body as object)
    ) {
      const env = body as ApiEnvelope<unknown>;
      if (env.correlationId) _lastCorrelationId = env.correlationId;
      if (!env.success) {
        throw new ApiError(env.message ?? 'Request failed', env.correlationId, res.status);
      }
      res.data = env.data;
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url || '';
    const isAuthRoute = url.includes('/auth/login') ||
                        url.includes('/auth/register') ||
                        url.includes('/auth/refresh') ||
                        url.includes('/auth/forgot-password');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
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
