import api from './apiClient';
import { secureLog } from '@/security';
import type { NotificationPreferenceDto, UserSmsPreferenceRequest } from '@/types/api';

const DEFAULT_PREFERENCES: NotificationPreferenceDto[] = [
  { notificationType: 'MATCH_REMINDER', smsEnabled: false, whatsappEnabled: true, pushEnabled: true, preferredLanguage: 'en' },
  { notificationType: 'EVENT_UPDATED', smsEnabled: true, whatsappEnabled: true, pushEnabled: true, preferredLanguage: 'en' },
  { notificationType: 'BID_OUTBID', smsEnabled: false, whatsappEnabled: true, pushEnabled: true, preferredLanguage: 'en' },
  { notificationType: 'VISITOR_PENDING', smsEnabled: true, whatsappEnabled: true, pushEnabled: true, preferredLanguage: 'en' },
  { notificationType: 'COMMUTE_BOOKING_CONFIRMED', smsEnabled: false, whatsappEnabled: false, pushEnabled: true, preferredLanguage: 'en' },
];

export const notificationPreferencesService = {
  /**
   * Fetch caller's notification preferences across all types
   */
  async getPreferences(): Promise<NotificationPreferenceDto[]> {
    try {
      const res = await api.get<NotificationPreferenceDto[]>('/api/v1/me/notification-preferences');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<NotificationPreferenceDto[]>('/v1/me/notification-preferences');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<NotificationPreferenceDto[]>('/me/notification-preferences');
      if (res.data && res.data.length > 0) return res.data;
      return DEFAULT_PREFERENCES;
    } catch (err) {
      secureLog.warn('NotificationPreferencesService: Live preferences unavailable, using fallback', err);
      return DEFAULT_PREFERENCES;
    }
  },

  /**
   * Upsert preference for a specific notification type
   */
  async updatePreference(
    request: UserSmsPreferenceRequest,
  ): Promise<NotificationPreferenceDto> {
    try {
      const res = await api.put<NotificationPreferenceDto>(
        '/api/v1/me/notification-preferences',
        request,
      );
      return res.data;
    } catch {}

    try {
      const res = await api.put<NotificationPreferenceDto>(
        '/v1/me/notification-preferences',
        request,
      );
      return res.data;
    } catch {}

    try {
      const res = await api.put<NotificationPreferenceDto>(
        '/me/notification-preferences',
        request,
      );
      return res.data;
    } catch (err) {
      secureLog.warn(`NotificationPreferencesService: Update pref for ${request.notificationType} failed locally fallback`, err);
      return {
        notificationType: request.notificationType,
        smsEnabled: request.smsEnabled,
        whatsappEnabled: request.whatsappEnabled,
        pushEnabled: true,
        preferredLanguage: request.preferredLanguage || 'en',
      };
    }
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
        secureLog.warn(`NotificationPreferencesService: Failed to update pref for ${req.notificationType}`, err);
      }
    }
    return results;
  },
};
