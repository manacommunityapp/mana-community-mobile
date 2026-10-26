import api from './apiClient';
import type { NotificationDto } from '@/types/api';

export const notificationService = {
  async getAll(page = 0): Promise<{ content: NotificationDto[]; unreadCount: number }> {
    try {
      const res = await api.get('/notifications', { params: { page, size: 30 } });
      if (res.data) {
        const content = Array.isArray(res.data.content)
          ? res.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
        const unreadCount = typeof res.data.unreadCount === 'number'
          ? res.data.unreadCount
          : typeof res.data.count === 'number'
            ? res.data.count
            : 0;
        return { content, unreadCount };
      }
      return { content: [], unreadCount: 0 };
    } catch {
      return { content: [], unreadCount: 0 };
    }
  },

  async markRead(notificationId: number): Promise<void> {
    try {
      await api.post('/notifications/mark-read', { notificationIds: [notificationId] });
    } catch {
      try {
        await api.put(`/notifications/${notificationId}/read`);
      } catch {}
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await api.post('/notifications/mark-all-read');
    } catch {
      try {
        await api.put('/notifications/read-all');
      } catch {}
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      // Backend exposes GET /api/notifications/count returning { unreadCount: number }
      const res = await api.get<{ unreadCount?: number; count?: number }>('/notifications/count');
      const data = res.data;
      if (typeof data === 'number') return data;
      if (data && typeof data.unreadCount === 'number') return data.unreadCount;
      if (data && typeof data.count === 'number') return data.count;
      return 0;
    } catch {
      try {
        // Fallback for alternate endpoint /notifications/unread-count
        const res2 = await api.get<{ unreadCount?: number; count?: number }>('/notifications/unread-count');
        const data2 = res2.data;
        if (typeof data2 === 'number') return data2;
        if (data2 && typeof data2.unreadCount === 'number') return data2.unreadCount;
        if (data2 && typeof data2.count === 'number') return data2.count;
        return 0;
      } catch {
        return 0;
      }
    }
  },
};

export default notificationService;
