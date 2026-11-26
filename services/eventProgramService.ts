import api from './apiClient';
import type { EventProgramResponse, EventMealPreferenceResponse } from '@/types/events';

export const eventProgramService = {
  async getByEvent(eventId: number): Promise<EventProgramResponse[]> {
    const res = await api.get<EventProgramResponse[]>(`/events/${eventId}/programs`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async registerActivity(programId: number, data: { headCount: number; primaryName?: string }): Promise<any> {
    const res = await api.post(`/events/programs/${programId}/register`, data);
    return res.data;
  },

  async getUserMeals(eventId: number): Promise<EventMealPreferenceResponse> {
    const res = await api.get<EventMealPreferenceResponse>(`/events/${eventId}/meals/my-preference`);
    return res.data;
  },
  async saveMeals(eventId: number, data: Partial<EventMealPreferenceResponse>): Promise<any> {
    const res = await api.post(`/events/${eventId}/meals/preference`, data);
    return res.data;
  },

  async saveUserMeals(eventId: number, data: Partial<EventMealPreferenceResponse>): Promise<any> {
    return this.saveMeals(eventId, data);
  },
};
