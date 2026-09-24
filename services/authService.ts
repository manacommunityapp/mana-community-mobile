import api, { tokenStore } from './apiClient';
import type {
  LoginRequest, LoginResponse, RegisterRequest,
  UserProfileResponse, CommunityPreviewDto, KycSubmitRequest,
} from '@/types/api';

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

  /** Look up a community by invite code — shown on Step 2 before registering. */
  async lookupCommunity(inviteCode: string): Promise<CommunityPreviewDto> {
    const res = await api.get<CommunityPreviewDto>(
      `/communities/lookup?code=${encodeURIComponent(inviteCode.trim().toUpperCase())}`,
    );
    return res.data;
  },

  /** Submit KYC document details after registration. */
  async submitKyc(data: KycSubmitRequest): Promise<UserProfileResponse> {
    const res = await api.put<UserProfileResponse>('/auth/kyc', data);
    return res.data;
  },

  /** Poll for approval — returns fresh profile (check kycStatus). */
  async pollApprovalStatus(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    return res.data;
  },
};
