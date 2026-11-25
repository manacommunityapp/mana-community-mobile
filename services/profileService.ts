import api from './apiClient';
import { inferMimeType, verifyServerUploadResponse } from '@/security';
import type { UserProfileResponse } from '@/types/api';

export interface UpdateProfileRequest {
  name?:          string;
  fullName?:      string;
  mobile?:        string;
  phone?:         string;
  bio?:           string;
  profession?:    string;
  flatNumber?:    string;
  flatNo?:        string;
  tower?:         string;
  block?:         string;
  profilePicUrl?: string;
  profilePhoto?:  string;
}

export const profileService = {
  async getProfile(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    const data = res.data;
    const resolvedName =
      data.fullName ||
      data.name ||
      (data as any).username ||
      (data as any).displayName ||
      (data.email ? data.email.split('@')[0] : '');
    const flat = data.flatNo || data.flatNumber || '';
    const twr = data.tower || data.block || '';
    const ph = data.phone || data.mobile || '';
    const photo = data.profilePicUrl || data.profilePhoto || '';

    return {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      flatNo: flat,
      flatNumber: flat,
      tower: twr,
      block: twr,
      phone: ph,
      mobile: ph,
      profilePicUrl: photo,
      profilePhoto: photo,
    };
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    try {
      const resolvedName = (data.fullName || data.name || '').trim();
      const resolvedPhone = (data.phone || data.mobile || '').trim();
      const resolvedFlat = (data.flatNo || data.flatNumber || '').trim();
      const resolvedTower = (data.tower || data.block || '').trim();

      const payload = {
        name: resolvedName,
        fullName: resolvedName,
        mobile: resolvedPhone || undefined,
        phone: resolvedPhone || undefined,
        flatNumber: resolvedFlat || undefined,
        flatNo: resolvedFlat || undefined,
        tower: resolvedTower || undefined,
        block: resolvedTower || undefined,
        bio: data.bio?.trim() || undefined,
        profession: data.profession?.trim() || undefined,
        profilePicUrl: data.profilePicUrl || data.profilePhoto || undefined,
      };

      const res = await api.put<UserProfileResponse>('/users/me', payload);
      const updated = res.data;
      const resName =
        updated.fullName ||
        updated.name ||
        (updated as any).username ||
        (updated as any).displayName ||
        (updated.email ? updated.email.split('@')[0] : '');
      const flat = updated.flatNo || updated.flatNumber || '';
      const twr = updated.tower || updated.block || '';
      const ph = updated.phone || updated.mobile || '';
      const photo = updated.profilePicUrl || updated.profilePhoto || '';

      return {
        ...updated,
        fullName: resName,
        name: resName,
        flatNo: flat,
        flatNumber: flat,
        tower: twr,
        block: twr,
        phone: ph,
        mobile: ph,
        profilePicUrl: photo,
        profilePhoto: photo,
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

      try {
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
      } catch (directErr: any) {
        // Resilient fallback: upload via centralized MediaController (/api/media/upload)
        const mediaForm = new FormData();
        mediaForm.append('file', {
          uri: localUri,
          name: fileName,
          type: mimeType,
        } as any);
        const uploadMeta = {
          module: 'USER',
          moduleId: 'avatar',
          communityId: 0,
          mediaType: 'IMAGE',
          subContext: 'avatar',
        };
        mediaForm.append(
          'request',
          new Blob([JSON.stringify(uploadMeta)], { type: 'application/json' }) as any,
        );

        const mediaRes = await api.post<Record<string, unknown>>('/media/upload', mediaForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total && onProgress) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        });
        const photoUrl = verifyServerUploadResponse(mediaRes.data);
        return { photoUrl };
      }
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
