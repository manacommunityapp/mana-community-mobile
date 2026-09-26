import api from './apiClient';

export interface TripDto {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate?: string;
  organizerName: string;
  seatsTotal: number;
  seatsBooked: number;
  estimatedCostPerPerson: number;
  description: string;
  status: 'OPEN' | 'FULL' | 'COMPLETED';
}

export const tripsService = {
  async getTrips(): Promise<TripDto[]> {
    const res = await api.get<TripDto[]>('/trips');
    return res.data;
  },

  async getTrip(id: string): Promise<TripDto> {
    const res = await api.get<TripDto>(`/trips/${id}`);
    return res.data;
  },

  async joinTrip(tripId: string, seats: number): Promise<void> {
    await api.post(`/trips/${tripId}/join`, { seats });
  },

  async createTrip(payload: Partial<TripDto>): Promise<TripDto> {
    const res = await api.post<TripDto>('/trips', payload);
    return res.data;
  },
};
