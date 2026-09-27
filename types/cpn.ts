export interface ProfessionalProfileDto {
  id: string;
  name: string;
  headline: string;
  company: string;
  industry: string;
  experienceYears: number;
  tower: string;
  flatNumber: string;
  skills: string[];
  isAvailableForMentorship: boolean;
  isHiringOrReferring: boolean;
  connectionsCount: number;
  isVerified: boolean;
  avatarUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface JobPostingDto {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: 'FULL_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';
  salaryRange: string;
  experienceRequired: string;
  postedByResident: string;
  postedByTower: string;
  isDirectReferral: boolean;
  postedDate: string;
  description: string;
  skillsRequired: string[];
  userApplied?: boolean;
}

export interface MentorshipSessionDto {
  id: string;
  mentorName: string;
  mentorHeadline: string;
  mentorCompany: string;
  domain: string;
  sessionDuration: string;
  availableSlots: string[];
  rating: number;
  totalMenteesHelped: number;
  topics: string[];
}

export interface AICareerFeedbackDto {
  id: string;
  summary: string;
  strengths: string[];
  recommendedImprovements: string[];
  suggestedCommunityMentors: string[];
}
