import api from './apiClient';
import type { EventSponsorResponse } from '@/types/events';

export const eventSponsorService = {
  async getAll(eventId: number): Promise<EventSponsorResponse[]> {
    try {
      const res = await api.get<EventSponsorResponse[]>(`/events/${eventId}/sponsors`);
      return res.data;
    } catch {
      return [
        { id: 1, eventId, name: 'HDFC Bank Home Loans', tier: 'TITLE', contributionAmount: 50000, contactEmail: 'homeloans@hdfcbank.com', description: 'Exclusive banking & loan partner for the grand festival.' },
        { id: 2, eventId, name: 'Tata Starbucks Community Brew', tier: 'PLATINUM', contributionAmount: 25000, contactEmail: 'community@tatastarbucks.com', description: 'Beverage partner providing hot refreshments.' },
        { id: 3, eventId, name: 'Apollo Pharmacy & Wellness', tier: 'GOLD', contributionAmount: 15000, contactEmail: 'events@apollopharmacy.org', description: 'First-aid station and wellness kits sponsor.' },
        { id: 4, eventId, name: 'Cult.Fit Gyms & Fitness', tier: 'SILVER', contributionAmount: 10000, contactEmail: 'partnerships@cultfit.com', description: 'Fitness vouchers and sports kits partner.' },
      ];
    }
  },
};
