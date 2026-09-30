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

const FALLBACK_NOTICES: NoticeDto[] = [
  {
    id: 'notice-1',
    title: 'Overhead Water Tank Deep Cleaning & Scheduled Supply Interruption',
    content: 'Dear Residents, Please note that bi-annual overhead & underground water tank deep chemical scrubbing and disinfection is scheduled for Saturday, 4th October 2026 between 10:00 AM and 04:00 PM. Water supply to all towers (A, B, C, D) will be suspended during this maintenance window. Please store adequate water in advance for essential domestic use. Drinking water tanker will be stationed near Tower C entrance for emergency supply.',
    body: 'Dear Residents, Please note that bi-annual overhead & underground water tank deep chemical scrubbing and disinfection is scheduled for Saturday, 4th October 2026 between 10:00 AM and 04:00 PM. Water supply to all towers (A, B, C, D) will be suspended during this maintenance window. Please store adequate water in advance for essential domestic use. Drinking water tanker will be stationed near Tower C entrance for emergency supply.',
    category: 'MAINTENANCE',
    priority: 'URGENT',
    publishedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    publisherName: 'Facility Management Office',
    authorName: 'Facility Management Office',
    isPinned: true,
    pinned: true,
    attachmentUrl: 'https://society.storage/circulars/water-tank-cleaning-oct2026.pdf',
    expiresOn: '2026-10-05T00:00:00Z',
  },
  {
    id: 'notice-2',
    title: 'Notice of 14th Annual General Body Meeting (AGM 2026)',
    content: 'The 14th Annual General Body Meeting (AGM) of Mana Community Co-operative Housing Society will be convened on Sunday, 18th October 2026 at 10:30 AM in the Main Clubhouse Banquet Hall. Key agenda items include: 1. Adoption of audited balance sheet FY 2025-26. 2. Approval of annual maintenance charges revision. 3. Election for 3 vacant management committee seats. 4. Solar panel installation phase 2. All owners and co-owners are requested to attend.',
    body: 'The 14th Annual General Body Meeting (AGM) of Mana Community Co-operative Housing Society will be convened on Sunday, 18th October 2026 at 10:30 AM in the Main Clubhouse Banquet Hall. Key agenda items include: 1. Adoption of audited balance sheet FY 2025-26. 2. Approval of annual maintenance charges revision. 3. Election for 3 vacant management committee seats. 4. Solar panel installation phase 2. All owners and co-owners are requested to attend.',
    category: 'GENERAL',
    priority: 'HIGH',
    publishedAt: '2026-09-29T10:00:00Z',
    createdAt: '2026-09-29T10:00:00Z',
    publisherName: 'Managing Committee & Secretary',
    authorName: 'Managing Committee & Secretary',
    isPinned: true,
    pinned: true,
    attachmentUrl: 'https://society.storage/circulars/agm-2026-agenda.pdf',
    expiresOn: '2026-10-19T00:00:00Z',
  },
  {
    id: 'notice-3',
    title: 'Updated Visitor Security Protocols & Mandatory Gate QR Verification',
    content: 'To enhance resident safety and speed up gate clearance, the society has integrated automatic license plate recognition (ANPR) and dynamic digital entry passes at Gate 1 and Gate 2. All guest, cab, and delivery entries now require pre-approved QR pass from the Mana Mobile App. Delivery agents without a passcode will be held at security gate until resident approval is confirmed.',
    body: 'To enhance resident safety and speed up gate clearance, the society has integrated automatic license plate recognition (ANPR) and dynamic digital entry passes at Gate 1 and Gate 2. All guest, cab, and delivery entries now require pre-approved QR pass from the Mana Mobile App. Delivery agents without a passcode will be held at security gate until resident approval is confirmed.',
    category: 'SECURITY',
    priority: 'NORMAL',
    publishedAt: '2026-09-27T14:30:00Z',
    createdAt: '2026-09-27T14:30:00Z',
    publisherName: 'Chief Security Officer',
    authorName: 'Chief Security Officer',
    isPinned: false,
    pinned: false,
    expiresOn: '2026-11-30T00:00:00Z',
  },
  {
    id: 'notice-4',
    title: 'Grand Diwali Community Mela & Cultural Evening 2026',
    content: 'Celebrate the Festival of Lights with fellow residents! The Mana Cultural Committee invites everyone to the Annual Grand Diwali Mela on Friday, 30th October 2026 from 6:00 PM onwards at the Central Amphitheatre & Lawns. Attractions: Live Food Stalls, Rangoli Competition, Kids Fancy Dress & Talent Hunt, Musical Evening, and Eco-Friendly Laser Light Show.',
    body: 'Celebrate the Festival of Lights with fellow residents! The Mana Cultural Committee invites everyone to the Annual Grand Diwali Mela on Friday, 30th October 2026 from 6:00 PM onwards at the Central Amphitheatre & Lawns. Attractions: Live Food Stalls, Rangoli Competition, Kids Fancy Dress & Talent Hunt, Musical Evening, and Eco-Friendly Laser Light Show.',
    category: 'EVENT',
    priority: 'NORMAL',
    publishedAt: '2026-09-25T16:00:00Z',
    createdAt: '2026-09-25T16:00:00Z',
    publisherName: 'Cultural & Sports Committee',
    authorName: 'Cultural & Sports Committee',
    isPinned: false,
    pinned: false,
    attachmentUrl: 'https://society.storage/circulars/diwali-mela-schedule-2026.pdf',
    expiresOn: '2026-11-01T00:00:00Z',
  },
  {
    id: 'notice-5',
    title: 'Mandatory Fire Evacuation Drill & Safety Equipment Demonstration',
    content: 'A full-scale fire evacuation drill and firefighting equipment training session will be conducted on Saturday, 11th October 2026 at 09:00 AM sharp in collaboration with City Fire & Emergency Services. Alarms will sound across all towers at 09:15 AM. Residents must evacuate via designated fire staircases (do not use elevators). Assembly point: Main Lawn Football Ground.',
    body: 'A full-scale fire evacuation drill and firefighting equipment training session will be conducted on Saturday, 11th October 2026 at 09:00 AM sharp in collaboration with City Fire & Emergency Services. Alarms will sound across all towers at 09:15 AM. Residents must evacuate via designated fire staircases (do not use elevators). Assembly point: Main Lawn Football Ground.',
    category: 'URGENT',
    priority: 'HIGH',
    publishedAt: '2026-09-22T09:15:00Z',
    createdAt: '2026-09-22T09:15:00Z',
    publisherName: 'Safety & Disaster Management Cell',
    authorName: 'Safety & Disaster Management Cell',
    isPinned: false,
    pinned: false,
    expiresOn: '2026-10-12T00:00:00Z',
  },
];

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
      if (list.length > 0) {
        return list.map(normalizeNotice);
      }
    } catch {}

    try {
      const res = await api.get('/api/notices', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) {
        return list.map(normalizeNotice);
      }
    } catch (err) {
      secureLog.warn('[noticeService] Backend notices unavailable, using hybrid fallback', err);
    }

    let results = FALLBACK_NOTICES;
    if (category && category !== 'ALL') {
      results = results.filter(n => n.category.toUpperCase() === category.toUpperCase());
    }

    return [...results].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
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
      const res = await api.get(`/api/notices/${id}`);
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
