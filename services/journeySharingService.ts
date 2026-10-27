import api from './apiClient';
import type {
  CreateJourneyOfferRequest,
  CreateJourneyRequest,
  JourneyDemand,
  JourneyPage,
  JourneyOffer,
  JourneySlot,
  CreateJourneySlotRequest,
  JourneyMatchProposal,
  JourneyBooking,
  JourneySearchRequest,
  JourneyTypeConfig,
} from '@/types/journeySharing';

export const journeySharingService = {
  async getConfigs(): Promise<JourneyTypeConfig[]> {
    const res = await api.get<JourneyTypeConfig[]>('/mobility/journeys/config');
    return res.data ?? [];
  },

  async search(req: JourneySearchRequest): Promise<JourneyPage<JourneyOffer>> {
    const res = await api.get<JourneyPage<JourneyOffer>>('/mobility/journeys/search', {
      params: { ...req, page: req.page ?? 0, size: req.size ?? 20 },
    });
    return res.data;
  },

  async createOffer(req: CreateJourneyOfferRequest): Promise<JourneyOffer> {
    const res = await api.post<JourneyOffer>('/mobility/journeys/offers', req);
    return res.data;
  },

  async join(id: number, seats = 1): Promise<void> {
    await api.post(`/mobility/journeys/offers/${id}/join`, { seats });
  },

  async createRequest(req: CreateJourneyRequest): Promise<JourneyDemand> {
    const res = await api.post<JourneyDemand>('/mobility/journeys/requests', req);
    return res.data;
  },

  async getMyRequests(page = 0): Promise<JourneyPage<JourneyDemand>> {
    const res = await api.get<JourneyPage<JourneyDemand>>('/mobility/journeys/requests/mine', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getRequestMatches(requestId: number, page = 0): Promise<JourneyPage<JourneyOffer>> {
    const res = await api.get<JourneyPage<JourneyOffer>>(`/mobility/journeys/requests/${requestId}/matches`, {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async leave(id: number): Promise<void> {
    await api.post(`/mobility/journeys/offers/${id}/leave`);
  },

  async waitlist(id: number, seats = 1): Promise<void> {
    await api.post(`/mobility/journeys/offers/${id}/waitlist`, { seats });
  },

  async getSlots(journeyType?: string, hubCode?: string): Promise<JourneySlot[]> {
    const res = await api.get<JourneySlot[]>('/mobility/journeys/slots', { params: { journeyType, hubCode } });
    return res.data ?? [];
  },

  async createSlot(req: CreateJourneySlotRequest): Promise<JourneySlot> {
    const res = await api.post<JourneySlot>('/mobility/journeys/slots', req);
    return res.data;
  },

  async updateSlotStatus(id: number, status: 'ACTIVE' | 'PAUSED'): Promise<JourneySlot> {
    const res = await api.patch<JourneySlot>(`/mobility/journeys/slots/${id}/status`, { status });
    return res.data;
  },

  async getProposals(page = 0): Promise<JourneyPage<JourneyMatchProposal>> {
    const res = await api.get<JourneyPage<JourneyMatchProposal>>('/mobility/journeys/proposals', { params: { page, size: 20 } });
    return res.data;
  },

  async respondToProposal(id: number, accept: boolean): Promise<void> {
    await api.post(`/mobility/journeys/proposals/${id}/respond`, { accept });
  },

  async getMyBookings(page = 0): Promise<JourneyPage<JourneyBooking>> {
    const res = await api.get<JourneyPage<JourneyBooking>>('/mobility/journeys/bookings/mine', { params: { page, size: 20 } });
    return res.data;
  },

  async cancelOffer(id: number): Promise<void> {
    await api.post(`/mobility/journeys/offers/${id}/cancel`);
  },

  async cancelRequest(id: number): Promise<void> {
    await api.post(`/mobility/journeys/requests/${id}/cancel`);
  },
};
