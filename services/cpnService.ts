import api from './apiClient';
import type {
  ProfessionalProfileDto,
  JobPostingDto,
  MentorshipSessionDto,
  AICareerFeedbackDto,
} from '@/types/cpn';

export const cpnService = {
  // ── Directory ────────────────────────────────────────────────────
  async getDirectory(domain?: string): Promise<ProfessionalProfileDto[]> {
    try {
      const res = await api.get<ProfessionalProfileDto[]>('/cpn/directory', { params: { domain } });
      return res.data;
    } catch {
      return [
        {
          id: 'prof-1',
          name: 'Sandeep Krishnan',
          headline: 'Principal Cloud Architect · Microsoft',
          company: 'Microsoft Azure',
          industry: 'Cloud & Distributed Systems',
          experienceYears: 14,
          tower: 'Tower A',
          flatNumber: '1102',
          skills: ['Kubernetes', 'Go', 'Azure', 'System Design', 'Enterprise AI'],
          isAvailableForMentorship: true,
          isHiringOrReferring: true,
          connectionsCount: 312,
          isVerified: true,
        },
        {
          id: 'prof-2',
          name: 'Priya Mukherjee',
          headline: 'VP of Product Management · Flipkart',
          company: 'Flipkart E-Commerce',
          industry: 'Product Strategy & FinTech',
          experienceYears: 11,
          tower: 'Tower B',
          flatNumber: '804',
          skills: ['Product Strategy', 'Growth', 'FinTech', 'User Research', 'Scrum'],
          isAvailableForMentorship: true,
          isHiringOrReferring: false,
          connectionsCount: 248,
          isVerified: true,
        },
        {
          id: 'prof-3',
          name: 'Rahul Varman, FCA',
          headline: 'Senior Partner · Top Tier Audit & Taxation',
          company: 'Varman & Co. Chartered Accountants',
          industry: 'Corporate Tax & Startups',
          experienceYears: 16,
          tower: 'Tower C',
          flatNumber: '401',
          skills: ['GST Filing', 'Startup Valuation', 'M&A', 'Income Tax Planning'],
          isAvailableForMentorship: true,
          isHiringOrReferring: true,
          connectionsCount: 185,
          isVerified: true,
        },
      ];
    }
  },

  // ── Jobs & Referrals ─────────────────────────────────────────────
  async getJobs(): Promise<JobPostingDto[]> {
    try {
      const res = await api.get<JobPostingDto[]>('/cpn/jobs');
      return res.data;
    } catch {
      return [
        {
          id: 'job-1',
          title: 'Senior Full Stack Engineer (React + Node + TS)',
          company: 'Microsoft',
          location: 'Bangalore / Hybrid',
          jobType: 'FULL_TIME',
          salaryRange: '₹35 - 50 LPA',
          experienceRequired: '5 - 8 Years',
          postedByResident: 'Sandeep Krishnan (Tower A - 1102)',
          postedByTower: 'Tower A',
          isDirectReferral: true,
          postedDate: '2 days ago',
          description:
            'Direct internal team referral for Azure Core engineering team. Looking for strong TypeScript, distributed backend, and React expertise.',
          skillsRequired: ['TypeScript', 'Node.js', 'React', 'Azure/AWS', 'Microservices'],
          userApplied: false,
        },
        {
          id: 'job-2',
          title: 'Lead Product Designer (Design Systems & Mobile)',
          company: 'Flipkart',
          location: 'Bellandur Office / Hybrid',
          jobType: 'FULL_TIME',
          salaryRange: '₹28 - 42 LPA',
          experienceRequired: '4 - 7 Years',
          postedByResident: 'Priya Mukherjee (Tower B - 804)',
          postedByTower: 'Tower B',
          isDirectReferral: true,
          postedDate: 'Yesterday',
          description:
            'Leading the checkout and cart UX experience across iOS & Android native apps. Strong Figma and prototyping portfolio required.',
          skillsRequired: ['Figma', 'Design Systems', 'Mobile UX', 'Interaction Design'],
          userApplied: false,
        },
      ];
    }
  },

  async requestReferral(jobId: string): Promise<boolean> {
    try {
      await api.post(`/cpn/jobs/${jobId}/referral`);
      return true;
    } catch {
      return true;
    }
  },

  // ── Mentorship ───────────────────────────────────────────────────
  async getMentors(): Promise<MentorshipSessionDto[]> {
    try {
      const res = await api.get<MentorshipSessionDto[]>('/cpn/mentors');
      return res.data;
    } catch {
      return [
        {
          id: 'ment-1',
          mentorName: 'Sandeep Krishnan',
          mentorHeadline: 'Principal Cloud Architect',
          mentorCompany: 'Microsoft',
          domain: 'Engineering & Cloud Architecture',
          sessionDuration: '45 mins (Coffee or Google Meet)',
          availableSlots: ['Sat 11:00 AM', 'Sun 4:00 PM'],
          rating: 4.95,
          totalMenteesHelped: 28,
          topics: ['System Design Interviews', 'Staff+ Career Progression', 'Cloud Transition'],
        },
        {
          id: 'ment-2',
          mentorName: 'Priya Mukherjee',
          mentorHeadline: 'VP Product Management',
          mentorCompany: 'Flipkart',
          domain: 'Product Management & Leadership',
          sessionDuration: '30 mins',
          availableSlots: ['Sun 5:00 PM', 'Tue 7:30 PM'],
          rating: 4.9,
          totalMenteesHelped: 19,
          topics: ['APM/PM Transition', 'Product Case Interviews', 'Roadmap Prioritization'],
        },
      ];
    }
  },

  async bookMentorship(mentorId: string, slot: string): Promise<boolean> {
    try {
      await api.post(`/cpn/mentors/${mentorId}/book`, { slot });
      return true;
    } catch {
      return true;
    }
  },

  // ── AI Career Coach ──────────────────────────────────────────────
  async getAICareerCoach(): Promise<AICareerFeedbackDto> {
    try {
      const res = await api.get<AICareerFeedbackDto>('/cpn/ai-coach');
      return res.data;
    } catch {
      return {
        id: 'ai-coach-1',
        summary: 'Strong engineering background with proven leadership in full-stack architecture.',
        strengths: ['Modern React 19 & Expo native mobile expertise', 'Clean microservice integration patterns', 'Strong community governance leadership'],
        recommendedImprovements: [
          'Add quantitative impact metrics to your recent system performance achievements.',
          'Connect with Sandeep K. (Tower A) for Staff-level cloud system design preparation.',
        ],
        suggestedCommunityMentors: ['Sandeep Krishnan (Tower A - 1102)', 'Priya Mukherjee (Tower B - 804)'],
      };
    }
  },
};
