import api from './apiClient';
import type { PostDto, CreatePollRequest, PageResponse } from '@/types/api';

export const pollService = {
  // ── Browse ─────────────────────────────────────────────────────
  async getPolls(
    status: 'ACTIVE' | 'CLOSED' | 'ALL' = 'ALL',
    page = 0,
  ): Promise<PageResponse<PostDto>> {
    const res = await api.get<PageResponse<PostDto>>('/polls', {
      params: { status, page, size: 20 },
    });
    return res.data;
  },

  async getMyPolls(page = 0): Promise<PageResponse<PostDto>> {
    const res = await api.get<PageResponse<PostDto>>('/polls/mine', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getPoll(postId: number): Promise<PostDto> {
    const res = await api.get<PostDto>(`/polls/${postId}`);
    return res.data;
  },

  // ── Create ─────────────────────────────────────────────────────
  async createPoll(data: CreatePollRequest): Promise<PostDto> {
    const res = await api.post<PostDto>('/polls', data);
    return res.data;
  },

  // ── Vote ───────────────────────────────────────────────────────
  async vote(postId: number, optionIds: number[]): Promise<PostDto> {
    const res = await api.post<PostDto>(`/polls/${postId}/vote`, { optionIds });
    return res.data;
  },

  async retractVote(postId: number): Promise<PostDto> {
    const res = await api.delete<PostDto>(`/polls/${postId}/vote`);
    return res.data;
  },

  // ── Manage ─────────────────────────────────────────────────────
  async closePoll(postId: number): Promise<PostDto> {
    const res = await api.put<PostDto>(`/polls/${postId}/close`);
    return res.data;
  },

  async deletePoll(postId: number): Promise<void> {
    await api.delete(`/polls/${postId}`);
  },
};
