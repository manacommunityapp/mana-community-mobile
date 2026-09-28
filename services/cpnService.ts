import api from './apiClient';
import type {
  ProfessionalProfileDto,
  JobPostingDto,
  MentorshipSessionDto,
  AICareerFeedbackDto,
} from '@/types/cpn';

export const cpnService = {
  async getDirectory(domain?: string): Promise<ProfessionalProfileDto[]> {
    const res = await api.get<ProfessionalProfileDto[]>('/cpn/directory', { params: { domain } });
    return res.data;
  },

  async getJobs(): Promise<JobPostingDto[]> {
    const res = await api.get<JobPostingDto[]>('/cpn/jobs');
    return res.data;
  },

  async requestReferral(jobId: string): Promise<void> {
    await api.post(`/cpn/jobs/${jobId}/referral`);
  },

  async getMentors(): Promise<MentorshipSessionDto[]> {
    const res = await api.get<MentorshipSessionDto[]>('/cpn/mentors');
    return res.data;
  },

  async bookMentorship(mentorId: string, slot: string): Promise<void> {
    await api.post(`/cpn/mentors/${mentorId}/book`, { slot });
  },

  async getAICareerCoach(): Promise<AICareerFeedbackDto> {
    const res = await api.get<AICareerFeedbackDto>('/cpn/ai-coach');
    return res.data;
  },
};
