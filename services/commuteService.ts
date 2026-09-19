import api from './apiClient';
import type {
  CommuteRideDto, CommuteBookingDto, CommuteStatsDto,
  CreateCommuteRideRequest, CreateCommuteBookingRequest,
  PageResponse, CommuteRideType,
} from '@/types/api';

export const commuteService = {
  // ── Rides ────────────────────────────────────────────────────
  async getUpcomingRides(
    rideType?: CommuteRideType,
    page = 0,
  ): Promise<PageResponse<CommuteRideDto>> {
    const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides', {
      params: { rideType, page, size: 20 },
    });
    return res.data;
  },

  async searchRides(
    destination: string,
    page = 0,
  ): Promise<PageResponse<CommuteRideDto>> {
    const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/search', {
      params: { destination, page, size: 20 },
    });
    return res.data;
  },

  async getRide(id: number): Promise<CommuteRideDto> {
    const res = await api.get<CommuteRideDto>(`/commute/rides/${id}`);
    return res.data;
  },

  async createRide(data: CreateCommuteRideRequest): Promise<CommuteRideDto> {
    const res = await api.post<CommuteRideDto>('/commute/rides', data);
    return res.data;
  },

  async updateRide(id: number, data: CreateCommuteRideRequest): Promise<CommuteRideDto> {
    const res = await api.put<CommuteRideDto>(`/commute/rides/${id}`, data);
    return res.data;
  },

  async cancelRide(id: number): Promise<void> {
    await api.delete(`/commute/rides/${id}`);
  },

  // ── My rides ─────────────────────────────────────────────────
  async getMyOffers(page = 0): Promise<PageResponse<CommuteRideDto>> {
    const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/my-offers', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getMyBookings(page = 0): Promise<PageResponse<CommuteRideDto>> {
    const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/my-bookings', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  // ── Bookings ─────────────────────────────────────────────────
  async bookRide(rideId: number, data: CreateCommuteBookingRequest): Promise<CommuteBookingDto> {
    const res = await api.post<CommuteBookingDto>(`/commute/rides/${rideId}/book`, data);
    return res.data;
  },

  async cancelBooking(rideId: number): Promise<void> {
    await api.delete(`/commute/rides/${rideId}/book`);
  },

  async confirmBooking(bookingId: number): Promise<CommuteBookingDto> {
    const res = await api.patch<CommuteBookingDto>(`/commute/bookings/${bookingId}/confirm`);
    return res.data;
  },

  async rejectBooking(bookingId: number): Promise<CommuteBookingDto> {
    const res = await api.patch<CommuteBookingDto>(`/commute/bookings/${bookingId}/reject`);
    return res.data;
  },

  // ── Stats ────────────────────────────────────────────────────
  async getStats(): Promise<CommuteStatsDto> {
    const res = await api.get<CommuteStatsDto>('/commute/stats');
    return res.data;
  },
};
