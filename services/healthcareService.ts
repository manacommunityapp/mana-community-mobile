import apiClient from './apiClient';

export interface PrescriptionFollowup {
  id: number;
  communityId: number;
  appointmentId: number;
  patientUserId: number;
  doctorId: number;
  medicationName: string;
  dosage?: string;
  durationDays?: number;
  followupDueDate: string;
  reminderSent: boolean;
  completed: boolean;
  completedAt?: string;
}

export interface Referral {
  id: number;
  communityId: number;
  referringDoctorId: number;
  patientUserId: number;
  referredToName: string;
  referredToType: string;
  specialization?: string;
  reason: string;
  urgency: string;
  referralDate: string;
  appointmentBooked: boolean;
  appointmentDate?: string;
  status: string;
  createdAt: string;
}

export interface ProviderCredential {
  id: number;
  communityId: number;
  providerId: number;
  credentialType: string;
  credentialNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate: string;
  verified: boolean;
  alertSent30: boolean;
  alertSent7: boolean;
}

export interface DiagnosticsSla {
  id: number;
  communityId: number;
  partnerId: number;
  partnerName: string;
  testCategory: string;
  slaHours: number;
  reportDueAt: string;
  reportDeliveredAt?: string;
  orderId: number;
  patientUserId: number;
  breach: boolean;
  breachNotified: boolean;
}

const BASE = '/api/healthcare';

export const healthcareService = {
  listFollowups: () => apiClient.get<PrescriptionFollowup[]>(`${BASE}/prescription-followups`).then(r => r.data),
  completeFollowup: (id: number) => apiClient.put<PrescriptionFollowup>(`${BASE}/prescription-followups/${id}/complete`, {}).then(r => r.data),
  listReferrals: () => apiClient.get<Referral[]>(`${BASE}/referrals`).then(r => r.data),
  listCredentials: () => apiClient.get<ProviderCredential[]>(`${BASE}/provider-credentials`).then(r => r.data),
  listDiagnosticBreaches: () => apiClient.get<DiagnosticsSla[]>(`${BASE}/diagnostics-sla/breaches`).then(r => r.data),
};
