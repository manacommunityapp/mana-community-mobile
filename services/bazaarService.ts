import api from './apiClient';

export type BazaarStatus = 'UPCOMING' | 'OPEN' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type BazaarCategory = 'FLEA_MARKET' | 'FOOD_COURT' | 'CRAFT_FAIR' | 'MELA' | 'GARAGE_SALE' | 'OTHER';
export type StallSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type StallStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'MY_BOOKING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface BazaarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  imageUrl?: string;
  totalStalls: number;
  availableStalls: number;
  stallPrice: number;
  status: BazaarStatus;
  category: BazaarCategory;
  tags?: string[];
  organizerId: string;
}

export interface BazaarStall {
  id: string;
  bazaarId: string;
  stallNumber: string;
  row: number;
  column: number;
  size: StallSize;
  status: StallStatus;
  price: number;
  category?: string;
  bookedBy?: string;
}

export interface BazaarBooking {
  id: string;
  bazaarId: string;
  bazaarTitle: string;
  bazaarDate: string;
  stallId: string;
  stallNumber: string;
  size: StallSize;
  price: number;
  bookingDate: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stallCategory?: string;
  notes?: string;
}

export interface CreateBookingRequest {
  bazaarId: string;
  stallId: string;
  stallCategory: string;
  notes?: string;
}

export const bazaarService = {
  async getEvents(status?: BazaarStatus): Promise<BazaarEvent[]> {
    try {
      const res = await api.get<BazaarEvent[]>('/bazaar/events', {
        params: status ? { status } : undefined,
      });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getEventById(id: string): Promise<BazaarEvent | null> {
    try {
      const res = await api.get<BazaarEvent>(`/bazaar/events/${id}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  async getStallLayout(bazaarId: string): Promise<BazaarStall[]> {
    try {
      const res = await api.get<BazaarStall[]>(`/bazaar/events/${bazaarId}/stalls`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async bookStall(req: CreateBookingRequest): Promise<BazaarBooking> {
    try {
      const res = await api.post<BazaarBooking>('/bazaar/bookings', req);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to book stall. Please try again.');
    }
  },

  async getMyBookings(): Promise<BazaarBooking[]> {
    try {
      const res = await api.get<BazaarBooking[]>('/bazaar/bookings/my');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async cancelBooking(bookingId: string): Promise<void> {
    try {
      await api.delete(`/bazaar/bookings/${bookingId}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel booking. Please try again.');
    }
  },
};
