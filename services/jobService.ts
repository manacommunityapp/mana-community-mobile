import api from './apiClient';
import type {
  JobDto, JobApplicationDto, CreateJobRequest,
  ApplyJobRequest, PageResponse,
} from '@/types/api';

export const jobService = {
  // ── Browse ────────────────────────────────────────────────────
  async getJobs(
    category?: string,
    jobType?: string,
    payType?: string,
    search?: string,
    page = 0,
  ): Promise<PageResponse<JobDto>> {
    const res = await api.get<PageResponse<JobDto>>('/jobs', {
      params: { category, jobType, payType, search, page, size: 20, status: 'OPEN' },
    });
    return res.data;
  },

  async getJob(id: number): Promise<JobDto> {
    const res = await api.get<JobDto>(`/jobs/${id}`);
    return res.data;
  },

  async getMyPostedJobs(page = 0): Promise<PageResponse<JobDto>> {
    const res = await api.get<PageResponse<JobDto>>('/jobs/mine', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getMyApplications(page = 0): Promise<PageResponse<JobApplicationDto>> {
    const res = await api.get<PageResponse<JobApplicationDto>>('/jobs/applications/mine', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  // ── Create / Edit ─────────────────────────────────────────────
  async createJob(data: CreateJobRequest): Promise<JobDto> {
    const res = await api.post<JobDto>('/jobs', data);
    return res.data;
  },

  async updateJob(id: number, data: Partial<CreateJobRequest>): Promise<JobDto> {
    const res = await api.put<JobDto>(`/jobs/${id}`, data);
    return res.data;
  },

  async deleteJob(id: number): Promise<void> {
    await api.delete(`/jobs/${id}`);
  },

  async closeJob(id: number): Promise<void> {
    await api.put(`/jobs/${id}/close`);
  },

  async markFilled(id: number): Promise<void> {
    await api.put(`/jobs/${id}/filled`);
  },

  // ── Applications ──────────────────────────────────────────────
  async applyForJob(jobId: number, data: ApplyJobRequest): Promise<JobApplicationDto> {
    const res = await api.post<JobApplicationDto>(`/jobs/${jobId}/apply`, data);
    return res.data;
  },

  async withdrawApplication(jobId: number): Promise<void> {
    await api.delete(`/jobs/${jobId}/apply`);
  },

  async getApplications(jobId: number): Promise<JobApplicationDto[]> {
    const res = await api.get<JobApplicationDto[]>(`/jobs/${jobId}/applications`);
    return res.data;
  },

  async acceptApplication(jobId: number, applicationId: number): Promise<void> {
    await api.put(`/jobs/${jobId}/applications/${applicationId}/accept`);
  },

  async rejectApplication(jobId: number, applicationId: number): Promise<void> {
    await api.put(`/jobs/${jobId}/applications/${applicationId}/reject`);
  },
};
