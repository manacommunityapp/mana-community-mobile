import api from './apiClient';
import type {
  CreateJourneyOfferRequest,
  CreateJourneyRequest,
  JourneyDemand,
  JourneyPage,
  JourneyOffer,
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
};
