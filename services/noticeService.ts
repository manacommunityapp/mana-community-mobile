import api from './apiClient';

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

// ── In-Memory Fallback State (used when backend microservice is offline) ──
let fallbackNotices: NoticeDto[] = [
  {
    id: 'n-1',
    title: 'Water Supply Maintenance Shutdown Notice',
    content:
      'Routine overhead tank cleaning and chlorination scheduled on Sunday 10:00 AM - 2:00 PM. Water supply to all towers will be suspended during these hours. Please store adequate water beforehand.',
    category: 'MAINTENANCE',
    priority: 'HIGH',
    publishedAt: '2026-09-25T08:30:00Z',
    publisherName: 'Estate Management Office',
    isPinned: true,
  },
  {
    id: 'n-2',
    title: 'Annual General Meeting (AGM) 2026 Announcement',
    content:
      'The Annual General Body Meeting of Mana Residency Owners Association will be convened in the Main Clubhouse Banquet Hall on October 12, 2026 at 5:00 PM. Agenda includes annual financial audit presentation, election of management committee, and major capex approvals.',
    category: 'GENERAL',
    priority: 'NORMAL',
    publishedAt: '2026-09-24T14:00:00Z',
    publisherName: 'RWA Secretary',
    isPinned: true,
  },
  {
    id: 'n-3',
    title: 'Updated Visitor Security & Gate Pass Protocols',
    content:
      'All delivery partners, domestic helpers, and service technicians must use the digital QR badge for entry past 8:00 PM. Gate 2 will remain closed from 11:00 PM to 5:30 AM daily for enhanced perimeter security.',
    category: 'SECURITY',
    priority: 'NORMAL',
    publishedAt: '2026-09-22T10:15:00Z',
    publisherName: 'Chief Security Marshal',
    isPinned: false,
  },
  {
    id: 'n-4',
    title: 'Diwali Festival Grand Carnival & Cultural Evening',
    content:
      'Join us for the grand Diwali celebration in the Central Amphitheatre on Nov 1st! Food stalls, cultural dances, diya lighting ceremony, and kids talent showcase. Registrations open on the Community Events portal.',
    category: 'EVENT',
    priority: 'NORMAL',
    publishedAt: '2026-09-20T16:00:00Z',
    publisherName: 'Cultural Committee',
    isPinned: false,
  },
  {
    id: 'n-5',
    title: 'Urgent: Basement Level 2 Pest Control Spray',
    content:
      'Pest and mosquito fogging will be carried out across all basement parking bays on Friday night between 11:30 PM and 1:30 AM. Residents are advised to keep car windows fully rolled up.',
    category: 'URGENT',
    priority: 'URGENT',
    publishedAt: '2026-09-18T11:00:00Z',
    publisherName: 'Facility Operations',
    isPinned: false,
  },
];

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
   * GET /notices or /api/notices
   */
  async getNotices(category?: string): Promise<NoticeDto[]> {
    try {
      const res = await api.get('/notices', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) {
        return list.map(normalizeNotice);
      }
      return category && category !== 'ALL'
        ? fallbackNotices.filter((n) => n.category.toUpperCase() === category.toUpperCase())
        : fallbackNotices;
    } catch {
      return category && category !== 'ALL'
        ? fallbackNotices.filter((n) => n.category.toUpperCase() === category.toUpperCase())
        : fallbackNotices;
    }
  },

  /**
   * GET /notices/{id} or /api/notices/{id}
   */
  async getNotice(id: string | number): Promise<NoticeDto> {
    try {
      const res = await api.get(`/notices/${id}`);
      return normalizeNotice(res.data);
    } catch {
      const found = fallbackNotices.find((n) => String(n.id) === String(id));
      if (found) return found;
      return fallbackNotices[0];
    }
  },
};
