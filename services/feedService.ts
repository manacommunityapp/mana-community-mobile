import api from './apiClient';
import type { PostDto, CommentDto, CreatePostRequest, PageResponse } from '@/types/api';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const feedService = {
  async getPosts(page = 0, size = 20): Promise<PageResponse<PostDto>> {
    try {
      const res = await api.get<PageResponse<PostDto>>('/posts', { params: { page, size } });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async createPost(data: CreatePostRequest): Promise<PostDto> {
    try {
      const res = await api.post<PostDto>('/posts', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create post. Please try again.');
    }
  },

  async likePost(postId: number): Promise<void> {
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      // Like failures are non-critical
    }
  },

  async getComments(postId: number): Promise<CommentDto[]> {
    try {
      const res = await api.get<CommentDto[]>(`/posts/${postId}/comments`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addComment(postId: number, content: string): Promise<CommentDto> {
    try {
      const res = await api.post<CommentDto>(`/posts/${postId}/comments`, { content });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add comment. Please try again.');
    }
  },

  async deletePost(postId: number): Promise<void> {
    try {
      await api.delete(`/posts/${postId}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to delete post.');
    }
  },
};
