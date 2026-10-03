export type AuditCategory = 'SECURITY' | 'MEMBERS' | 'PRIVACY' | 'FINANCE' | 'SYSTEM';
export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: number;
  actorName: string;
  actorRole: string;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  ipAddress: string;
  location: string;
  userAgent: string;
  targetEntity?: string;
  details: Record<string, any>;
  sha256Hash: string;
  prevHash: string;
  chainVerified: boolean;
}

export interface AuditStats {
  totalLogsToday: number;
  criticalEventsCount: number;
  chainIntegrityPercent: number;
  lastTamperCheck: string;
}

export interface BulkResidentRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tower: string;
  flatNumber: string;
  occupancyStatus: 'OWNER' | 'TENANT' | 'FAMILY';
  role: 'RESIDENT' | 'COMMITTEE_MEMBER' | 'SECURITY';
  isValid: boolean;
  validationErrors?: string[];
}

export interface BulkUploadJob {
  id: string;
  filename: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  dispatchedInvites: number;
  uploadedAt: string;
}

export type PrivacyRequestType =
  | 'DATA_EXPORT_PORTABILITY'
  | 'DATA_ERASURE_FORGET'
  | 'CONSENT_REVOCATION'
  | 'RECTIFICATION';

export type PrivacyFramework = 'DPDP_ACT_2023' | 'GDPR' | 'CCPA';
export type PrivacyRequestStatus = 'PENDING_APPROVAL' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface PrivacyDataRequest {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  userFlat: string;
  requestType: PrivacyRequestType;
  framework: PrivacyFramework;
  status: PrivacyRequestStatus;
  requestedAt: string;
  dueBy: string;
  reason?: string;
  dualAdminSignoffs: string[];
  downloadUrl?: string;
  completedAt?: string;
  dataSummary?: {
    postsCount: number;
    paymentsCount: number;
    bookingsCount: number;
    auditRecordsCount: number;
  };
}
