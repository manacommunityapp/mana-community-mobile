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
    category: t.category || 'Outing',
    description: t.description,
    destination: t.destination || '',
    departureDate: t.departureDate ? String(t.departureDate) : '',
    returnDate: t.returnDate ? String(t.returnDate) : undefined,
    departurePoint: t.departurePoint || 'Main Gate Bus Bay',
    duration: t.duration,
    pickupStops: t.pickupStops ?? [],
    totalSeats: typeof t.totalSeats === 'number' ? t.totalSeats : 25,
    bookedSeats: typeof t.bookedSeats === 'number' ? t.bookedSeats : 0,
    waitlistCount: t.waitlistCount,
    maxWaitlist: t.maxWaitlist,
    pricePerPerson: typeof t.pricePerPerson === 'number' ? t.pricePerPerson : 0,
    hostId: t.hostId ? String(t.hostId) : undefined,
    host: t.host || t.hostName || 'Resident Host',
    hostFlat: t.hostFlat || t.hostFlatNumber,
    hostFlatNumber: t.hostFlatNumber || t.hostFlat,
    hostPhone: t.hostPhone,
    itinerary: t.itinerary ?? [],
    transport: t.transport || 'Coach',
    highlights: t.highlights ?? [],
    transportDetails: t.transportDetails,
    accommodationDetails: t.accommodationDetails,
    emergencyMarshal: t.emergencyMarshal,
    includes: t.includes ?? [],
    excludes: t.excludes ?? [],
    cancellationPolicy: t.cancellationPolicy,
    status: t.status || 'UPCOMING',
    imagePlaceholderColor: t.imagePlaceholderColor,
  };
}

function normalizeBooking(b: any): TripBookingDto {
  return {
    id: String(b.id),
    tripId: String(b.tripId),
    tripTitle: b.tripTitle || 'Community Trip',
    destination: b.destination || '',
    departureDate: b.departureDate ? String(b.departureDate) : '',
    participantCount: typeof b.participantCount === 'number' ? b.participantCount : (b.passengers?.length ?? 1),
    passengers: b.passengers ?? [],
    selectedRoomType: b.selectedRoomType,
    selectedPickupPoint: b.selectedPickupPoint,
    totalAmount: typeof b.totalAmount === 'number' ? b.totalAmount : 0,
    status: (b.status === 'WAITLISTED' || b.status === 'CANCELLED') ? b.status : 'CONFIRMED',
    boardingPassQR: b.boardingPassQR || `BP-${b.tripId || 'TRIP'}-${b.id}`,
    bookedAt: b.bookedAt || new Date().toISOString(),
    host: b.host,
    attendance: b.attendance,
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
      secureLog.error('[tripsService] Failed to load trips from server', err);
      throw err;
    }
  },

  /**
   * GET /api/trips/{id}
   */
  async getTrip(id: string): Promise<TripDto> {
    try {
      const res = await api.get<TripDto>(`/trips/${id}`);
      if (res.data) {
        return normalizeTrip(res.data);
      }
      throw new Error(`Trip ${id} not found`);
    } catch (err) {
      secureLog.error(`[tripsService] Trip ${id} not found on server`, err);
      throw err;
    }
  },

  /**
   * POST /api/trips/{id}/book
   */
  async bookTrip(
    tripId: string,
    bookingPayload: {
      passengers: PassengerDto[];
      selectedRoomType?: string;
      selectedPickupPoint?: string;
      paymentMethod: string;
    },
  ): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/${tripId}/book`, bookingPayload);
      return normalizeBooking(res.data);
    } catch (err) {
      secureLog.error(`[tripsService] Booking failed for trip ${tripId}`, err);
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
      throw err;
    }
  },

  /**
   * POST /api/trips/bookings/{id}/cancel
   */
  async cancelBooking(
    bookingId: string,
    reason?: string,
  ): Promise<{ refundAmount: number; penaltyDeducted: number }> {
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
      secureLog.error('[tripsService] Failed to create trip on server', err);
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
      throw err;
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
      secureLog.error(`[tripsService] Check-in failed for booking ${bookingId}`, err);
      throw err;
    }
  },

  /**
   * POST /api/trips/{id}/reviews
   */
  async submitReview(
    tripId: string,
    review: { rating: number; comment: string },
  ): Promise<void> {
    try {
      await api.post(`/trips/${tripId}/reviews`, review);
    } catch (err) {
      secureLog.error(`[tripsService] Failed to submit review for ${tripId}`, err);
      throw err;
    }
  },
};
