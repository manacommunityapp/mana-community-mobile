import api from './apiClient';
import type {
  AirportDto,
  AirportRideDto,
  AirportRideSearchRequest,
  CreateAirportRideRequest,
  PageResponse,
} from '@/types/airportRides';

const EMPTY_PAGE: PageResponse<AirportRideDto> = {
  content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20,
};

export const airportRideService = {
  async getAirports(): Promise<AirportDto[]> {
    const res = await api.get<AirportDto[]>('/mobility/airport-rides/airports');
    return res.data ?? [];
  },

  async search(req: AirportRideSearchRequest): Promise<PageResponse<AirportRideDto>> {
    try {
      const res = await api.get<PageResponse<AirportRideDto>>('/mobility/airport-rides/search', {
        params: { ...req, page: req.page ?? 0, size: req.size ?? 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async get(id: number): Promise<AirportRideDto> {
    const res = await api.get<AirportRideDto>(`/mobility/airport-rides/${id}`);
    return res.data;
  },

  async create(req: CreateAirportRideRequest): Promise<AirportRideDto> {
    const res = await api.post<AirportRideDto>('/mobility/airport-rides', req);
    return res.data;
  },

  async join(id: number, seats = 1): Promise<void> {
    await api.post(`/mobility/airport-rides/${id}/join`, { seats });
  },

  async getMyTrips(page = 0): Promise<PageResponse<AirportRideDto>> {
    const res = await api.get<PageResponse<AirportRideDto>>('/mobility/airport-rides/my-trips', {
      params: { page, size: 20 },
    });
    return res.data;
  },
};
