import api from './apiClient';
import type {
  ProfessionalProfileDto,
  CPNPostDto,
  JobPostingDto,
  MentorshipSessionDto,
  AICareerFeedbackDto,
} from '@/types/cpn';

const FALLBACK_POSTS: CPNPostDto[] = [
  {
    id: 'post-1',
    authorName: 'Priya Sharma',
    authorHeadline: 'Senior Software Engineer @ Google Cloud',
    authorTower: 'Tower A',
    authorFlat: '304',
    timeAgo: '2h ago',
    type: 'ACHIEVEMENT',
    content: "Thrilled to share that I've accepted an offer at Google Cloud as Senior Software Engineer! Huge thanks to our Mana Professional Network and Rahul (Tower B) for the initial referral and mock interview prep.",
    hashtags: ['GoogleCloud', 'CareerGrowth', 'ManaNetwork'],
    reactionsCount: 84,
    commentsCount: 19,
    hasUserLiked: true,
  },
  {
    id: 'post-2',
    authorName: 'Vikram Rao',
    authorHeadline: 'Founder & CEO @ BuildRight SaaS',
    authorTower: 'Villa',
    authorFlat: '8',
    timeAgo: '5h ago',
    type: 'HIRING',
    content: "🔥 We're hiring! BuildRight is looking for a Lead React Native / Full Stack Engineer. Fellow residents in our society get direct priority screening. DM or apply via the Jobs tab!",
    hashtags: ['Hiring', 'ReactNative', 'TypeScript', 'RemoteJobs'],
    reactionsCount: 47,
    commentsCount: 22,
    hasUserLiked: false,
  },
  {
    id: 'post-3',
    authorName: 'Ananya Krishnan',
    authorHeadline: 'Lead AI/ML Engineer @ Infosys Labs',
    authorTower: 'Tower B',
    authorFlat: '102',
    timeAgo: 'Yesterday',
    type: 'ARTICLE',
    content: "Just published a community primer: 'How to Build & Deploy Production-Grade LLM Agent Teams in 2026'. Happy to host a coffee session at the clubhouse for interested neighbor developers!",
    hashtags: ['AI', 'LLM', 'SystemDesign', 'CommunityLearning'],
    reactionsCount: 132,
    commentsCount: 34,
    hasUserLiked: false,
  },
];

export const cpnService = {
  async getDirectory(domain?: string): Promise<ProfessionalProfileDto[]> {
    try {
      const res = await api.get<ProfessionalProfileDto[]>('/cpn/directory', { params: { domain } });
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return [
      {
        id: '1',
        name: 'Sandeep Kumar',
        headline: 'Staff Software Engineer · Distributed Systems',
        company: 'Google Cloud',
        industry: 'Technology',
        experienceYears: 8,
        tower: 'Tower B',
        flatNumber: '402',
        skills: ['Java', 'Spring Boot', 'AWS', 'Kubernetes', 'System Design'],
        isAvailableForMentorship: true,
        isHiringOrReferring: true,
        connectionsCount: 248,
        isVerified: true,
      },
      {
        id: '2',
        name: 'Pooja Ramanathan',
        headline: 'Lead Chartered Accountant · Corporate Tax & Audit',
        company: 'Ramanathan & Co.',
        industry: 'Finance & Tax',
        experienceYears: 10,
        tower: 'Villa',
        flatNumber: '14',
        skills: ['Tax Planning', 'GST', 'Startup Audits', 'NRI Investments'],
        isAvailableForMentorship: true,
        isHiringOrReferring: false,
        connectionsCount: 195,
        isVerified: true,
      },
    ];
  },

  async getMyProfile(): Promise<ProfessionalProfileDto> {
    try {
      const res = await api.get<ProfessionalProfileDto>('/cpn/profile/me');
      if (res.data) return res.data;
    } catch {}
    return {
      id: 'me',
      name: 'Resident Member',
      headline: 'Software Engineer · Cloud Infrastructure',
      company: 'Tech Corp',
      industry: 'Technology',
      experienceYears: 6,
      tower: 'Tower A',
      flatNumber: '204',
      skills: ['React Native', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
      isAvailableForMentorship: true,
      isHiringOrReferring: true,
      connectionsCount: 120,
      isVerified: true,
      isDiscoverable: true,
      showPhone: false,
      showEmail: true,
      allowDirectMessages: true,
    };
  },

  async updateProfile(payload: Partial<ProfessionalProfileDto>): Promise<ProfessionalProfileDto> {
    try {
      const res = await api.put<ProfessionalProfileDto>('/cpn/profile/me', payload);
      return res.data;
    } catch {
      return { ...(await this.getMyProfile()), ...payload };
    }
  },

  async getFeed(): Promise<CPNPostDto[]> {
    try {
      const res = await api.get<CPNPostDto[]>('/cpn/feed');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return FALLBACK_POSTS;
  },

  async toggleLikePost(postId: string): Promise<void> {
    try {
      await api.post(`/cpn/feed/${postId}/like`);
    } catch {}
  },

  async getJobs(): Promise<JobPostingDto[]> {
    try {
      const res = await api.get<JobPostingDto[]>('/cpn/jobs');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return [
      {
        id: 'job-1',
        title: 'Senior Frontend Engineer (React / TypeScript)',
        company: 'Stripe India',
        location: 'Bangalore (Hybrid)',
        jobType: 'FULL_TIME',
        salaryRange: '₹35L - ₹50L',
        experienceRequired: '4+ Years',
        postedByResident: 'Rahul Verma (Tower B - 902)',
        postedByTower: 'Tower B',
        isDirectReferral: true,
        postedDate: '1 day ago',
        description: 'Building global developer payment interfaces and developer SDKs. Looking for high-caliber TypeScript engineers.',
        skillsRequired: ['React', 'TypeScript', 'Design Systems', 'Web Performance'],
      },
      {
        id: 'job-2',
        title: 'Full Stack Engineer (Node & Next.js)',
        company: 'BuildRight SaaS',
        location: 'Remote',
        jobType: 'FULL_TIME',
        salaryRange: '₹22L - ₹32L',
        experienceRequired: '3+ Years',
        postedByResident: 'Vikram Rao (Villa 8)',
        postedByTower: 'Villa',
        isDirectReferral: true,
        postedDate: '3 days ago',
        description: 'Join our early engineering team building next-generation construction ERP software.',
        skillsRequired: ['Node.js', 'Next.js', 'PostgreSQL', 'Tailwind'],
      },
    ];
  },

  async requestReferral(jobId: string): Promise<void> {
    try {
      await api.post(`/cpn/jobs/${jobId}/referral`);
    } catch {}
  },

  async getMentors(): Promise<MentorshipSessionDto[]> {
    try {
      const res = await api.get<MentorshipSessionDto[]>('/cpn/mentors');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return [
      {
        id: 'mentor-1',
        mentorName: 'Sandeep Kumar',
        mentorHeadline: 'Staff Software Engineer @ Google',
        mentorCompany: 'Google Cloud',
        domain: 'Distributed Systems & Tech Careers',
        sessionDuration: '30 mins',
        availableSlots: ['Sat 10:30 AM', 'Sat 11:30 AM', 'Sun 04:00 PM'],
        rating: 4.9,
        totalMenteesHelped: 42,
        topics: ['System Design Architecture', 'FAANG Tech Interviewing', 'Career Navigation'],
      },
      {
        id: 'mentor-2',
        mentorName: 'Pooja Ramanathan',
        mentorHeadline: 'Chartered Accountant & Tax Consultant',
        mentorCompany: 'Ramanathan & Co.',
        domain: 'Personal Finance & Startup Tax',
        sessionDuration: '30 mins',
        availableSlots: ['Sun 11:00 AM', 'Sun 12:00 PM'],
        rating: 5.0,
        totalMenteesHelped: 38,
        topics: ['Tax Planning for Techies', 'Startup Incorporation', 'Capital Gains Strategy'],
      },
    ];
  },

  async bookMentorship(mentorId: string, slot: string): Promise<void> {
    try {
      await api.post(`/cpn/mentors/${mentorId}/book`, { slot });
    } catch {}
  },

  async getAICareerCoach(): Promise<AICareerFeedbackDto> {
    try {
      const res = await api.get<AICareerFeedbackDto>('/cpn/ai-coach');
      if (res.data) return res.data;
    } catch {}
    return {
      id: 'coach-1',
      summary: 'Your profile has high visibility in Cloud Architecture and Distributed Systems. 8 neighbors in your society currently work at Google, Amazon, and Microsoft.',
      strengths: [
        'Strong alignment with senior backend engineering requirements in Bangalore tech hubs.',
        'High community mentorship rating (4.9 / 5.0) increases inbound connection trust.',
      ],
      recommendedImprovements: [
        'Add certifications or public GitHub portfolio links to raise profile strength to 98%.',
        'State availability windows clearly to optimize mentorship calendar bookings.',
      ],
      suggestedCommunityMentors: [
        'Vikram Rao (Villa 8) · Founder & Angel Investor',
        'Dr. Anita Nair (Tower A - 304) · VP Engineering',
      ],
    };
  },
};
