import { apiClient } from './apiClient';

export type NoShowStatus = 'PENDING' | 'CONFIRMED_NO_SHOW' | 'EXCUSED' | 'DISPUTED';
export type DiagnosticsStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'RESULTS_READY' | 'DELIVERED';
export type ReferralStatus = 'ISSUED' | 'ACCEPTED' | 'COMPLETED' | 'EXPIRED';
export type CredentialStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED';

export interface DiagnosticsOrderDto {
  id: number;
  partnerName: string;
  testNames: string;
  orderedAt: string;
  expectedAt: string;
  status: DiagnosticsStatus;
  slaHours: number;
  slaBreached: boolean;
  resultsUrl?: string;
  completedAt?: string;
}

export interface DoctorReferralDto {
  id: number;
  referringDoctorId: number;
  specialty: string;
  reason: string;
  status: ReferralStatus;
  referredAt: string;
  acceptedAt?: string;
  completedAt?: string;
  expiresAt: string;
}

export interface CaregiverConsentDto {
  id: number;
  caregiverUserId: number;
  relationship: string;
  canViewRecords: boolean;
  canBookAppointments: boolean;
  canReceiveReports: boolean;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface GrantCaregiverConsentRequest {
  caregiverUserId: number;
  relationship: string;
  canViewRecords: boolean;
  canBookAppointments: boolean;
  canReceiveReports: boolean;
}

export interface ExpiringCredentialDto {
  id: number;
  doctorId: number;
  credentialType: string;
  credentialNumber?: string;
  issuingBody?: string;
  expiryDate: string;
  status: CredentialStatus;
}

export interface AppointmentNoShowDto {
  id: number;
  appointmentId: number;
  patientUserId: number;
  status: NoShowStatus;
  noShowFee: number;
  feeWaived: boolean;
  createdAt: string;
}

export const healthcareOpsService = {
  // Patient's diagnostics orders
  getDiagnosticsOrders: (patientId: number): Promise<DiagnosticsOrderDto[]> =>
    apiClient.get<DiagnosticsOrderDto[]>(`/healthcare/diagnostics/patient/${patientId}`).then(r => r.data),

  // Patient's referrals
  getReferrals: (patientId: number): Promise<DoctorReferralDto[]> =>
    apiClient.get<DoctorReferralDto[]>(`/healthcare/referrals/patient/${patientId}`).then(r => r.data),

  // Caregiver consent (patient manages)
  getCaregiverConsents: (patientId: number): Promise<CaregiverConsentDto[]> =>
    apiClient.get<CaregiverConsentDto[]>(`/healthcare/caregiver-consent?patientId=${patientId}`).then(r => r.data),

  grantCaregiverConsent: (req: GrantCaregiverConsentRequest): Promise<CaregiverConsentDto> =>
    apiClient.post<CaregiverConsentDto>('/healthcare/caregiver-consent', req).then(r => r.data),

  revokeCaregiverConsent: (id: number): Promise<void> =>
    apiClient.delete(`/healthcare/caregiver-consent/${id}`).then(() => {}),

  // Admin: expiring provider credentials
  getExpiringCredentials: (communityId: number, days = 30): Promise<ExpiringCredentialDto[]> =>
    apiClient.get<ExpiringCredentialDto[]>(`/healthcare/credentials/expiring?communityId=${communityId}&days=${days}`).then(r => r.data),

  // Doctor no-shows
  getNoShows: (doctorId: number): Promise<AppointmentNoShowDto[]> =>
    apiClient.get<AppointmentNoShowDto[]>(`/healthcare/no-shows?doctorId=${doctorId}`).then(r => r.data),
};
