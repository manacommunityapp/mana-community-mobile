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

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const commuteService = {
  async getUpcomingRides(
    rideType?: CommuteRideType,
    page = 0,
  ): Promise<PageResponse<CommuteRideDto>> {
    try {
      const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides', {
        params: { rideType, page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async searchRides(
    destination: string,
    page = 0,
  ): Promise<PageResponse<CommuteRideDto>> {
    try {
      const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/search', {
        params: { destination, page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getRide(id: number): Promise<CommuteRideDto> {
    const res = await api.get<CommuteRideDto>(`/commute/rides/${id}`);
    return res.data;
  },

  async createRide(data: CreateCommuteRideRequest): Promise<CommuteRideDto> {
    try {
      const res = await api.post<CommuteRideDto>('/commute/rides', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create ride. Please try again.');
    }
  },

  async updateRide(id: number, data: CreateCommuteRideRequest): Promise<CommuteRideDto> {
    try {
      const res = await api.put<CommuteRideDto>(`/commute/rides/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update ride.');
    }
  },

  async cancelRide(id: number): Promise<void> {
    try {
      await api.delete(`/commute/rides/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel ride.');
    }
  },

  async getMyOffers(page = 0): Promise<PageResponse<CommuteRideDto>> {
    try {
      const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/my-offers', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getMyBookings(page = 0): Promise<PageResponse<CommuteRideDto>> {
    try {
      const res = await api.get<PageResponse<CommuteRideDto>>('/commute/rides/my-bookings', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async bookRide(rideId: number, data: CreateCommuteBookingRequest): Promise<CommuteBookingDto> {
    try {
      const res = await api.post<CommuteBookingDto>(`/commute/rides/${rideId}/book`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to book ride. Please try again.');
    }
  },

  async cancelBooking(rideId: number): Promise<void> {
    try {
      await api.delete(`/commute/rides/${rideId}/book`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel booking.');
    }
  },

  async confirmBooking(bookingId: number): Promise<CommuteBookingDto> {
    try {
      const res = await api.patch<CommuteBookingDto>(`/commute/bookings/${bookingId}/confirm`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to confirm booking.');
    }
  },

  async rejectBooking(bookingId: number): Promise<CommuteBookingDto> {
    try {
      const res = await api.patch<CommuteBookingDto>(`/commute/bookings/${bookingId}/reject`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to reject booking.');
    }
  },

  async getStats(): Promise<CommuteStatsDto> {
    try {
      const res = await api.get<CommuteStatsDto>('/commute/stats');
      return res.data;
    } catch {
      return {} as CommuteStatsDto;
    }
  },

  async rateRide(rideId: number, data: CreateCommuteRatingRequest): Promise<CommuteRatingDto> {
    try {
      const res = await api.post<CommuteRatingDto>(`/commute/rides/${rideId}/rate`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to submit rating. Please try again.');
    }
  },

  async getRideRatings(rideId: number): Promise<CommuteRatingDto[]> {
    try {
      const res = await api.get<CommuteRatingDto[]>(`/commute/rides/${rideId}/ratings`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getUserProfile(userId: number): Promise<CommuteUserProfileDto> {
    const res = await api.get<CommuteUserProfileDto>(`/commute/users/${userId}/profile`);
    return res.data;
  },

  async getMyVehicles(): Promise<CommuteVehicleDto[]> {
    try {
      const res = await api.get<CommuteVehicleDto[]>('/commute/vehicles');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addVehicle(data: CreateCommuteVehicleRequest): Promise<CommuteVehicleDto> {
    try {
      const res = await api.post<CommuteVehicleDto>('/commute/vehicles', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add vehicle. Please try again.');
    }
  },

  async updateVehicle(id: number, data: CreateCommuteVehicleRequest): Promise<CommuteVehicleDto> {
    try {
      const res = await api.put<CommuteVehicleDto>(`/commute/vehicles/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update vehicle.');
    }
  },

  async deleteVehicle(id: number): Promise<void> {
    try {
      await api.delete(`/commute/vehicles/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to delete vehicle.');
    }
  },

  async getMyFavouriteRoutes(): Promise<CommuteFavouriteRouteDto[]> {
    try {
      const res = await api.get<CommuteFavouriteRouteDto[]>('/commute/favourite-routes');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addFavouriteRoute(data: CreateCommuteFavouriteRouteRequest): Promise<CommuteFavouriteRouteDto> {
    try {
      const res = await api.post<CommuteFavouriteRouteDto>('/commute/favourite-routes', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to save favourite route.');
    }
  },

  async deleteFavouriteRoute(id: number): Promise<void> {
    try {
      await api.delete(`/commute/favourite-routes/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to remove favourite route.');
    }
  },
};
