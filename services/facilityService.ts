import api from './apiClient';

export interface FacilityDto {
  id: string;
  name: string;
  type: 'CLUBHOUSE' | 'TENNIS' | 'BADMINTON' | 'SWIMMING_POOL' | 'PARTY_HALL' | 'GYM';
  capacity: number;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  hourlyRate: number;
  rules?: string;
}

export interface FacilityBookingRequest {
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount?: number;
}

export const facilityService = {
  async getFacilities(): Promise<FacilityDto[]> {
    const res = await api.get<FacilityDto[]>('/facilities');
    return res.data;
  },

  async getAvailableSlots(facilityId: string, date: string): Promise<string[]> {
    const res = await api.get<string[]>(`/facilities/${facilityId}/slots`, { params: { date } });
    return res.data;
  },

  async bookSlot(data: FacilityBookingRequest): Promise<any> {
    const res = await api.post('/facilities/book', data);
    return res.data;
  },

  async getMyBookings(): Promise<any[]> {
    const res = await api.get('/facilities/my-bookings');
    return res.data;
  },
};
