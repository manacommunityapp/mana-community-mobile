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

/**
 * Normalizes client-side registration payload to match the backend RegisterRequest DTO.
 *
 * Backend expects:
 * - fullName (string)
 * - phone (10 digits)
 * - inviteCode (string)
 * - flatNo (string)
 * - block (string)
 * - gender (string: 'MALE' | 'FEMALE' | 'OTHER')
 * - consentToPrivacyNotice (boolean: true)
 *
 * Retains mobile legacy fields (name, mobile, communityCode, flatNumber, tower) as aliases
 * to ensure 100% interoperability with both legacy and strict backend DTO endpoints.
 */
export function normalizeRegisterPayload(data: RegisterRequest): RegisterRequest {
  const rawPhone = data.phone || data.mobile || '';
  const digitsOnly = String(rawPhone).replace(/\D/g, '');
  const phone10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

  const resolvedFullName = (data.fullName || data.name || '').trim();
  const resolvedInviteCode = (data.inviteCode || data.communityCode || '').trim() || undefined;
  const resolvedFlatNo = (data.flatNo || data.flatNumber || '').trim() || undefined;
  const resolvedBlock = (data.block || data.tower || '').trim() || undefined;
  const resolvedGender = (data.gender || 'OTHER').trim().toUpperCase() || 'OTHER';
  const consent = data.consentToPrivacyNotice !== undefined ? Boolean(data.consentToPrivacyNotice) : true;

  const payload: RegisterRequest = {
    ...data,
    // Backend canonical DTO fields
    fullName: resolvedFullName,
    phone: phone10,
    gender: resolvedGender,
    consentToPrivacyNotice: consent,

    // Mobile legacy compatibility aliases
    name: resolvedFullName,
    mobile: phone10,
  };

  if (resolvedInviteCode) {
    payload.inviteCode = resolvedInviteCode;
    payload.communityCode = resolvedInviteCode;
  } else {
    delete payload.inviteCode;
    delete payload.communityCode;
  }

  if (resolvedFlatNo) {
    payload.flatNo = resolvedFlatNo;
    payload.flatNumber = resolvedFlatNo;
  } else {
    delete payload.flatNo;
    delete payload.flatNumber;
  }

  if (resolvedBlock) {
    payload.block = resolvedBlock;
    payload.tower = resolvedBlock;
  } else {
    delete payload.block;
    delete payload.tower;
  }

  return payload;
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
    const payload = normalizeRegisterPayload(data);
    const res = await api.post<LoginResponse>('/auth/register', payload);
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

  async joinCommunity(params: {
    inviteCode: string;
    flatNo?: string;
    block?: string;
  }): Promise<UserProfileResponse> {
    const code = params.inviteCode.trim().toUpperCase();
    let communityId: number | undefined;
    try {
      const community = await authService.lookupCommunity(code);
      communityId = Number(community.id || community.communityId || community.id);
    } catch {
      // Lookup failed or not strictly required by join endpoint
    }

    try {
      await api.post('/communities/join', {
        inviteCode: code,
        ...(communityId ? { communityId } : {}),
        flatNo: params.flatNo?.trim() || undefined,
        block: params.block?.trim() || undefined,
      });
    } catch {
      // Fallback: update profile directly
      await api.put('/users/me', {
        ...(communityId ? { communityId } : {}),
        flatNumber: params.flatNo?.trim() || undefined,
        flatNo: params.flatNo?.trim() || undefined,
        tower: params.block?.trim() || undefined,
        block: params.block?.trim() || undefined,
        inviteCode: code,
      });
    }

    return authService.getProfile();
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
