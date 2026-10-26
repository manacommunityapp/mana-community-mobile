import api from './apiClient';
import type { PostDto, CreatePollRequest, PageResponse } from '@/types/api';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const pollService = {
  async getPolls(
    status: 'ACTIVE' | 'CLOSED' | 'ALL' = 'ALL',
    page = 0,
  ): Promise<PageResponse<PostDto>> {
    try {
      const res = await api.get<PageResponse<PostDto>>('/polls', {
        params: { status, page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getMyPolls(page = 0): Promise<PageResponse<PostDto>> {
    try {
      const res = await api.get<PageResponse<PostDto>>('/polls/mine', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getPoll(postId: number): Promise<PostDto> {
    const res = await api.get<PostDto>(`/polls/${postId}`);
    return res.data;
  },

  async createPoll(data: CreatePollRequest): Promise<PostDto> {
    try {
      const res = await api.post<PostDto>('/polls', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create poll. Please try again.');
    }
  },

  async vote(postId: number, optionIds: number[]): Promise<PostDto> {
    try {
      const res = await api.post<PostDto>(`/polls/${postId}/vote`, { optionIds });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to record vote. Please try again.');
    }
  },

  async retractVote(postId: number): Promise<PostDto> {
    try {
      const res = await api.delete<PostDto>(`/polls/${postId}/vote`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to retract vote.');
    }
  },

  async closePoll(postId: number): Promise<PostDto> {
    try {
      const res = await api.put<PostDto>(`/polls/${postId}/close`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to close poll.');
    }
  },

  async deletePoll(postId: number): Promise<void> {
    try {
      await api.delete(`/polls/${postId}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to delete poll.');
    }
  },
};
