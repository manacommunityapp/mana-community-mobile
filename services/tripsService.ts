import api from './apiClient';
import { secureLog } from '@/security';

export interface ItinerarySlotDto {
  time: string;
  activity: string;
  location?: string;
}

export interface ItineraryDayDto {
  day: number;
  title: string;
  activities: string[];
  slots?: ItinerarySlotDto[];
}

export interface PassengerDto {
  id: string;
  name: string;
  age: number;
  gender: string;
  emergencyPhone: string;
  bloodGroup?: string;
  medicalNotes?: string;
}

export interface TripDto {
  id: string;
  title: string;
  category: string;
  description?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  departurePoint: string;
  duration?: string;
  pickupStops?: string[];
  totalSeats: number;
  bookedSeats: number;
  waitlistCount?: number;
  maxWaitlist?: number;
  pricePerPerson: number;
  hostId?: string;
  host: string;
  hostFlat?: string;
  hostFlatNumber?: string;
  hostPhone?: string;
  itinerary?: ItineraryDayDto[];
  transport: string;
  highlights?: string[];
  transportDetails?: {
    vehicleType: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
  };
  accommodationDetails?: {
    hotelName: string;
    hotelAddress: string;
    roomTypes: string[];
  };
  emergencyMarshal?: {
    name: string;
    phone: string;
    firstAidCertified: boolean;
  };
  includes?: string[];
  excludes?: string[];
  cancellationPolicy?: {
    freeCancellationBeforeDays: number;
    penaltyPercentAfterDeadline: number;
    policyNotes: string;
  };
  status?: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  imagePlaceholderColor?: string;
}

export interface TripBookingDto {
  id: string;
  tripId: string;
  tripTitle: string;
  destination: string;
  departureDate: string;
  participantCount: number;
  passengers: PassengerDto[];
  selectedRoomType?: string;
  selectedPickupPoint?: string;
  totalAmount: number;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  boardingPassQR: string;
  bookedAt: string;
  host?: string;
  attendance?: {
    checkedIn: boolean;
    checkedInAt?: string;
    checkedInBy?: string;
  };
}

function normalizeTrip(t: any): TripDto {
  return {
    id: String(t.id),
    title: t.title || 'Community Trip',
    category: t.category || 'General',
    description: t.description,
    destination: t.destination || '',
    departureDate: t.departureDate || 'Upcoming',
    returnDate: t.returnDate,
    departurePoint: t.departurePoint || 'Main Gate Society Bay',
    duration: t.duration || 'Day Trip',
    totalSeats: typeof t.totalSeats === 'number' ? t.totalSeats : 20,
    bookedSeats: typeof t.bookedSeats === 'number' ? t.bookedSeats : 0,
    pricePerPerson: typeof t.pricePerPerson === 'number' ? t.pricePerPerson : 0,
    host: t.host || 'Resident Host',
    hostFlat: t.hostFlat || t.hostFlatNumber,
    hostFlatNumber: t.hostFlatNumber || t.hostFlat,
    transport: t.transport || 'Society Coach',
    highlights: Array.isArray(t.highlights) ? t.highlights : [],
    includes: Array.isArray(t.includes) ? t.includes : [],
    excludes: Array.isArray(t.excludes) ? t.excludes : [],
    status: t.status || 'UPCOMING',
  };
}

function normalizeBooking(b: any): TripBookingDto {
  let passengers: PassengerDto[] = [];
  if (Array.isArray(b.passengers)) {
    passengers = b.passengers;
  } else if (typeof b.passengersJson === 'string') {
    try {
      passengers = JSON.parse(b.passengersJson);
    } catch {}
  }

  return {
    id: String(b.id),
    tripId: String(b.tripId),
    tripTitle: b.tripTitle || 'Community Trip',
    destination: b.destination || '',
    departureDate: b.departureDate || 'Upcoming',
    participantCount: typeof b.participantCount === 'number' ? b.participantCount : 1,
    passengers,
    selectedPickupPoint: b.selectedPickupPoint,
    selectedRoomType: b.selectedRoomType,
    totalAmount: typeof b.totalAmount === 'number' ? b.totalAmount : 0,
    status: b.status || 'CONFIRMED',
    boardingPassQR: b.boardingPassQR || `MANA-${b.id}`,
    bookedAt: b.bookedAt || new Date().toISOString(),
    host: b.host || 'Resident Host',
    attendance: {
      checkedIn: Boolean(b.checkedIn),
      checkedInAt: b.checkedInAt,
    },
  };
}

export const tripsService = {
  /**
   * GET /api/trips
   */
  async getTrips(category?: string): Promise<TripDto[]> {
    try {
      const res = await api.get('/trips', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(normalizeTrip);
    } catch (err) {
      secureLog.error('[tripsService] Failed to load trips', err);
      return [];
    }
  },

  /**
   * GET /api/trips/{id}
   */
  async getTrip(id: string): Promise<TripDto> {
    try {
      const res = await api.get<TripDto>(`/trips/${id}`);
      return normalizeTrip(res.data);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to load trip ${id}`, err);
      throw err;
    }
  },

  /**
   * POST /api/trips/{id}/book
   */
  async bookTrip(tripId: string, bookingPayload: {
    passengers: PassengerDto[];
    selectedRoomType?: string;
    selectedPickupPoint?: string;
    paymentMethod: string;
  }): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/${tripId}/book`, bookingPayload);
      return normalizeBooking(res.data);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to book trip ${tripId}`, err);
      throw err;
    }
  },

  /**
   * GET /api/trips/my-bookings
   */
  async getMyBookings(): Promise<TripBookingDto[]> {
    try {
      const res = await api.get('/trips/my-bookings');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(normalizeBooking);
    } catch (err) {
      secureLog.error('[tripsService] Failed to load my bookings', err);
      return [];
    }
  },

  /**
   * POST /api/trips/bookings/{id}/cancel
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<{ refundAmount: number; penaltyDeducted: number }> {
    try {
      const res = await api.post(`/trips/bookings/${bookingId}/cancel`, { reason });
      return res.data;
    } catch (err) {
      secureLog.error(`[tripsService] Failed to cancel booking ${bookingId}`, err);
      throw err;
    }
  },

  /**
   * POST /api/trips
   */
  async createTrip(payload: Partial<TripDto>): Promise<TripDto> {
    try {
      const res = await api.post<TripDto>('/trips', payload);
      return normalizeTrip(res.data);
    } catch (err) {
      secureLog.error('[tripsService] Failed to create trip', err);
      throw err;
    }
  },

  /**
   * GET /api/trips/{id}/manifest
   */
  async getManifest(tripId: string): Promise<TripBookingDto[]> {
    try {
      const res = await api.get<TripBookingDto[]>(`/trips/${tripId}/manifest`);
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map(normalizeBooking);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to load manifest for ${tripId}`, err);
      return [];
    }
  },

  /**
   * POST /api/trips/bookings/{id}/check-in
   */
  async checkInPassenger(bookingId: string): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/bookings/${bookingId}/check-in`);
      return normalizeBooking(res.data);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to check in booking ${bookingId}`, err);
      throw err;
    }
  },

  /**
   * POST /api/trips/{id}/reviews
   */
  async submitReview(tripId: string, review: { rating: number; comment: string }): Promise<void> {
    try {
      await api.post(`/trips/${tripId}/reviews`, review);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to submit review for ${tripId}`, err);
    }
  },
};

