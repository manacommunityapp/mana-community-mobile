import api from './apiClient';
import type { EventTaskResponse } from '@/types/events';

export const eventTaskService = {
  async getAll(eventId: number): Promise<EventTaskResponse[]> {
    const res = await api.get<EventTaskResponse[]>(`/events/${eventId}/tasks`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async toggleDone(taskId: number): Promise<any> {
    const res = await api.patch(`/events/tasks/${taskId}/toggle`);
    return res.data;
  },

  async create(data: { eventId: number; title: string; phase: string; priority: string; assignee?: string; assigneeName?: string }): Promise<EventTaskResponse> {
    const res = await api.post<EventTaskResponse>(`/events/${data.eventId}/tasks`, data);
    return res.data;
  },
};
