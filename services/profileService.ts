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
  // GET /api/users/me
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

  // PUT /api/users/me
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const res = await api.put<UserProfileResponse>('/users/me', data);
    const updated = res.data;
    const resolvedName = updated.fullName || updated.name || (updated as any).username || (updated as any).displayName || (updated.email ? updated.email.split('@')[0] : '');
    return {
      ...updated,
      fullName: resolvedName,
      name: resolvedName,
    };
  },

  /**
   * Upload a profile photo.
   * Sends as multipart/form-data — Spring Boot expects:
   *   PUT /api/users/me/profile-photo
   *   Content-Type: multipart/form-data
   *   Field name: "file"
   */
  async uploadPhoto(
    localUri: string,
    declaredMimeType?: string,
    onProgress?: (pct: number) => void,
  ): Promise<{ photoUrl: string }> {
    const fileName = localUri.split('/').pop() ?? 'photo.jpg';
    const mimeType = inferMimeType(localUri, declaredMimeType);

    const form = new FormData();
    // React Native FormData accepts this object shape for files
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
  },

  // POST /api/users/push-token
  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await api.post('/users/push-token', { token, platform });
  },

  // DELETE /api/users/push-token  (call on logout)
  async removePushToken(token: string): Promise<void> {
    await api.delete('/users/push-token', { data: { token } });
  },
};
