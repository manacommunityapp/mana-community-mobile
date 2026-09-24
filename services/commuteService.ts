import api from './apiClient';
import type {
  CommuteRideDto, CommuteBookingDto, CommuteStatsDto,
  CreateCommuteRideRequest, CreateCommuteBookingRequest,
  CommuteRatingDto, CreateCommuteRatingRequest,
  CommuteVehicleDto, CreateCommuteVehicleRequest,
  CommuteFavouriteRouteDto, CreateCommuteFavouriteRouteRequest,
  CommuteUserProfileDto,
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

  // ── Ratings ──────────────────────────────────────────────────
  async rateRide(rideId: number, data: CreateCommuteRatingRequest): Promise<CommuteRatingDto> {
    const res = await api.post<CommuteRatingDto>(`/commute/rides/${rideId}/rate`, data);
    return res.data;
  },

  async getRideRatings(rideId: number): Promise<CommuteRatingDto[]> {
    const res = await api.get<CommuteRatingDto[]>(`/commute/rides/${rideId}/ratings`);
    return res.data;
  },

  async getUserProfile(userId: number): Promise<CommuteUserProfileDto> {
    const res = await api.get<CommuteUserProfileDto>(`/commute/users/${userId}/profile`);
    return res.data;
  },

  // ── Vehicles ─────────────────────────────────────────────────
  async getMyVehicles(): Promise<CommuteVehicleDto[]> {
    const res = await api.get<CommuteVehicleDto[]>('/commute/vehicles');
    return res.data;
  },

  async addVehicle(data: CreateCommuteVehicleRequest): Promise<CommuteVehicleDto> {
    const res = await api.post<CommuteVehicleDto>('/commute/vehicles', data);
    return res.data;
  },

  async updateVehicle(id: number, data: CreateCommuteVehicleRequest): Promise<CommuteVehicleDto> {
    const res = await api.put<CommuteVehicleDto>(`/commute/vehicles/${id}`, data);
    return res.data;
  },

  async deleteVehicle(id: number): Promise<void> {
    await api.delete(`/commute/vehicles/${id}`);
  },

  // ── Favourite Routes ─────────────────────────────────────────
  async getMyFavouriteRoutes(): Promise<CommuteFavouriteRouteDto[]> {
    const res = await api.get<CommuteFavouriteRouteDto[]>('/commute/favourite-routes');
    return res.data;
  },

  async addFavouriteRoute(data: CreateCommuteFavouriteRouteRequest): Promise<CommuteFavouriteRouteDto> {
    const res = await api.post<CommuteFavouriteRouteDto>('/commute/favourite-routes', data);
    return res.data;
  },

  async deleteFavouriteRoute(id: number): Promise<void> {
    await api.delete(`/commute/favourite-routes/${id}`);
  },
};
