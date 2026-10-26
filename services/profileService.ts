import api from './apiClient';
import { inferMimeType, verifyServerUploadResponse } from '@/security';
import type { UserProfileResponse } from '@/types/api';

export interface UpdateProfileRequest {
  name:       string;
  mobile?:    string;
  bio?:       string;
  profession?: string;
  flatNumber?: string;
  tower?:     string;
}

export const profileService = {
  async getProfile(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    const data = res.data;
    const resolvedName = data.fullName || data.name || (data as any).username || (data as any).displayName || (data.email ? data.email.split('@')[0] : '');
    return {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
    };
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    try {
      const res = await api.put<UserProfileResponse>('/users/me', data);
      const updated = res.data;
      const resolvedName = updated.fullName || updated.name || (updated as any).username || (updated as any).displayName || (updated.email ? updated.email.split('@')[0] : '');
      return {
        ...updated,
        fullName: resolvedName,
        name: resolvedName,
      };
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update profile. Please try again.');
    }
  },

  async uploadPhoto(
    localUri: string,
    declaredMimeType?: string,
    onProgress?: (pct: number) => void,
  ): Promise<{ photoUrl: string }> {
    try {
      const fileName = localUri.split('/').pop() ?? 'photo.jpg';
      const mimeType = inferMimeType(localUri, declaredMimeType);

      const form = new FormData();
      form.append('file', {
        uri:  localUri,
        name: fileName,
        type: mimeType,
      } as any);

      const res = await api.put<Record<string, unknown>>(
        '/users/me/profile-photo',
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total && onProgress) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        },
      );
      const photoUrl = verifyServerUploadResponse(res.data);
      return { photoUrl };
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to upload photo. Please try again.');
    }
  },

  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      await api.post('/users/push-token', { token, platform });
    } catch {
      // Push token registration failures are non-critical
    }
  },

  async removePushToken(token: string): Promise<void> {
    try {
      await api.delete('/users/push-token', { data: { token } });
    } catch {
      // Push token removal failures are non-critical
    }
  },
};
