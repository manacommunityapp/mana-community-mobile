import api, { tokenStore } from './apiClient';
import { profileService } from './profileService';
import type { LoginRequest, LoginResponse, RegisterRequest, UserProfileResponse } from '@/types/api';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', {
      identifier: data.identifier,
      password: data.password,
    });
    await tokenStore.setAccess(res.data.token);
    await tokenStore.setRefresh(res.data.refreshToken);
    return res.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/register', data);
    await tokenStore.setAccess(res.data.token);
    await tokenStore.setRefresh(res.data.refreshToken);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      const pushToken = await tokenStore.getPushToken();
      if (pushToken) {
        await profileService.removePushToken(pushToken).catch(() => {});
      }
    } catch { /* ignore */ }
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    await tokenStore.clearAll();
  },

  async getProfile(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    const data = res.data;
    return {
      ...data,
      name: data.fullName ?? data.name ?? '',
      status: data.isActive === false ? 'SUSPENDED' : (data.status ?? 'ACTIVE'),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },
};
