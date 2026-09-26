import api from './apiClient';

export interface HomeHelpWorkerDto {
  id: string;
  name: string;
  category: 'MAID' | 'COOK' | 'DRIVER' | 'CLEANER' | 'BABYSITTER' | 'GARDENER' | 'ELECTRICIAN' | 'PLUMBER';
  phone: string;
  rating: number;
  reviewCount: number;
  workingInFlats: string[];
  verified: boolean;
  avatarUrl?: string;
  monthlyRate?: number;
  dailyRate?: number;
  availability: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE';
}

export interface HomeServiceBookingRequest {
  workerId: string;
  category: string;
  slotDate: string;
  timeSlot: string;
  requirementsNotes?: string;
}

export const homeServicesService = {
  async getWorkers(category?: string): Promise<HomeHelpWorkerDto[]> {
    const res = await api.get<HomeHelpWorkerDto[]>('/home-services/workers', {
      params: category ? { category } : undefined,
    });
    return res.data;
  },

  async bookWorker(data: HomeServiceBookingRequest): Promise<{ bookingId: string; status: string }> {
    const res = await api.post('/home-services/bookings', data);
    return res.data;
  },

  async getMyBookings(): Promise<any[]> {
    const res = await api.get('/home-services/bookings/mine');
    return res.data;
  },
};
