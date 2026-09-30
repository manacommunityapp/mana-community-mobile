import api from './apiClient';
import { secureLog } from '@/security';

export type NoticeCategory =
  | 'ALL'
  | 'GENERAL'
  | 'MAINTENANCE'
  | 'EVENT'
  | 'SECURITY'
  | 'URGENT'
  | string;

export interface NoticeDto {
  id: string;
  title: string;
  content: string;
  body?: string;
  category: 'GENERAL' | 'MAINTENANCE' | 'EVENT' | 'SECURITY' | 'URGENT' | string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT' | string;
  publishedAt: string;
  createdAt?: string;
  publisherName: string;
  authorName?: string;
  isPinned: boolean;
  pinned?: boolean;
  attachmentUrl?: string;
  expiresOn?: string;
}

function normalizeNotice(item: any): NoticeDto {
  return {
    id: String(item.id),
    title: item.title || 'Untitled Notice',
    content: item.content || item.body || '',
    body: item.body || item.content || '',
    category: (item.category || 'GENERAL').toUpperCase(),
    priority: item.priority || 'NORMAL',
    publishedAt: item.publishedAt || item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt || item.publishedAt,
    publisherName: item.publisherName || item.authorName || 'Management Office',
    authorName: item.authorName || item.publisherName || 'Management Office',
    isPinned: Boolean(item.isPinned ?? item.pinned ?? false),
    pinned: Boolean(item.pinned ?? item.isPinned ?? false),
    attachmentUrl: item.attachmentUrl,
    expiresOn: item.expiresOn,
  };
}

export const noticeService = {
  /**
   * GET /notices
   */
  async getNotices(category?: string): Promise<NoticeDto[]> {
    try {
      const res = await api.get('/notices', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(normalizeNotice);
    } catch (err) {
      secureLog.error('[noticeService] Failed to load notices', err);
      throw err;
    }
  },

  /**
   * GET /notices/{id}
   */
  async getNotice(id: string | number): Promise<NoticeDto | null> {
    try {
      const res = await api.get(`/notices/${id}`);
      if (res.data) {
        return normalizeNotice(res.data);
      }
      return null;
    } catch (err) {
      secureLog.error(`[noticeService] Failed to load notice ${id}`, err);
      throw err;
    }
  },
};
