export type ConsultationMode = "IN_PERSON" | "VIDEO" | "PHONE";
export type AppointmentStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "NO_SHOW";
export type DoctorVerificationStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
export type FamilyRelationship = "SELF" | "SPOUSE" | "CHILD" | "PARENT" | "DEPENDENT";
export type RecordType = "PRESCRIPTION" | "LAB_REPORT" | "VACCINATION" | "ALLERGY" | "CONDITION" | "DISCHARGE_SUMMARY";

export type ProviderCategory =
  | "DOCTOR"
  | "CLINIC"
  | "DENTIST"
  | "DIAGNOSTIC_CENTER"
  | "PHARMACY"
  | "PHYSIOTHERAPIST"
  | "HOME_CARE";

export interface ClinicHourSlot {
  day: string;
  morning?: string;
  evening?: string;
  isClosed?: boolean;
  is24x7?: boolean;
}

export interface AppointmentSlot {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  available: boolean;
  mode: ConsultationMode;
}

export interface CommunityOffer {
  title: string;
  badge: string;
  discountPercent?: number;
  promoCode?: string;
  description: string;
  validUntil: string;
}

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
  category?: ProviderCategory;
  qualifications: string[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  consultationModes: ConsultationMode[];
  availableSlots?: string[];
  nextAvailableSlot: string;
  verifiedBadge: boolean;
  registrationNumber: string;
  medicalCouncil: string;
  languages: string[];
  clinicName: string;
  clinicAddress: string;
  distanceKm?: number;
  phone?: string;
  email?: string;
  hospitalAffiliations: string[];
  verifiedCommunityConsultations: number;
  about?: string;
  reviews: DoctorReview[];
  clinicHours?: ClinicHourSlot[];
  appointmentSlots?: AppointmentSlot[];
  communityOffer?: CommunityOffer;
  emergencyServicesAvailable?: boolean;
  homeVisitAvailable?: boolean;
  openNow?: boolean;
  accreditations?: string[];
  mapsUrl?: string;
  department?: string;
}

export type AmbulanceVehicleType = "BASIC" | "ADVANCED" | "ICU";
export type AmbulanceStatus = "REQUESTED" | "DISPATCHED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "CANCELLED";
export type EmergencyCallbackStatus = "REQUESTED" | "AGENT_ASSIGNED" | "CALLED" | "RESOLVED" | "MISSED";
export type IpdAdmissionStatus = "REQUESTED" | "CONFIRMED" | "ADMITTED" | "DISCHARGED" | "CANCELLED";
export type WardType = "GENERAL" | "SEMI_PRIVATE" | "PRIVATE" | "ICU";

export interface AmbulanceBookingDto {
  id: string;
  bookingUuid: string;
  vehicleType: AmbulanceVehicleType;
  status: AmbulanceStatus;
  pickupAddress: string;
  destinationAddress?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  estimatedMinutes?: number;
  requestedAt: string;
  dispatchedAt?: string;
  arrivedAt?: string;
}

export interface EmergencyCallbackDto {
  id: string;
  callbackUuid: string;
  callerName: string;
  callerPhone: string;
  emergencyDescription: string;
  status: EmergencyCallbackStatus;
  assignedAgentName?: string;
  requestedAt: string;
  resolvedAt?: string;
}

export interface IpdAdmissionDto {
  id: string;
  admissionUuid: string;
  patientName: string;
  hospitalName: string;
  department: string;
  admissionReason: string;
  wardType: WardType;
  status: IpdAdmissionStatus;
  expectedAdmissionDate?: string;
  actualAdmissionDate?: string;
  dischargeDate?: string;
  bedNumber?: string;
  attendingDoctorName?: string;
  requestedAt: string;
}

export interface HealthReminderDto {
  id: string;
  patientId: string;
  title: string;
  type: "VACCINATION" | "APPOINTMENT" | "MEDICATION" | "CHECKUP";
  dueDate: string;
  completed: boolean;
  notes?: string;
}

export interface CaregiverDelegationDto {
  caregiverName: string;
  relationship: string;
  phone: string;
  accessScope: "FULL_ACCESS" | "VIEW_ONLY" | "EMERGENCY_ONLY";
  active: boolean;
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
  chronicConditions?: string[];
  consentToShareRecords: boolean;
  caregivers?: CaregiverDelegationDto[];
  upcomingReminders?: HealthReminderDto[];
}

export type CareJourneyStage = 
  | "APPOINTMENT_BOOKED" 
  | "CONSULTATION_COMPLETED" 
  | "PRESCRIPTION_ISSUED" 
  | "LAB_TEST_ORDERED" 
  | "RESULTS_READY" 
  | "FOLLOW_UP_SCHEDULED";

export interface CareJourneyDto {
  id: string;
  patientId: string;
  patientName: string;
  patientRelationship: FamilyRelationship;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  currentStage: CareJourneyStage;
  appointmentId: string;
  appointmentTime: string;
  mode: ConsultationMode;
  sharedReportIds: string[];
  prescriptionId?: string;
  prescriptionDate?: string;
  prescriptionSummary?: string;
  labPackageName?: string;
  sampleCollected?: boolean;
  resultsAvailable: boolean;
  resultReadyNotificationSent: boolean;
  resultDocumentId?: string;
  clinicianRecommendedFollowUp?: {
    isAppropriate: boolean;
    dueDate: string;
    instructions: string;
    status: "PENDING" | "BOOKED" | "DISMISSED";
  };
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
  careJourneyId?: string;
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

export type CampCategory = "DIABETES_CARDIAC" | "DENTAL_EYE" | "VACCINATION" | "KIDS_NUTRITION" | "SENIOR_SCREENING" | "GENERAL_HEALTH";

export interface HealthCampDto {
  id: string;
  title: string;
  campCategory: CampCategory;
  partnerProviderName: string;
  partnerLogo?: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSlots: number;
  totalSlots: number;
  isFree: boolean;
  feePerResident: number;
  servicesIncluded: string[];
  description: string;
  aggregateStats?: {
    totalRegistered: number;
    totalAttended: number;
    satisfactionRate: number;
  };
}

export interface HealthCampRegistrationDto {
  id: string;
  campId: string;
  campTitle: string;
  patientId: string;
  patientName: string;
  slotTime: string;
  attendanceStatus: "REGISTERED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW";
  notes?: string;
}

export interface HealthBenefitWalletDto {
  communityAllowance: number;
  usedAllowance: number;
  remainingAllowance: number;
  coveredServices: string[];
  reimbursementActive: boolean;
  recentClaims: {
    id: string;
    serviceName: string;
    amount: number;
    status: "APPROVED" | "PENDING" | "REIMBURSED";
    date: string;
  }[];
}

// ─────────────────────────────────────────────────────────────
// PROVIDER OPERATIONS TYPES (MOBILE)
// ─────────────────────────────────────────────────────────────

export type ProviderStaffRole = "CHIEF_DOCTOR" | "CONSULTANT" | "CLINIC_ADMIN" | "RECEPTIONIST" | "LAB_TECHNICIAN" | "PHLEBOTOMIST";

export interface ProviderStaffMemberDto {
  id: string;
  name: string;
  role: ProviderStaffRole;
  phone: string;
  permissions: string[];
  active: boolean;
}

export interface ProviderServiceItemDto {
  id: string;
  name: string;
  category: "CONSULTATION" | "PROCEDURE" | "DIAGNOSTIC_TEST" | "HOME_SAMPLE" | "VACCINATION";
  price: number;
  originalPrice?: number;
  communityDiscountPercent: number;
  turnaroundTime?: string;
  enabled: boolean;
}

export interface PatientQueryDto {
  id: string;
  patientName: string;
  patientPhone: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: "OPEN" | "RESPONDED";
  replyMessage?: string;
}

export interface ProviderFulfillmentOrderDto {
  id: string;
  orderNumber: string;
  patientName: string;
  patientFlatNo: string;
  serviceName: string;
  type: string;
  scheduledTime: string;
  status: "SCHEDULED" | "PHLEBOTOMIST_ASSIGNED" | "SAMPLE_COLLECTED" | "REPORT_DISPATCHED";
  assignedStaffName?: string;
}

export interface ProviderProfileDto {
  id: string;
  name: string;
  specialty: string;
  registrationNumber: string;
  clinicAddress: string;
  acceptingNewPatients: boolean;
  emergencySlotAvailable: boolean;
}