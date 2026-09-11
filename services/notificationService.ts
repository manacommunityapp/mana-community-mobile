import api from './apiClient';
import type { NotificationDto } from '@/types/api';

export const notificationService = {
  async getAll(page = 0): Promise<{ content: NotificationDto[]; unreadCount: number }> {
    const res = await api.get('/notifications', { params: { page, size: 30 } });
    return res.data;
  },

  async markRead(notificationId: number): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    return res.data.count;
  },
};
