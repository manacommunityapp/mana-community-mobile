import api from './apiClient';
import type { PostDto, CommentDto, CreatePostRequest, PageResponse } from '@/types/api';
import { resolveImageUrl, resolveUserAvatar } from '@/utils/imageUrlUtils';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const DEFAULT_COMMUNITY_POSTS: PostDto[] = [
  {
    id: 991,
    authorId: 1,
    communityId: 1,
    title: 'Scheduled Water Maintenance',
    content: 'Water supply lines in Block C will be maintained on Saturday, 6:00 AM – 10:00 AM. Please store sufficient water beforehand. We apologize for the temporary inconvenience.',
    authorName: 'Management Office',
    authorRole: 'MANAGEMENT',
    authorFlat: 'Facility Team',
    official: true,
    pinned: true,
    postType: 'ANNOUNCEMENT',
    type: 'ANNOUNCEMENT',
    likeCount: 47,
    likesCount: 47,
    commentCount: 12,
    commentsCount: 12,
    liked: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    mediaUrls: [],
  },
  {
    id: 992,
    authorId: 2,
    communityId: 1,
    title: 'Community Garden Proposal',
    content: 'Should we convert the unused eastern plot near Tower B into an organic community vegetable & flower garden for all families?',
    authorName: 'Resident Association',
    authorRole: 'RWA',
    authorFlat: 'Committee',
    official: true,
    pinned: false,
    postType: 'POLL',
    type: 'POLL',
    likeCount: 89,
    likesCount: 89,
    commentCount: 34,
    commentsCount: 34,
    liked: true,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    mediaUrls: [],
    poll: {
      options: [
        { id: 1, text: 'Yes, absolutely!', voteCount: 127 },
        { id: 2, text: 'No, keep it open lawn', voteCount: 41 },
        { id: 3, text: 'Need more information', voteCount: 19 },
      ],
      totalVotes: 187,
      isActive: true,
      allowMultipleVotes: false,
      isAnonymous: false,
    },
  },
  {
    id: 993,
    authorId: 3,
    communityId: 1,
    title: 'Terrace Sunset View 🌅',
    content: 'Just spotted this gorgeous sunset from Terrace B today! This is exactly why I love living in Mana. Who else caught the golden hour?',
    authorName: 'Priya Menon',
    authorRole: 'RESIDENT',
    authorFlat: 'Block - B 402',
    official: false,
    pinned: false,
    postType: 'POST',
    type: 'POST',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=440&fit=crop&auto=format',
    mediaUrls: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=440&fit=crop&auto=format'],
    likeCount: 62,
    likesCount: 62,
    commentCount: 18,
    commentsCount: 18,
    liked: true,
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 994,
    authorId: 4,
    communityId: 1,
    title: 'Weekend Badminton Doubles Friendly 🏸',
    content: 'Looking for 2 players for friendly doubles at Court 1 this Sunday at 7:00 AM. Intermediate level. Drop a comment if interested!',
    authorName: 'Arjun Verma',
    authorRole: 'RESIDENT',
    authorFlat: 'Block - A 1104',
    official: false,
    pinned: false,
    postType: 'POST',
    type: 'POST',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&h=440&fit=crop&auto=format',
    mediaUrls: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&h=440&fit=crop&auto=format'],
    likeCount: 28,
    likesCount: 28,
    commentCount: 9,
    commentsCount: 9,
    liked: false,
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
];

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

    // 1. Try /posts/stream (lightweight stream endpoint matching web app)
    try {
      const res = await api.get<any>('/posts/stream', { params });
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
    } catch {}

    // 2. Fallback to standard /posts
    try {
      const res = await api.get<any>('/posts', { params });
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
      console.warn('[feedService.getPosts] Request error:', err?.message);
    }

    // 3. Fallback to rich default community posts when DB has no posts yet
    const fallbackList = type && type !== 'ALL'
      ? DEFAULT_COMMUNITY_POSTS.filter((p) => {
          const pType = (p.type || p.postType || '').toUpperCase();
          if (type === 'ANNOUNCEMENT' || type === 'NOTICES') return p.official || pType === 'ANNOUNCEMENT';
          if (type === 'POLL' || type === 'POLLS') return Boolean(p.poll);
          if (type === 'POST' || type === 'COMMUNITY') return !p.official && pType !== 'ANNOUNCEMENT';
          return pType === type;
        })
      : DEFAULT_COMMUNITY_POSTS;

    return {
      content: fallbackList,
      totalElements: fallbackList.length,
      totalPages: 1,
      page,
      number: page,
      size,
    };
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
    } catch {}

    const queryLower = q.toLowerCase();
    const matched = DEFAULT_COMMUNITY_POSTS.filter(
      (p) =>
        p.title?.toLowerCase().includes(queryLower) ||
        p.content.toLowerCase().includes(queryLower) ||
        p.authorName.toLowerCase().includes(queryLower)
    );
    return {
      content: matched,
      totalElements: matched.length,
      totalPages: 1,
      page,
      number: page,
      size,
    };
  },
};
