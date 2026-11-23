import api, { tokenStore } from './apiClient';
import { profileService } from './profileService';
import type { GovtIdType, LoginRequest, LoginResponse, RegisterRequest, UserProfileResponse } from '@/types/api';

/**
 * Onboarding KYC submission. There is deliberately no field for the raw
 * government ID number — only the SHA-256 digest of the normalised value plus
 * the last 4 characters for display. See `hashGovtIdNumber` in kycService.
 */
export interface SubmitKycPayload {
  govtIdType: GovtIdType;
  /** SHA-256 (lowercase hex) of the normalised ID number. */
  govtIdNumberHash: string;
  /** Last 4 characters of the normalised ID, for display only. */
  govtIdLast4: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
}

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
    const profile: UserProfileResponse = {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      status: data.isActive === false ? 'SUSPENDED' : (data.status ?? 'ACTIVE'),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    // Persist to encrypted SecureStore so loadUser() can hydrate the app when offline.
    tokenStore.setCachedProfile(JSON.stringify(profile)).catch(() => {});
    return profile;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async lookupCommunity(inviteCode: string): Promise<any> {
    const res = await api.get(`/communities/lookup?code=${encodeURIComponent(inviteCode)}`);
    return res.data;
  },

  async getCommunityDetails(communityId: number): Promise<any> {
    const res = await api.get(`/communities/${communityId}`);
    return res.data;
  },

  async submitKyc(data: SubmitKycPayload): Promise<UserProfileResponse> {
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
