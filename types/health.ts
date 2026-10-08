export type ConsultationMode = "IN_PERSON" | "VIDEO" | "PHONE";
export type AppointmentStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "NO_SHOW";
export type DoctorVerificationStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
export type FamilyRelationship = "SELF" | "SPOUSE" | "CHILD" | "PARENT" | "DEPENDENT";
export type RecordType = "PRESCRIPTION" | "LAB_REPORT" | "VACCINATION" | "ALLERGY" | "CONDITION" | "DISCHARGE_SUMMARY";

export interface DoctorReview {
  communication: number; // 1-5
  waitingTime: number;   // 1-5
  professionalism: number;// 1-5
  clinicExperience: number;// 1-5
  wouldRecommend: boolean;
  comment?: string;
  authorName: string;
  date: string;
}

export interface DoctorDto {
  id: string;
  name: string;
  specialty: string;
  qualifications: string[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  consultationModes: ConsultationMode[];
  availableSlots: string[];
  nextAvailableSlot: string;
  verifiedBadge: boolean;
  registrationNumber: string;
  medicalCouncil: string;
  languages: string[];
  clinicName: string;
  clinicAddress: string;
  hospitalAffiliations: string[];
  verifiedCommunityConsultations: number;
  about: string;
  reviews: DoctorReview[];
}

export interface FamilyMemberDto {
  id: string;
  residentUserId: string;
  fullName: string;
  relationship: FamilyRelationship;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: string;
  allergies?: string[];
  consentToShareRecords: boolean;
}

export interface HealthAppointmentDto {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientRelationship: FamilyRelationship;
  bookedByUserId: string;
  slotTime: string;
  mode: ConsultationMode;
  status: AppointmentStatus;
  fee: number;
  meetingLink?: string;
  clinicAddress?: string;
  statusHistory: string[];
  reviewSubmitted?: boolean;
}

export interface HealthAuditEntry {
  id: string;
  timestamp: string;
  accessorName: string;
  accessorRole: string;
  action: string;
  recordTitle: string;
}

export interface MedicalRecordDto {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  type: RecordType;
  date: string;
  doctorOrLabName: string;
  fileUrl: string;
  notes?: string;
  authorizedUserIds: string[];
}

export interface LabPackageDto {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  testCount: number;
  testsIncluded: string[];
  homeCollectionAvailable: boolean;
  fastingRequired: boolean;
  reportTurnaroundHours: number;
}

export interface HomecareProviderDto {
  id: string;
  name: string;
  role: "Nurse" | "Physiotherapist" | "Attendant" | "Elder Care" | "Post-Surgery Care" | "Medical Equipment";
  experienceYears: number;
  rating: number;
  verifiedHealthcareBadge: boolean;
  licenseNumber: string;
  dailyRate: number;
  hourlyRate: number;
  available: boolean;
  description: string;
}

export interface HealthEmergencyContactDto {
  id: string;
  name: string;
  type: "HOSPITAL" | "AMBULANCE" | "COMMUNITY_CLINIC" | "PHARMACY" | "BLOOD_BANK";
  phone: string;
  distanceKm: number;
  is24x7: boolean;
  address: string;
}

export interface AiTriageResponse {
  isEmergency: boolean;
  recommendedSpecialty: string;
  guidanceText: string;
  redFlags: string[];
  suggestedQuestions: string[];
}