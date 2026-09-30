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
    const resolvedName = data.fullName || data.name || (data as any).username || (data as any).displayName || (data.email ? data.email.split('@')[0] : '');
    return {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      status: data.isActive === false ? 'SUSPENDED' : (data.status ?? 'ACTIVE'),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async lookupCommunity(inviteCode: string): Promise<any> {
    const res = await api.get(`/communities/lookup?code=${encodeURIComponent(inviteCode)}`);
    return res.data;
  },

  async submitKyc(data: any): Promise<UserProfileResponse> {
    const res = await api.post<UserProfileResponse>('/users/me/kyc', data);
    return res.data;
  },

  async pollApprovalStatus(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    const data = res.data;
    const resolvedName = data.fullName || data.name || (data as any).username || (data as any).displayName || (data.email ? data.email.split('@')[0] : '');
    return {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      status: data.isActive === false ? 'SUSPENDED' : (data.status ?? 'ACTIVE'),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  },
};
