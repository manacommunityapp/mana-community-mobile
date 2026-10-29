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
  acknowledgedAt?: string;
  isAcknowledged?: boolean;
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
    acknowledgedAt: item.acknowledgedAt,
    isAcknowledged: Boolean(item.isAcknowledged ?? item.acknowledgedAt ?? false),
  };
}

const FALLBACK_NOTICES: NoticeDto[] = [];

export const noticeService = {
  /**
   * GET /notices with hybrid fallback
   */
  async getNotices(category?: string): Promise<NoticeDto[]> {
    try {
      const res = await api.get('/notices', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(normalizeNotice).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    } catch (err) {
      secureLog.warn('[noticeService] Backend notices unavailable', err);
      return [];
    }
  },

  /**
   * POST /notices/{id}/acknowledge
   */
  async acknowledge(id: string | number): Promise<void> {
    try {
      await api.post(`/notices/${id}/acknowledge`);
    } catch (err) {
      secureLog.warn(`[noticeService] Acknowledge ${id} failed`, err);
    }
  },

  /**
   * GET /notices/{id} with hybrid fallback
   */
  async getNotice(id: string | number): Promise<NoticeDto | null> {
    try {
      const res = await api.get(`/notices/${id}`);
      if (res.data) {
        return normalizeNotice(res.data);
      }
    } catch {}

    try {
      const res = await api.get(`/notices/${id}`);
      if (res.data) {
        return normalizeNotice(res.data);
      }
    } catch (err) {
      secureLog.warn(`[noticeService] Notice ${id} not found on server, checking fallback`, err);
    }

    const found = FALLBACK_NOTICES.find(n => n.id === String(id));
    return found || FALLBACK_NOTICES[0];
  },
};
