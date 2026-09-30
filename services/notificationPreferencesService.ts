import api from './apiClient';
import type { NotificationPreferenceDto, UserSmsPreferenceRequest } from '@/types/api';

export const notificationPreferencesService = {
  /**
   * Fetch caller's notification preferences across all types
   */
  async getPreferences(): Promise<NotificationPreferenceDto[]> {
    try {
      const res = await api.get<NotificationPreferenceDto[]>('/v1/me/notification-preferences');
      return res.data || [];
    } catch (err) {
      console.warn('Failed to load notification preferences from server', err);
      return [];
    }
  },

  /**
   * Upsert preference for a specific notification type
   */
  async updatePreference(
    request: UserSmsPreferenceRequest,
  ): Promise<NotificationPreferenceDto> {
    const res = await api.put<NotificationPreferenceDto>(
      '/v1/me/notification-preferences',
      request,
    );
    return res.data;
  },

  /**
   * Batch update multiple preferences
   */
  async batchUpdate(
    requests: UserSmsPreferenceRequest[],
  ): Promise<NotificationPreferenceDto[]> {
    const results: NotificationPreferenceDto[] = [];
    for (const req of requests) {
      try {
        const updated = await this.updatePreference(req);
        results.push(updated);
      } catch (err) {
        console.warn(`Failed to update pref for ${req.notificationType}`, err);
      }
    }
    return results;
  },
};
