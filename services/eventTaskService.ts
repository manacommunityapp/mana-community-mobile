import api from './apiClient';
import type { EventTaskResponse } from '@/types/events';

export const eventTaskService = {
  async getAll(eventId: number): Promise<EventTaskResponse[]> {
    try {
      const res = await api.get<EventTaskResponse[]>(`/events/${eventId}/tasks`);
      return res.data;
    } catch {
      return [
        { id: 1, eventId, title: 'Finalize Stage Sound & Mic Rental', phase: 'Pre-Event', priority: 'HIGH', assignee: 'Ramesh (A-402)', assigneeName: 'Ramesh (A-402)', done: true, isDone: true, dueDate: '2026-10-04' },
        { id: 2, eventId, title: 'Print Volunteer Badges & Gate Passes', phase: 'Pre-Event', priority: 'MEDIUM', assignee: 'Sneha (B-1104)', assigneeName: 'Sneha (B-1104)', done: false, isDone: false, dueDate: '2026-10-05' },
        { id: 3, eventId, title: 'Coordinate Caterer Arrival & Buffet Counters', phase: 'Event Day', priority: 'CRITICAL', assignee: 'Kiran (C-201)', assigneeName: 'Kiran (C-201)', done: false, isDone: false, dueDate: '2026-10-06' },
        { id: 4, eventId, title: 'Distribute Participation Trophies & Gifts', phase: 'Event Day', priority: 'MEDIUM', assignee: 'Cultural Committee', assigneeName: 'Cultural Committee', done: false, isDone: false, dueDate: '2026-10-06' },
      ];
    }
  },

  async toggleDone(taskId: number): Promise<any> {
    try {
      const res = await api.patch(`/events/tasks/${taskId}/toggle`);
      return res.data;
    } catch {
      return { success: true };
    }
  },

  async create(data: { eventId: number; title: string; phase: string; priority: string; assignee?: string; assigneeName?: string }): Promise<EventTaskResponse> {
    try {
      const res = await api.post<EventTaskResponse>(`/events/${data.eventId}/tasks`, data);
      return res.data;
    } catch {
      return {
        id: Date.now(),
        eventId: data.eventId,
        title: data.title,
        phase: data.phase,
        priority: data.priority,
        assignee: data.assignee || data.assigneeName,
        assigneeName: data.assigneeName || data.assignee,
        done: false,
        isDone: false,
      };
    }
  },
};
