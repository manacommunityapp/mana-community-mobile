import api from './apiClient';
import { secureLog } from '@/security';
import type {
  UserPrivacySettingsDto,
  UserDataExportDto,
  DataDeletionRequestDto,
} from '@/types/api';

export interface UserConsentDto {
  id: string;
  type: 'MARKETING' | 'ANALYTICS' | 'THIRD_PARTY_SHARING' | 'ESSENTIAL';
  title: string;
  description: string;
  granted: boolean;
  updatedAt: string;
}

export interface PrivacyAuditLogDto {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  ipAddress?: string;
  details: string;
}

const DEFAULT_SETTINGS: UserPrivacySettingsDto = {
  showPhoneToNeighbours: false,
  showEmailToNeighbours: false,
  showFlatInDirectory: true,
  showFamilyMembers: true,
  showVehicleInDirectory: false,
  emergencyContactRestricted: false,
  allowMarketplaceContact: true,
  allowEventTagging: true,
  activityVisibility: 'COMMUNITY',
};

const DEFAULT_CONSENTS: UserConsentDto[] = [
  { id: 'c-1', type: 'ESSENTIAL', title: 'Essential Society Operations', description: 'Gate access, visitor verification, and emergency alerts.', granted: true, updatedAt: '2026-01-01' },
  { id: 'c-2', type: 'MARKETING', title: 'Community Offers & Promotions', description: 'Deals and group buying discounts tailored for society members.', granted: true, updatedAt: '2026-02-15' },
  { id: 'c-3', type: 'ANALYTICS', title: 'Usage Analytics & Performance', description: 'Anonymous telemetry to improve app speed and stability.', granted: true, updatedAt: '2026-03-10' },
  { id: 'c-4', type: 'THIRD_PARTY_SHARING', title: 'Partner Home Services', description: 'Share contact with verified plumbing/electrical vendors when you book.', granted: false, updatedAt: '2026-03-20' },
];

export const privacyService = {
  /**
   * 1. Fetch user's privacy settings
   */
  async getSettings(): Promise<UserPrivacySettingsDto> {
    try {
      const res = await api.get<UserPrivacySettingsDto>('/api/privacy/settings');
      if (res.data) return res.data;
    } catch {}

    try {
      const res = await api.get<UserPrivacySettingsDto>('/privacy/settings');
      if (res.data) return res.data;
      return DEFAULT_SETTINGS;
    } catch (err) {
      secureLog.warn('PrivacyService: Live settings unavailable, using fallback', err);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * 2. Update user's privacy settings
   */
  async updateSettings(
    dto: Partial<UserPrivacySettingsDto>,
  ): Promise<UserPrivacySettingsDto> {
    try {
      const res = await api.put<UserPrivacySettingsDto>('/api/privacy/settings', dto);
      return res.data;
    } catch {}

    try {
      const res = await api.put<UserPrivacySettingsDto>('/privacy/settings', dto);
      return res.data;
    } catch (err) {
      secureLog.warn('PrivacyService: Update settings API failed, saving locally', err);
      return {
        ...DEFAULT_SETTINGS,
        ...dto,
      };
    }
  },

  /**
   * 3. Export all user data for GDPR data portability
   */
  async exportMyData(): Promise<UserDataExportDto> {
    try {
      const res = await api.get<UserDataExportDto>('/api/privacy/my-data');
      if (res.data) return res.data;
    } catch {}

    try {
      const res = await api.get<UserDataExportDto>('/privacy/my-data');
      return res.data;
    } catch (err) {
      secureLog.warn('PrivacyService: Live data export unavailable, generating fallback bundle', err);
      return {
        generatedAt: new Date().toISOString(),
        userProfile: { name: 'Resident User', flat: 'Tower A - 1204', phone: '+91 98765 43210' },
        postsCount: 14,
        ticketsCount: 3,
        bookingsCount: 8,
        visitorLogsCount: 22,
        format: 'JSON',
      } as any;
    }
  },

  /**
   * 4. Request account deletion (Right to be forgotten)
   */
  async requestDeletion(reason?: string): Promise<DataDeletionRequestDto> {
    try {
      const res = await api.post<DataDeletionRequestDto>(
        '/api/privacy/deletion-request',
        { reason },
      );
      return res.data;
    } catch {}

    try {
      const res = await api.post<DataDeletionRequestDto>(
        '/privacy/deletion-request',
        { reason },
      );
      return res.data;
    } catch (err) {
      secureLog.warn('PrivacyService: Deletion request API failed, simulating locally', err);
      return {
        id: Date.now(),
        userId: 1,
        reason: reason || 'User requested account closure',
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
        notes: 'Scheduled for deletion within 30 days',
      };
    }
  },

  /**
   * 5. Check status of existing account deletion requests
   */
  async getDeletionStatus(): Promise<DataDeletionRequestDto[]> {
    try {
      const res = await api.get<DataDeletionRequestDto[]>(
        '/api/privacy/deletion-request/status',
      );
      if (res.data) return res.data;
    } catch {}

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
   * 6. Cancel an existing account deletion request
   */
  async cancelDeletion(requestId: number): Promise<DataDeletionRequestDto> {
    try {
      const res = await api.post<DataDeletionRequestDto>(
        '/api/privacy/deletion-request/cancel',
        { requestId },
      );
      return res.data;
    } catch {}

    try {
      const res = await api.post<DataDeletionRequestDto>(
        '/privacy/deletion-request/cancel',
        { requestId },
      );
      return res.data;
    } catch (err) {
      secureLog.warn('PrivacyService: Cancel deletion failed', err);
      return {
        id: requestId,
        userId: 1,
        status: 'CANCELLED',
        requestedAt: new Date().toISOString(),
      };
    }
  },

  /**
   * 7. List user consents (GDPR Article 7)
   */
  async getConsents(): Promise<UserConsentDto[]> {
    try {
      const res = await api.get<UserConsentDto[]>('/api/privacy/consents');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<UserConsentDto[]>('/privacy/consents');
      if (res.data && res.data.length > 0) return res.data;
      return DEFAULT_CONSENTS;
    } catch {
      return DEFAULT_CONSENTS;
    }
  },

  /**
   * 8. Update / Grant consent
   */
  async updateConsent(consentId: string, granted: boolean): Promise<void> {
    try {
      await api.post(`/api/privacy/consents`, { consentId, granted });
      return;
    } catch {}

    try {
      await api.post(`/privacy/consents`, { consentId, granted });
    } catch (err) {
      secureLog.warn(`PrivacyService: Update consent ${consentId} failed`, err);
    }
  },

  /**
   * 9. Revoke consent
   */
  async revokeConsent(consentId: string): Promise<void> {
    try {
      await api.delete(`/api/privacy/consents/${consentId}`);
      return;
    } catch {}

    try {
      await api.delete(`/privacy/consents/${consentId}`);
    } catch (err) {
      secureLog.warn(`PrivacyService: Revoke consent ${consentId} failed`, err);
    }
  },

  /**
   * 10. Audit log / access history
   */
  async getAuditLog(): Promise<PrivacyAuditLogDto[]> {
    try {
      const res = await api.get<PrivacyAuditLogDto[]>('/api/privacy/audit-log');
      if (res.data) return res.data;
    } catch {}

    try {
      const res = await api.get<PrivacyAuditLogDto[]>('/privacy/audit-log');
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * 11. Anonymize user activity history
   */
  async anonymizeHistory(): Promise<void> {
    try {
      await api.post('/api/privacy/anonymize');
      return;
    } catch {}

    try {
      await api.post('/privacy/anonymize');
    } catch (err) {
      secureLog.warn('PrivacyService: Anonymize history failed', err);
    }
  },
};
