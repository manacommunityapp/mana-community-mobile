import api from './apiClient';
import type { CashfreeOrderResponse } from './paymentService';
import type {
  CreateMarketEventRequest,
  CreateMarketStallRequest,
  MarketApplicationDto,
  MarketApplicationRequest,
  MarketEventDto,
  MarketEventFilters,
  MarketStallDto,
} from '@/types/marketBazaar';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as any).content)) {
    return (data as any).content as T[];
  }
  return [];
}

/** Market stall booking API. These routes follow the proposed Bazaar API contract. */
export const marketBazaarService = {
  async getEvents(filters: MarketEventFilters = {}): Promise<MarketEventDto[]> {
    const { data } = await api.get('/market/events', {
      params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')),
    });
    return unwrapList<MarketEventDto>(data);
  },

  async getOrganizerEvents(): Promise<MarketEventDto[]> {
    const { data } = await api.get('/market/organizer/events');
    return unwrapList<MarketEventDto>(data);
  },

  async getStalls(eventId: number | string): Promise<MarketStallDto[]> {
    const { data } = await api.get(`/market/events/${eventId}/stalls`);
    return unwrapList<MarketStallDto>(data);
  },

  async createStall(eventId: number | string, request: CreateMarketStallRequest): Promise<MarketStallDto> {
    const { data } = await api.post<MarketStallDto>(`/market/events/${eventId}/stalls`, request);
    return data;
  },

  async applyForStall(eventId: number | string, request: MarketApplicationRequest): Promise<MarketApplicationDto> {
    const { data } = await api.post<MarketApplicationDto>(`/market/events/${eventId}/applications`, request);
    return data;
  },

  async getMyApplications(): Promise<MarketApplicationDto[]> {
    const { data } = await api.get('/market/vendors/me/bookings');
    return unwrapList<MarketApplicationDto>(data);
  },

  async checkoutBooking(bookingId: number | string): Promise<CashfreeOrderResponse> {
    const { data } = await api.post(`/market/bookings/${bookingId}/checkout`, {});
    const order = (data as any)?.order ?? data;
    if (!order?.manaOrderId || !order?.paymentSessionId || !order?.appId) {
      throw new Error('The server did not return a usable payment session. Please try again later.');
    }
    return order as CashfreeOrderResponse;
  },

  async createEvent(request: CreateMarketEventRequest): Promise<MarketEventDto> {
    const { data } = await api.post<MarketEventDto>('/market/events', request);
    return data;
  },

  async getOrganizerApplications(eventId: number | string): Promise<MarketApplicationDto[]> {
    const { data } = await api.get(`/market/events/${eventId}/applications`);
    return unwrapList<MarketApplicationDto>(data);
  },

  async approveApplication(applicationId: number | string, stallId: number | string): Promise<MarketApplicationDto> {
    const { data } = await api.post<MarketApplicationDto>(`/market/applications/${applicationId}/approve`, { stallId });
    return data;
  },

  async rejectApplication(applicationId: number | string, reason: string): Promise<MarketApplicationDto> {
    const { data } = await api.post<MarketApplicationDto>(`/market/applications/${applicationId}/reject`, { reason });
    return data;
  },
};
