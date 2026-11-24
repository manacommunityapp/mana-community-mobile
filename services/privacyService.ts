import apiClient from './apiClient';
import type { UserPrivacySettingsDto, UserDataExportDto, DataDeletionRequestDto } from '@/types/api';

export type ConsentPurposeCode =
  | 'HEALTH_TREATMENT'
  | 'HEALTH_RESEARCH'
  | 'COMMUNITY_SERVICES'
  | 'MARKETING'
  | 'ANALYTICS'
  | 'LOCATION_SERVICES'
  | 'THIRD_PARTY_SHARING';

export interface ConsentRecord {
  id: number;
  purposeCode: ConsentPurposeCode;
  purposeName: string;
  action: 'GRANTED' | 'REVOKED';
  grantedAt?: string;
  revokedAt?: string;
  noticeVersion: string;
  isMandatory: boolean;
}

export interface RightsRequest {
  id: number;
  requestType: 'ACCESS' | 'CORRECTION' | 'ERASURE' | 'PORTABILITY' | 'GRIEVANCE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  details?: string;
  response?: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
}

export interface HealthAccessEntry {
  id: number;
  accessorType: string;
  accessorName?: string;
  accessType: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'DISCLOSE' | 'EXPORT';
  recordType: string;
  purpose?: string;
  accessedAt: string;
}

export const privacyService = {
  async getConsents(): Promise<ConsentRecord[]> {
    return apiClient.get('/privacy/consents');
  },

  async grantConsent(purposeCode: ConsentPurposeCode): Promise<void> {
    return apiClient.post(`/privacy/consents/${purposeCode}/grant`, {});
  },

  async revokeConsent(purposeCode: ConsentPurposeCode): Promise<void> {
    return apiClient.delete(`/privacy/consents/${purposeCode}`);
  },

  async getRightsRequests(): Promise<RightsRequest[]> {
    return apiClient.get('/privacy/rights-requests');
  },

  async submitRightsRequest(type: RightsRequest['requestType'], details: string): Promise<RightsRequest> {
    return apiClient.post('/privacy/rights-requests', { requestType: type, details });
  },

  async getHealthAccessLog(): Promise<HealthAccessEntry[]> {
    return apiClient.get('/privacy/health-access-log');
  },

  // Legacy settings-screen methods
  async getSettings(): Promise<UserPrivacySettingsDto> {
    return apiClient.get('/privacy/settings');
  },

  async updateSettings(settings: UserPrivacySettingsDto): Promise<UserPrivacySettingsDto> {
    return apiClient.put('/privacy/settings', settings);
  },

  async getDeletionStatus(): Promise<DataDeletionRequestDto[]> {
    return apiClient.get('/privacy/deletion-requests');
  },

  async exportMyData(): Promise<UserDataExportDto> {
    return apiClient.post('/privacy/export', {});
  },

  async requestDeletion(reason: string): Promise<DataDeletionRequestDto> {
    return apiClient.post('/privacy/deletion-requests', { reason });
  },

  async cancelDeletion(requestId: number): Promise<void> {
    return apiClient.delete(`/privacy/deletion-requests/${requestId}`);
  },
};
