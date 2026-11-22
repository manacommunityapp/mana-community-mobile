import api from './apiClient';
import type { PostDto, CommentDto, CreatePostRequest, PageResponse } from '@/types/api';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const feedService = {
  async getPosts(page = 0, size = 20, type?: string): Promise<PageResponse<PostDto>> {
    try {
      const params: Record<string, any> = { page, size };
      if (type && type !== 'ALL') params.type = type;
      const res = await api.get<any>('/posts', { params });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { content: raw, totalElements: raw.length, totalPages: 1, page, number: page, size };
      }
      if (raw && Array.isArray(raw.content)) {
        return raw;
      }
      if (raw && Array.isArray(raw.items)) {
        return {
          content: raw.items,
          totalElements: raw.totalElements ?? raw.items.length,
          totalPages: raw.totalPages ?? 1,
          page,
          number: page,
          size,
        };
      }
      return EMPTY_PAGE;
    } catch (err: any) {
      console.warn('[feedService.getPosts] /posts request error, trying /posts/stream:', err?.message);
      try {
        const streamRes = await api.get<any>('/posts/stream', { params: { page, size } });
        const raw = streamRes.data;
        if (Array.isArray(raw)) {
          return { content: raw, totalElements: raw.length, totalPages: 1, page, number: page, size };
        }
        if (raw && Array.isArray(raw.content)) {
          return raw;
        }
      } catch {}
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

  async toggleBookmark(postId: number): Promise<void> {
    try {
      await api.post(`/posts/${postId}/bookmark`);
    } catch {
      // Non-critical
    }
  },

  async toggleCommentLike(commentId: number): Promise<void> {
    try {
      await api.post(`/posts/comments/${commentId}/like`);
    } catch {
      // Non-critical
    }
  },

  async reactToPost(postId: number, reactionType: string): Promise<void> {
    try {
      await api.post(`/posts/${postId}/react`, { reactionType });
    } catch {
      // Non-critical
    }
  },

  async searchPosts(q: string, page = 0, size = 20): Promise<PageResponse<PostDto>> {
    try {
      const res = await api.get<any>('/posts/search', { params: { q, page, size } });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { content: raw, totalElements: raw.length, totalPages: 1, page, number: page, size };
      }
      if (raw && Array.isArray(raw.content)) {
        return raw;
      }
      return EMPTY_PAGE;
    } catch {
      return EMPTY_PAGE;
    }
  },
};
