import api from './apiClient';
import type { PostDto, CommentDto, CreatePostRequest, PageResponse } from '@/types/api';

export const feedService = {
  async getPosts(page = 0, size = 20): Promise<PageResponse<PostDto>> {
    const res = await api.get<PageResponse<PostDto>>('/posts', { params: { page, size } });
    return res.data;
  },

  async createPost(data: CreatePostRequest): Promise<PostDto> {
    const res = await api.post<PostDto>('/posts', data);
    return res.data;
  },

  async likePost(postId: number): Promise<void> {
    await api.post(`/posts/${postId}/like`);
  },

  async getComments(postId: number): Promise<CommentDto[]> {
    const res = await api.get<CommentDto[]>(`/posts/${postId}/comments`);
    return res.data;
  },

  async addComment(postId: number, content: string): Promise<CommentDto> {
    const res = await api.post<CommentDto>(`/posts/${postId}/comments`, { content });
    return res.data;
  },

  async deletePost(postId: number): Promise<void> {
    await api.delete(`/posts/${postId}`);
  },
};
