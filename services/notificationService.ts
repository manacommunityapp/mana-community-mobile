import api from './apiClient';
import type { NotificationDto } from '@/types/api';

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type NotificationCategory =
  | 'SAFETY'
  | 'FINANCE'
  | 'COMMUNITY'
  | 'SPORTS'
  | 'FOOD'
  | 'VISITORS'
  | 'HELPDESK'
  | 'EVENTS'
  | 'OTHER';

export interface NotificationPreferences {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  categorySettings: Record<NotificationCategory, { push: boolean; inApp: boolean }>;
}

export interface NotificationPage {
  content: NotificationDto[];
  totalElements: number;
  totalPages: number;
  number: number;
}

const DEFAULT_PREFS: NotificationPreferences = {
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  dailyDigestEnabled: false,
  dailyDigestTime: '08:00',
  categorySettings: {
    SAFETY:    { push: true,  inApp: true },
    FINANCE:   { push: true,  inApp: true },
    COMMUNITY: { push: true,  inApp: true },
    SPORTS:    { push: true,  inApp: true },
    FOOD:      { push: true,  inApp: true },
    VISITORS:  { push: true,  inApp: true },
    HELPDESK:  { push: true,  inApp: true },
    EVENTS:    { push: true,  inApp: true },
    OTHER:     { push: false, inApp: true },
  },
};

export function inferPriority(type: string): NotificationPriority {
  const t = type?.toUpperCase() ?? '';
  if (t.includes('SAFETY') || t.includes('EMERGENCY') || t.includes('SOS') || t.includes('FIRE') || t.includes('MEDICAL'))
    return 'CRITICAL';
  if (t.includes('PAYMENT') || t.includes('FINANCE') || t.includes('INVOICE') || t.includes('OVERDUE') || t.includes('SECURITY'))
    return 'HIGH';
  if (t.includes('BOOKING') || t.includes('VISITOR') || t.includes('HELPDESK') || t.includes('EVENT') || t.includes('SPORTS'))
    return 'MEDIUM';
  return 'LOW';
}

export function inferCategory(type: string): NotificationCategory {
  const t = type?.toUpperCase() ?? '';
  if (t.includes('SAFETY') || t.includes('EMERGENCY') || t.includes('SOS')) return 'SAFETY';
  if (t.includes('PAYMENT') || t.includes('FINANCE') || t.includes('INVOICE') || t.includes('BILLING')) return 'FINANCE';
  if (t.includes('SPORTS') || t.includes('TOURNAMENT') || t.includes('MATCH')) return 'SPORTS';
  if (t.includes('FOOD') || t.includes('ORDER') || t.includes('DELIVERY')) return 'FOOD';
  if (t.includes('VISITOR') || t.includes('GATE') || t.includes('ENTRY')) return 'VISITORS';
  if (t.includes('HELPDESK') || t.includes('TICKET') || t.includes('WORK_ORDER')) return 'HELPDESK';
  if (t.includes('EVENT') || t.includes('COMMUNITY') || t.includes('POST') || t.includes('MESSAGE')) return 'COMMUNITY';
  if (t.includes('AUCTION') || t.includes('MARKETPLACE') || t.includes('SERVICE')) return 'OTHER';
  return 'OTHER';
}

export const notificationService = {
  async getAll(page = 0): Promise<NotificationPage> {
    try {
      const res = await api.get<NotificationPage>('/notifications', { params: { page, size: 50 } });
      return res.data;
    } catch {
      return { content: [], totalElements: 0, totalPages: 0, number: 0 };
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      return res.data?.count ?? 0;
    } catch {
      return 0;
    }
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all', {});
  },

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const res = await api.get<NotificationPreferences>('/notifications/preferences');
      return { ...DEFAULT_PREFS, ...res.data };
    } catch {
      return DEFAULT_PREFS;
    }
  },

  async savePreferences(prefs: NotificationPreferences): Promise<void> {
    await api.put('/notifications/preferences', prefs);
  },
};
