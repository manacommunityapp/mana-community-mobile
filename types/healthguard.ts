export type IncidentSeverity =
  | 'LEVEL_1_NOTICE'
  | 'LEVEL_2_ATTENTION'
  | 'LEVEL_3_POSSIBLE_EMERGENCY'
  | 'LEVEL_4_CONFIRMED';

export type IncidentStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED' | 'ESCALATED';
export type AlertTriggerType = 'MANUAL_SOS' | 'SYMPTOM_REPORT' | 'HEART_RATE_ALERT' | 'FALL_DETECTION' | 'INACTIVITY_ALERT';
export type NotificationChannel = 'PUSH' | 'SMS' | 'IN_APP' | 'PHONE_CALL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';
export type BloodGroup = 'A_POSITIVE' | 'A_NEGATIVE' | 'B_POSITIVE' | 'B_NEGATIVE' | 'O_POSITIVE' | 'O_NEGATIVE' | 'AB_POSITIVE' | 'AB_NEGATIVE' | 'UNKNOWN';
export type ContactRelationship = 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'FRIEND' | 'NEIGHBOR' | 'DOCTOR' | 'CAREGIVER' | 'OTHER';

export interface HealthProfileDto {
  id?: number;
  userId?: number;
  bloodGroup?: BloodGroup;
  allergies?: string;
  medicalConditions?: string;
  emergencyNotes?: string;
  heightCm?: number;
  weightKg?: number;
  dateOfBirth?: string;
  organDonorConsent?: boolean;
  medicalIdNumber?: string;
  physicianName?: string;
  physicianPhone?: string;
}

export interface EmergencyContactDto {
  id?: number;
  userId?: number;
  name: string;
  phone: string;
  email?: string;
  relationship?: ContactRelationship;
  priority?: number;
  notifyOnSos?: boolean;
  notifyOnAlert?: boolean;
  consentGiven?: boolean;
  isActive?: boolean;
}

export interface EmergencyNotificationDto {
  id?: number;
  incidentId?: number;
  recipientUserId?: number;
  recipientPhone?: string;
  recipientName?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  message?: string;
  sentAt?: string;
  acknowledgedAt?: string;
}

export interface EmergencyIncidentDto {
  id?: number;
  incidentUuid?: string;
  userId?: number;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  description?: string;
  triggerType?: AlertTriggerType;
  triggeredAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  notes?: string;
  alertsSent?: number;
  notifications?: EmergencyNotificationDto[];
}

export interface TriggerSosRequest {
  description?: string;
  triggerType?: AlertTriggerType;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  severity?: IncidentSeverity;
}
