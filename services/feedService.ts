import api from './apiClient';
import type { PostDto, CommentDto, CreatePostRequest, PageResponse } from '@/types/api';
import { resolveImageUrl, resolveUserAvatar } from '@/utils/imageUrlUtils';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export function mapRawPostToDto(p: any): PostDto {
  if (!p) return p;
  const authorName = p.authorName || (p.author ? p.author.name || p.author.fullName : '') || 'Neighbor';
  const authorRole = p.authorRole || (p.author ? p.author.role : '') || (p.official ? 'MANAGEMENT' : 'RESIDENT');
  const authorFlat = p.authorFlat || (p.author ? p.author.flatNo || p.author.flatNumber : '') || p.location || '';
  const rawMediaUrls: string[] = Array.isArray(p.media)
    ? p.media.map((m: any) => m.mediaUrl || m.url).filter(Boolean)
    : Array.isArray(p.mediaUrls)
    ? p.mediaUrls
    : p.imageUrl
    ? [p.imageUrl]
    : p.image
    ? [p.image]
    : [];

  const mediaUrls: string[] = rawMediaUrls.map((u: string) => resolveImageUrl(u)).filter(Boolean);
  const rawImage = p.imageUrl || p.image || (rawMediaUrls.length > 0 ? rawMediaUrls[0] : '');
  const imageUrl = resolveImageUrl(rawImage);
  const authorPhoto = resolveUserAvatar(p);

  const resolvedPoll = p.poll
    ? {
        ...p.poll,
        options: (p.poll.options || []).map((opt: any, idx: number) => ({
          id: opt.id ?? idx + 1,
          text: opt.text || opt.label || '',
          voteCount: opt.voteCount ?? opt.votes ?? 0,
        })),
        totalVotes: p.poll.totalVotes ?? (p.poll.options || []).reduce((sum: number, o: any) => sum + (o.voteCount ?? o.votes ?? 0), 0),
      }
    : p.pollQuestion
    ? {
        options: (p.pollOptionsList || []).map((text: string, idx: number) => ({
          id: idx + 1,
          text,
          voteCount: p.pollVotes?.[text] || 0,
        })),
        totalVotes: Object.values(p.pollVotes || {}).reduce((a: number, b: any) => a + Number(b), 0),
        deadline: p.pollEndDate,
        isActive: true,
        allowMultipleVotes: false,
        isAnonymous: Boolean(p.pollAnonymous),
      }
    : undefined;

  return {
    ...p,
    id: p.id,
    authorId: p.authorId ?? (p.author?.id || 0),
    authorName,
    authorPhoto: authorPhoto || undefined,
    authorProfilePic: authorPhoto || undefined,
    authorFlat,
    authorRole,
    communityId: p.communityId || 0,
    content: p.content || p.summary || p.body || '',
    title: p.title || '',
    type: p.postType || p.type || (resolvedPoll ? 'POLL' : 'POST'),
    postType: p.postType || p.type || (resolvedPoll ? 'POLL' : 'POST'),
    mediaUrls,
    imageUrl: imageUrl || (mediaUrls.length > 0 ? mediaUrls[0] : undefined),
    likeCount: p.likesCount ?? p.likeCount ?? p.likes ?? 0,
    likesCount: p.likesCount ?? p.likeCount ?? p.likes ?? 0,
    commentCount: p.commentsCount ?? p.commentCount ?? p.comments ?? 0,
    commentsCount: p.commentsCount ?? p.commentCount ?? p.comments ?? 0,
    sharesCount: p.sharesCount ?? p.shares ?? 0,
    bookmarksCount: p.bookmarksCount ?? 0,
    liked: Boolean(p.likedByCurrentUser ?? p.liked),
    likedByCurrentUser: Boolean(p.likedByCurrentUser ?? p.liked),
    bookmarked: Boolean(p.bookmarkedByCurrentUser ?? p.bookmarked),
    official: Boolean(p.official || p.postType === 'ANNOUNCEMENT' || p.type === 'ANNOUNCEMENT' || p.badge?.toLowerCase()?.includes('official')),
    pinned: Boolean(p.pinned),
    createdAt: p.createdAt || new Date().toISOString(),
    poll: resolvedPoll,
  };
}

export const feedService = {
  async getPosts(page = 0, size = 20, type?: string): Promise<PageResponse<PostDto>> {
    const params: Record<string, any> = { page, size };
    if (type && type !== 'ALL') params.type = type;

    // Track whether ANY endpoint answered. Only a genuine empty answer may be
    // shown as an empty feed; if every request failed we must surface an error
    // instead of pretending the community has no posts (or inventing some).
    let anyEndpointResponded = false;
    let lastError: any = null;

    // 1. Try /posts/stream (lightweight stream endpoint matching web app)
    try {
      const res = await api.get<any>('/posts/stream', { params });
      anyEndpointResponded = true;
      const raw = res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped = raw.map(mapRawPostToDto);
        return { content: mapped, totalElements: mapped.length, totalPages: 1, page, number: page, size };
      }
      if (raw && Array.isArray(raw.content) && raw.content.length > 0) {
        return {
          ...raw,
          content: raw.content.map(mapRawPostToDto),
        };
      }
    } catch (err: any) {
      lastError = err;
    }

    // 2. Fallback to standard /posts
    try {
      const res = await api.get<any>('/posts', { params });
      anyEndpointResponded = true;
      const raw = res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped = raw.map(mapRawPostToDto);
        return { content: mapped, totalElements: mapped.length, totalPages: 1, page, number: page, size };
      }
      if (raw && Array.isArray(raw.content) && raw.content.length > 0) {
        return {
          ...raw,
          content: raw.content.map(mapRawPostToDto),
        };
      }
      if (raw && Array.isArray(raw.items) && raw.items.length > 0) {
        const mapped = raw.items.map(mapRawPostToDto);
        return {
          content: mapped,
          totalElements: raw.totalElements ?? mapped.length,
          totalPages: raw.totalPages ?? 1,
          page,
          number: page,
          size,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn('[feedService.getPosts] Request error:', err?.message);
    }

    if (!anyEndpointResponded) {
      const status = lastError?.response?.status;
      const msg = String(lastError?.response?.data?.message || lastError?.message || '').toLowerCase();
      if (status === 404 || (status === 400 && msg.includes('community'))) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          page,
          number: page,
          size,
        };
      }
      throw new Error(lastError?.response?.data?.message || lastError?.message || 'Unable to load the community feed. Please try again.');
    }

    // The backend answered but has no posts yet: a real, honest empty feed.
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page,
      number: page,
      size,
    };
  },

  async createPost(data: CreatePostRequest): Promise<PostDto> {
    try {
      const typeStr = (data.type || '').toString().toLowerCase();
      let normalizedType: string | undefined = undefined;
      if (typeStr === 'post' || typeStr === 'discussion' || typeStr === 'general') normalizedType = 'GENERAL';
      else if (typeStr === 'announcement' || typeStr === 'notice') normalizedType = 'ANNOUNCEMENT';
      else if (typeStr === 'poll') normalizedType = 'POLL';
      else if (typeStr === 'question') normalizedType = 'QUESTION';
      else if (typeStr === 'classified') normalizedType = 'CLASSIFIED';
      else if (typeStr === 'lost_found' || typeStr === 'lostandfound') normalizedType = 'LOST_FOUND';
      else if (typeStr === 'emergency') normalizedType = 'EMERGENCY';
      else if (data.type) normalizedType = data.type.toString().toUpperCase();

      const payload = {
        ...data,
        type: normalizedType || 'GENERAL',
      };

      const res = await api.post<PostDto>('/posts', payload);
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
        const mapped = raw.map(mapRawPostToDto);
        return { content: mapped, totalElements: mapped.length, totalPages: 1, page, number: page, size };
      }
      if (raw && Array.isArray(raw.content)) {
        return {
          ...raw,
          content: raw.content.map(mapRawPostToDto),
        };
      }
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || 'Search failed. Please try again.');
    }

    return { content: [], totalElements: 0, totalPages: 0, page, number: page, size };
  },
};
