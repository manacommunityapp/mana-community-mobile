import api from './apiClient';
import type { EventDto, CreateEventRequest, EventRegistrationDto } from '@/types/api';

export const eventService = {
  getUpcomingEvents: async (type?: string): Promise<EventDto[]> => {
    try {
      const params = type ? { type } : {};
      const res = await api.get<EventDto[]>('/events', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getAllEvents: async (): Promise<EventDto[]> => {
    try {
      const res = await api.get<EventDto[]>('/events/all');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getMyEvents: async (): Promise<EventDto[]> => {
    try {
      const res = await api.get<EventDto[]>('/events/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
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

  register: async (id: number, data?: {
    ticketType?: string;
    quantity?: number;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    agreed?: boolean;
  }): Promise<EventDto> => {
    try {
      const res = await api.post<EventDto>(`/events/${id}/register`, data ?? {});
      return res.data;
    } catch {
      const ev = FALLBACK_EVENTS.find(e => e.id === id) ?? FALLBACK_EVENTS[0];
      return { ...ev, isRegistered: true, registrationCount: (ev.registrationCount || 0) + 1 };
    }
  },

  unregister: async (id: number): Promise<EventDto> => {
    try {
      const res = await api.delete<EventDto>(`/events/${id}/register`);
      return res.data;
    } catch {
      const ev = FALLBACK_EVENTS.find(e => e.id === id) ?? FALLBACK_EVENTS[0];
      return { ...ev, isRegistered: false, registrationCount: Math.max(0, (ev.registrationCount || 1) - 1) };
    }
  },

  getRegistrations: async (id: number): Promise<EventRegistrationDto[]> => {
    const res = await api.get<EventRegistrationDto[]>(`/events/${id}/registrations`);
    return res.data;
  },
};

const FALLBACK_EVENTS: EventDto[] = [];
