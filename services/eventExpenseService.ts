import api from './apiClient';
import type { EventExpenseResponse } from '@/types/events';

export const eventExpenseService = {
  async getAll(eventId: number): Promise<EventExpenseResponse[]> {
    try {
      const res = await api.get<EventExpenseResponse[]>(`/events/${eventId}/expenses`);
      return res.data;
    } catch {
      return [
        { id: 1, eventId, category: 'Venue & Stage', description: 'Stage construction, backdrop flex and carpeting', amount: 18500, vendorName: 'Shree Sai Decorators', paidBy: 'RWA Account', createdAt: '2026-10-01T11:00:00Z' },
        { id: 2, eventId, category: 'Sound & Lights', description: 'Dual Line Array speakers, LED PAR lights & cordless mics', amount: 14000, vendorName: 'Groove Beats Audio', paidBy: 'Ramesh Patel', createdAt: '2026-10-02T16:20:00Z' },
        { id: 3, eventId, category: 'Catering / Food', description: 'Advance payment for traditional lunch buffet (250 pax)', amount: 35000, vendorName: 'Annapurna Caterers', paidBy: 'RWA Account', createdAt: '2026-10-03T10:00:00Z' },
        { id: 4, eventId, category: 'Prizes & Trophies', description: '30 custom engraved trophies for dance & music participants', amount: 6200, vendorName: 'Champion Trophies', paidBy: 'Cultural Committee', createdAt: '2026-10-03T17:30:00Z' },
      ];
    }
  },

  async create(data: { eventId: number; description: string; amount: number; category: string; vendorName?: string }): Promise<EventExpenseResponse> {
    try {
      const res = await api.post<EventExpenseResponse>(`/events/${data.eventId}/expenses`, data);
      return res.data;
    } catch {
      return {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };
    }
  },
};
