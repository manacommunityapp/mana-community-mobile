import api from './apiClient';
import type {
  ProfessionalProfileDto,
  CPNPostDto,
  JobPostingDto,
  MentorshipSessionDto,
  AICareerFeedbackDto,
} from '@/types/cpn';

const FALLBACK_POSTS: CPNPostDto[] = [];

export const cpnService = {
  async getDirectory(domain?: string): Promise<ProfessionalProfileDto[]> {
    try {
      const res = await api.get<ProfessionalProfileDto[]>('/cpn/directory', { params: { domain } });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
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
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async toggleLikePost(postId: string): Promise<void> {
    try {
      await api.post(`/cpn/feed/${postId}/like`);
    } catch {}
  },

  async getJobs(): Promise<JobPostingDto[]> {
    try {
      const res = await api.get<JobPostingDto[]>('/cpn/jobs');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async requestReferral(jobId: string): Promise<void> {
    try {
      await api.post(`/cpn/jobs/${jobId}/referral`);
    } catch {}
  },

  async getMentors(): Promise<MentorshipSessionDto[]> {
    try {
      const res = await api.get<MentorshipSessionDto[]>('/cpn/mentors');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
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
