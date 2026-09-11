import api, { tokenStore } from './apiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, UserProfileResponse } from '@/types/api';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', data);
    await tokenStore.setAccess(res.data.accessToken);
    await tokenStore.setRefresh(res.data.refreshToken);
    return res.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/register', data);
    await tokenStore.setAccess(res.data.accessToken);
    await tokenStore.setRefresh(res.data.refreshToken);
    return res.data;
  },

  async logout(): Promise<void> {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    await tokenStore.clearAll();
  },

  async getProfile(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    return res.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },
};
