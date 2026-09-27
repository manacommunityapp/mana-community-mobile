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
}

export interface AcademyProgram {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorTower?: string;
  categoryName: string;
  title: string;
  summary: string;
  description: string;
  learningType: LearningType;
  level: ProgramLevel;
  mode: ProgramMode;
  location?: string;
  onlineMeetingUrl?: string;
  startDate: string;
  startTime: string;
  durationMinutes: number;
  pricingType: 'FREE' | 'PAID';
  price: number;
  totalSeats: number;
  enrolledCount: number;
  userEnrolled: boolean;
  status: 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface UserEnrollment {
  id: string;
  programId: string;
  programTitle: string;
  instructorName: string;
  startDate: string;
  startTime: string;
  location: string;
  status: 'CONFIRMED' | 'ATTENDED' | 'CANCELLED';
  qrCheckInToken: string;
  attendanceMarked: boolean;
}
