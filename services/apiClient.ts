import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '@/constants/config';

const ACCESS_TOKEN_KEY  = 'mana_access_token';
const REFRESH_TOKEN_KEY = 'mana_refresh_token';
const PUSH_TOKEN_KEY    = 'mana_push_token';

// ── Token helpers ──────────────────────────────────────────────
export const tokenStore = {
  getAccess:      () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  getRefresh:     () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  getPushToken:   () => SecureStore.getItemAsync(PUSH_TOKEN_KEY),
  setAccess:      (t: string) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, t),
  setRefresh:     (t: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, t),
  setPushToken:   (t: string) => SecureStore.setItemAsync(PUSH_TOKEN_KEY, t),
  clearPushToken: () => SecureStore.deleteItemAsync(PUSH_TOKEN_KEY),
  clearAll:       async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  },
};

// ── Axios instance ─────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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

export default api;
