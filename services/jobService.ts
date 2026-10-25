import api from './apiClient';
import type {
  JobDto, JobApplicationDto, CreateJobRequest,
  ApplyJobRequest, PageResponse,
} from '@/types/api';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };

export const jobService = {
  async getJobs(
    category?: string,
    jobType?: string,
    payType?: string,
    search?: string,
    page = 0,
  ): Promise<PageResponse<JobDto>> {
    try {
      const res = await api.get<PageResponse<JobDto>>('/jobs', {
        params: { category, jobType, payType, search, page, size: 20, status: 'OPEN' },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getJob(id: number): Promise<JobDto> {
    const res = await api.get<JobDto>(`/jobs/${id}`);
    return res.data;
  },

  async getMyPostedJobs(page = 0): Promise<PageResponse<JobDto>> {
    try {
      const res = await api.get<PageResponse<JobDto>>('/jobs/mine', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getMyApplications(page = 0): Promise<PageResponse<JobApplicationDto>> {
    try {
      const res = await api.get<PageResponse<JobApplicationDto>>('/jobs/applications/mine', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async createJob(data: CreateJobRequest): Promise<JobDto> {
    try {
      const res = await api.post<JobDto>('/jobs', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to post job. Please try again.');
    }
  },

  async updateJob(id: number, data: Partial<CreateJobRequest>): Promise<JobDto> {
    try {
      const res = await api.put<JobDto>(`/jobs/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update job.');
    }
  },

  async deleteJob(id: number): Promise<void> {
    try {
      await api.delete(`/jobs/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to delete job.');
    }
  },

  async closeJob(id: number): Promise<void> {
    try {
      await api.put(`/jobs/${id}/close`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to close job.');
    }
  },

  async markFilled(id: number): Promise<void> {
    try {
      await api.put(`/jobs/${id}/filled`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to mark job as filled.');
    }
  },

  async applyForJob(jobId: number, data: ApplyJobRequest): Promise<JobApplicationDto> {
    try {
      const res = await api.post<JobApplicationDto>(`/jobs/${jobId}/apply`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to submit application. Please try again.');
    }
  },

  async withdrawApplication(jobId: number): Promise<void> {
    try {
      await api.delete(`/jobs/${jobId}/apply`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to withdraw application.');
    }
  },

  async getApplications(jobId: number): Promise<JobApplicationDto[]> {
    try {
      const res = await api.get<JobApplicationDto[]>(`/jobs/${jobId}/applications`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async acceptApplication(jobId: number, applicationId: number): Promise<void> {
    try {
      await api.put(`/jobs/${jobId}/applications/${applicationId}/accept`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to accept application.');
    }
  },

  async rejectApplication(jobId: number, applicationId: number): Promise<void> {
    try {
      await api.put(`/jobs/${jobId}/applications/${applicationId}/reject`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to reject application.');
    }
  },
};
