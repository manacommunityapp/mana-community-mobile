import api from './apiClient';
import type {
  UserPrivacySettingsDto,
  UserDataExportDto,
  DataDeletionRequestDto,
} from '@/types/api';

export const privacyService = {
  /**
   * Fetch user's privacy settings
   */
  async getSettings(): Promise<UserPrivacySettingsDto> {
    const res = await api.get<UserPrivacySettingsDto>('/privacy/settings');
    return res.data;
  },

  /**
   * Update user's privacy settings
   */
  async updateSettings(
    dto: Partial<UserPrivacySettingsDto>,
  ): Promise<UserPrivacySettingsDto> {
    const res = await api.put<UserPrivacySettingsDto>('/privacy/settings', dto);
    return res.data;
  },

  /**
   * Export all user data for GDPR data portability
   */
  async exportMyData(): Promise<UserDataExportDto> {
    const res = await api.get<UserDataExportDto>('/privacy/my-data');
    return res.data;
  },

  /**
   * Request account deletion (Right to be forgotten)
   */
  async requestDeletion(reason?: string): Promise<DataDeletionRequestDto> {
    const res = await api.post<DataDeletionRequestDto>(
      '/privacy/deletion-request',
      { reason },
    );
    return res.data;
  },

  /**
   * Check status of existing account deletion requests
   */
  async getDeletionStatus(): Promise<DataDeletionRequestDto[]> {
    try {
      const res = await api.get<DataDeletionRequestDto[]>(
        '/privacy/deletion-request/status',
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Cancel an existing account deletion request
   */
  async cancelDeletion(requestId: number): Promise<DataDeletionRequestDto> {
    const res = await api.post<DataDeletionRequestDto>(
      '/privacy/deletion-request/cancel',
      { requestId },
    );
    return res.data;
  },
};
