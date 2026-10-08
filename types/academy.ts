export type LearningType =
  | 'WORKSHOP'
  | 'COURSE'
  | 'KIDS_CLASS'
  | 'FITNESS_SESSION'
  | 'PROFESSIONAL_SESSION'
  | 'COACHING'
  | 'TUTORING';

export type ProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type ProgramMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

export interface AcademyCategory {
  id: string;
  name: string;
  code: string;
  icon?: string;
  active: boolean;
  programCount?: number;
}

export interface SyllabusItem {
  sessionNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface AcademyInstructor {
  id: string;
  fullName: string;
  profession?: string;
  bio?: string;
  tower?: string;
  flatNumber?: string;
  skills?: string;
  totalSessions: number;
  totalLearners: number;
  averageRating: number;
  reviewCount: number;
  isVerified: boolean;
  badge?: string;
  avatarUrl?: string;
}

export interface AcademyProgram {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorTower?: string;
  instructorFlat?: string;
  instructorRating?: number;
  categoryName: string;
  categoryCode: string;
  title: string;
  summary: string;
  description: string;
  learningType: LearningType;
  level: ProgramLevel;
  mode: ProgramMode;
  location?: string;
  onlineMeetingUrl?: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  durationMinutes: number;
  totalSessions?: number;
  pricingType: 'FREE' | 'PAID';
  price: number;
  totalSeats: number;
  enrolledCount: number;
  userEnrolled: boolean;
  status: 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_APPROVAL';
  syllabus?: SyllabusItem[];
  prerequisites?: string[];
  materialsProvided?: string[];
  certificateProvided: boolean;
  tags?: string[];
}

export interface AttendanceSession {
  sessionId: string;
  sessionNumber: number;
  title: string;
  date: string;
  time: string;
  status: 'COMPLETED' | 'UPCOMING' | 'MISSED';
  attended: boolean;
  notes?: string;
}

export interface UserEnrollment {
  id: string;
  programId: string;
  programTitle: string;
  instructorName: string;
  instructorTower?: string;
  categoryName: string;
  startDate: string;
  startTime: string;
  location: string;
  mode: ProgramMode;
  status: 'CONFIRMED' | 'ATTENDED' | 'COMPLETED' | 'CANCELLED';
  qrCheckInToken: string;
  attendanceMarked: boolean;
  attendedSessions: number;
  totalSessions: number;
  attendanceHistory?: AttendanceSession[];
  certificateId?: string;
  pricePaid?: number;
}

export interface DigitalCertificate {
  id: string;
  enrollmentId: string;
  programId: string;
  programTitle: string;
  categoryName: string;
  recipientName: string;
  recipientFlat: string;
  instructorName: string;
  instructorDesignation: string;
  issueDate: string;
  certificateNumber: string;
  gradeScore?: string;
  skillsAcquired: string[];
  verificationUrl: string;
  communityName: string;
}

export interface ClassAttendee {
  id: string;
  studentName: string;
  flatNumber: string;
  tower: string;
  enrolledAt: string;
  attendedCount: number;
  totalSessions: number;
  paymentStatus: 'PAID' | 'FREE' | 'PENDING';
  amount: number;
  checkedInToday: boolean;
  qrToken: string;
}

export interface InstructorEarnings {
  totalGrossRevenue: number;
  platformFeeAmount: number;
  netPayoutAmount: number;
  pendingPayout: number;
  totalLearnersTaught: number;
  activeWorkshopsCount: number;
  completedWorkshopsCount: number;
}

export interface HostWorkshopRequest {
  title: string;
  categoryCode: string;
  learningType: LearningType;
  level: ProgramLevel;
  mode: ProgramMode;
  location?: string;
  onlineMeetingUrl?: string;
  startDate: string;
  startTime: string;
  durationMinutes: number;
  totalSessions: number;
  pricingType: 'FREE' | 'PAID';
  price: number;
  totalSeats: number;
  summary: string;
  description: string;
  prerequisites?: string;
  syllabus?: { title: string; description: string }[];
}

export interface InstructorApplication {
  id: string;
  applicantName: string;
  flatNumber: string;
  tower: string;
  profession: string;
  experienceYears: number;
  proposedSubject: string;
  qualifications: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
}

export interface ProgramApprovalItem {
  id: string;
  title: string;
  instructorName: string;
  tower: string;
  flatNumber: string;
  categoryName: string;
  learningType: LearningType;
  pricingType: 'FREE' | 'PAID';
  price: number;
  totalSeats: number;
  submittedDate: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  summary: string;
}

export interface AcademyAdminStats {
  totalActiveWorkshops: number;
  totalResidentFaculty: number;
  totalEnrollments: number;
  totalCertificatesIssued: number;
  grossRevenueGmv: number;
  communityFundContribution: number;
  pendingInstructorApplications: number;
  pendingProgramApprovals: number;
}
