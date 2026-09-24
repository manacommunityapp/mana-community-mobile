import api from './apiClient';
import type { EventDto, CreateEventRequest, EventRegistrationDto } from '@/types/api';

export const eventService = {
  getUpcomingEvents: async (type?: string): Promise<EventDto[]> => {
    const params = type ? { type } : {};
    const res = await api.get<EventDto[]>('/events', { params });
    return res.data;
  },

  getAllEvents: async (): Promise<EventDto[]> => {
    const res = await api.get<EventDto[]>('/events/all');
    return res.data;
  },

  getMyEvents: async (): Promise<EventDto[]> => {
    const res = await api.get<EventDto[]>('/events/mine');
    return res.data;
  },

  getById: async (id: number): Promise<EventDto> => {
    const res = await api.get<EventDto>(`/events/${id}`);
    return res.data;
  },

  create: async (data: CreateEventRequest): Promise<EventDto> => {
    const res = await api.post<EventDto>('/events', data);
    return res.data;
  },

  update: async (id: number, data: CreateEventRequest): Promise<EventDto> => {
    const res = await api.put<EventDto>(`/events/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  register: async (id: number): Promise<EventDto> => {
    const res = await api.post<EventDto>(`/events/${id}/register`);
    return res.data;
  },

  unregister: async (id: number): Promise<EventDto> => {
    const res = await api.delete<EventDto>(`/events/${id}/register`);
    return res.data;
  },

  getRegistrations: async (id: number): Promise<EventRegistrationDto[]> => {
    const res = await api.get<EventRegistrationDto[]>(`/events/${id}/registrations`);
    return res.data;
  },
};
