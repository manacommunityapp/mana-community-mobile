import api from './apiClient';

export interface ForumPostDto {
  id: number;
  title: string;
  category?: string;
  authorId: number;
  authorName: string;
  commentCount: number;
  likeCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isOwn: boolean;
  createdAt?: string;
  updatedAt?: string;
  preview?: string;
  content?: string;
  comments?: ForumCommentDto[];
}

export interface ForumCommentDto {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  likeCount: number;
  isOwn: boolean;
  createdAt?: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  category?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

const MOCK_POSTS: ForumPostDto[] = [
  {
    id: 1, title: 'Water supply issue in Tower B — morning timings',
    category: 'MAINTENANCE', authorId: 1, authorName: 'Rajesh Sharma',
    commentCount: 12, likeCount: 8, isPinned: false, isClosed: false, isOwn: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    preview: 'The water supply in Tower B has been erratic between 6–8 AM. Has anyone else noticed this? The maintenance team says they are working on it but it has been 3 days now.',
  },
  {
    id: 2, title: 'Society AGM — Agenda and Voting Results',
    category: 'ANNOUNCEMENT', authorId: 2, authorName: 'Management Committee',
    commentCount: 5, likeCount: 24, isPinned: true, isClosed: false, isOwn: false,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    preview: 'The Annual General Meeting was held on Sunday. Key decisions: 15% maintenance increase from Jan, new CCTV in parking, playground renovation approved.',
  },
  {
    id: 3, title: 'Looking for a reliable cook — 2BHK Tower A',
    category: 'CLASSIFIEDS', authorId: 3, authorName: 'Meena Iyer',
    commentCount: 3, likeCount: 1, isPinned: false, isClosed: false, isOwn: false,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    preview: 'Need a morning cook for 2 people, South Indian / North Indian both fine. Timing: 7–9 AM. Please WhatsApp me if you have a reference.',
  },
  {
    id: 4, title: 'Diwali decoration competition — Register by Nov 1st',
    category: 'EVENTS', authorId: 4, authorName: 'Cultural Committee',
    commentCount: 18, likeCount: 45, isPinned: false, isClosed: false, isOwn: false,
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    preview: 'Annual Diwali decoration contest for all flats and common areas. Best decorated flat wins ₹5000 Amazon voucher. Registration deadline: Nov 1st.',
  },
  {
    id: 5, title: 'Parking slot permanently occupied by unknown vehicle',
    category: 'COMPLAINT', authorId: 5, authorName: 'Arjun Mehta',
    commentCount: 7, likeCount: 3, isPinned: false, isClosed: false, isOwn: false,
    createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    preview: 'MH-02-AB-1234 has been parked in my slot for 4 days. I have complained to security but no action. Who does this car belong to?',
  },
];

export const FORUM_CATEGORIES = [
  { code: 'ALL',          label: 'All Posts',     icon: 'grid-outline' as const,          color: '#6366F1' },
  { code: 'ANNOUNCEMENT', label: 'Announcements', icon: 'megaphone-outline' as const,     color: '#7C3AED' },
  { code: 'MAINTENANCE',  label: 'Maintenance',   icon: 'construct-outline' as const,     color: '#D97706' },
  { code: 'EVENTS',       label: 'Events',        icon: 'calendar-outline' as const,      color: '#059669' },
  { code: 'CLASSIFIEDS',  label: 'Classifieds',   icon: 'pricetag-outline' as const,      color: '#2563EB' },
  { code: 'COMPLAINT',    label: 'Complaints',    icon: 'warning-outline' as const,       color: '#DC2626' },
  { code: 'DISCUSSION',   label: 'Discussion',    icon: 'chatbubbles-outline' as const,   color: '#0891B2' },
];

export const forumService = {
  async getPosts(params?: { category?: string; search?: string; page?: number }): Promise<PageResponse<ForumPostDto>> {
    try {
      const res = await api.get<PageResponse<ForumPostDto>>('/forum/posts', { params });
      if (res.data?.content && res.data.content.length > 0) return res.data;
    } catch {}
    let filtered = MOCK_POSTS;
    if (params?.category && params.category !== 'ALL') {
      filtered = filtered.filter(p => p.category === params.category);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.preview?.toLowerCase().includes(q));
    }
    return { content: filtered, totalPages: 1, totalElements: filtered.length, number: 0, size: 20 };
  },

  async getPost(id: number): Promise<ForumPostDto | null> {
    try {
      const res = await api.get<ForumPostDto>(`/forum/posts/${id}`);
      return res.data;
    } catch {
      return MOCK_POSTS.find(p => p.id === id) ?? null;
    }
  },

  async createPost(data: CreatePostRequest): Promise<ForumPostDto> {
    try {
      const res = await api.post<ForumPostDto>('/forum/posts', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create post. Please try again.');
    }
  },

  async deletePost(id: number): Promise<void> {
    await api.delete(`/forum/posts/${id}`);
  },

  async getComments(postId: number): Promise<ForumCommentDto[]> {
    try {
      const res = await api.get<ForumCommentDto[]>(`/forum/posts/${postId}/comments`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addComment(postId: number, content: string): Promise<ForumCommentDto> {
    try {
      const res = await api.post<ForumCommentDto>(`/forum/posts/${postId}/comments`, { content });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to post comment.');
    }
  },

  async deleteComment(id: number): Promise<void> {
    await api.delete(`/forum/comments/${id}`);
  },
};
