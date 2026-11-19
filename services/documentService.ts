import { apiClient } from './apiClient';

export type DocumentCategory =
  | 'RENTAL_AGREEMENT'
  | 'DOCTOR_DOCUMENT'
  | 'VENDOR_KYC'
  | 'SPORTS_WAIVER'
  | 'INSURANCE_DOCUMENT'
  | 'INVOICE'
  | 'EVENT_SPONSORSHIP_CONTRACT'
  | 'GOVERNANCE_RECORD'
  | 'OTHER';

export type DocumentStatus = 'PENDING_SCAN' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED' | 'DELETED';
export type DocScanStatus = 'PENDING' | 'CLEAN' | 'INFECTED' | 'SCAN_FAILED';
export type DocAccessLevel = 'OWNER_ONLY' | 'COMMUNITY_ADMIN' | 'COMMUNITY' | 'PUBLIC';

export interface DocumentDto {
  id: number;
  title: string;
  description?: string;
  category: DocumentCategory;
  entityType?: string;
  entityId?: string;
  status: DocumentStatus;
  accessLevel: DocAccessLevel;
  expiresAt?: string;
  expiryWarning: boolean;
  versionCount: number;
  currentVersionFilename?: string;
  fileSizeBytes?: number;
  scanStatus?: DocScanStatus;
  createdAt: string;
  createdBy: number;
}

export interface DocumentVersionDto {
  id: number;
  versionNumber: number;
  originalFilename: string;
  contentType?: string;
  fileSizeBytes?: number;
  scanStatus: DocScanStatus;
  uploadedAt: string;
  uploadedBy: number;
}

export interface DocumentUploadRequest {
  title: string;
  description?: string;
  category: DocumentCategory;
  entityType?: string;
  entityId?: string;
  accessLevel?: DocAccessLevel;
  expiresAt?: string;
  reminderDaysBefore?: number;
  retentionDays?: number;
}

export const documentService = {
  upload: (
    request: DocumentUploadRequest,
    file: { uri: string; name: string; type: string },
  ): Promise<DocumentDto> => {
    const form = new FormData();
    form.append('metadata', JSON.stringify(request));
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<DocumentDto>('/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  get: (id: number): Promise<DocumentDto> =>
    apiClient.get<DocumentDto>(`/documents/${id}`).then((r) => r.data),

  download: (id: number): Promise<{ url: string; expiresAt: string }> =>
    apiClient
      .get<{ url: string; expiresAt: string }>(`/documents/${id}/download`)
      .then((r) => r.data),

  getVersions: (id: number): Promise<DocumentVersionDto[]> =>
    apiClient
      .get<DocumentVersionDto[]>(`/documents/${id}/versions`)
      .then((r) => r.data),

  uploadVersion: (
    id: number,
    file: { uri: string; name: string; type: string },
  ): Promise<DocumentVersionDto> => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return apiClient
      .post<DocumentVersionDto>(`/documents/${id}/versions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  listByEntity: (entityType: string, entityId: string | number): Promise<DocumentDto[]> =>
    apiClient
      .get<DocumentDto[]>(`/documents/entity/${entityType}/${entityId}`)
      .then((r) => r.data),

  list: (category?: DocumentCategory): Promise<DocumentDto[]> =>
    apiClient
      .get<DocumentDto[]>('/documents', { params: category ? { category } : {} })
      .then((r) => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/documents/${id}`).then(() => {}),
};
