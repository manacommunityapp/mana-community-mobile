import api from './apiClient';
import type { EventVolunteerResponse } from '@/types/events';

export const eventVolunteerService = {
  async getAll(eventId: number): Promise<EventVolunteerResponse[]> {
    const res = await api.get<EventVolunteerResponse[]>(`/events/${eventId}/volunteers`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async create(data: { eventId: number; userId: number; role: string; shift: string; zone?: string }): Promise<EventVolunteerResponse> {
    const res = await api.post<EventVolunteerResponse>(`/events/${data.eventId}/volunteers`, data);
    return res.data;
  },

  async checkIn(volunteerId: number): Promise<any> {
    const res = await api.post(`/events/volunteers/${volunteerId}/check-in`);
    return res.data;
  },
};
