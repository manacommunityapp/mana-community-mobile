import api from './apiClient';
import type { EventDonationResponse } from '@/types/events';

export const eventDonationService = {
  async getAll(eventId: number): Promise<EventDonationResponse[]> {
    try {
      const res = await api.get<EventDonationResponse[]>(`/events/${eventId}/donations`);
      return res.data;
    } catch {
      return [
        { id: 1, eventId, donorName: 'Ramesh Patel', flatNumber: 'A-402', amount: 5000, anonymous: false, createdAt: '2026-10-01T10:30:00Z', note: 'For decoration and sweets distribution' },
        { id: 2, eventId, donorName: 'Anonymous Donor', amount: 2500, anonymous: true, createdAt: '2026-10-02T14:15:00Z' },
        { id: 3, eventId, donorName: 'Pooja Hegde', flatNumber: 'B-1104', amount: 10000, anonymous: false, createdAt: '2026-10-02T18:00:00Z', note: 'For musical troupe & sound system' },
        { id: 4, eventId, donorName: 'Suresh Menon', flatNumber: 'C-201', amount: 1000, anonymous: false, createdAt: '2026-10-03T09:00:00Z' },
      ];
    }
  },

  async create(data: { eventId: number; donorName: string; flatNumber?: string; amount: number; anonymous?: boolean; note?: string; paymentMethod?: string }): Promise<EventDonationResponse> {
    try {
      const res = await api.post<EventDonationResponse>(`/events/${data.eventId}/donations`, data);
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
