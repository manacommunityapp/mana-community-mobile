import api from './apiClient';

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
  description: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  departurePoint: string;
  pickupStops?: string[];
  totalSeats: number;
  bookedSeats: number;
  waitlistCount: number;
  maxWaitlist: number;
  pricePerPerson: number;
  hostId: string;
  host: string;
  hostFlatNumber: string;
  hostPhone: string;
  itinerary: ItineraryDayDto[];
  transport: string;
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
  includes: string[];
  excludes: string[];
  cancellationPolicy: {
    freeCancellationBeforeDays: number;
    penaltyPercentAfterDeadline: number;
    policyNotes: string;
  };
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
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
  attendance?: {
    checkedIn: boolean;
    checkedInAt?: string;
    checkedInBy?: string;
  };
}

export const tripsService = {
  async getTrips(category?: string): Promise<TripDto[]> {
    const res = await api.get<TripDto[]>('/trips', { params: category ? { category } : undefined });
    return res.data;
  },

  async getTrip(id: string): Promise<TripDto> {
    const res = await api.get<TripDto>(`/trips/${id}`);
    return res.data;
  },

  async bookTrip(tripId: string, bookingPayload: {
    passengers: PassengerDto[];
    selectedRoomType?: string;
    selectedPickupPoint?: string;
    paymentMethod: string;
  }): Promise<TripBookingDto> {
    const res = await api.post<TripBookingDto>(`/trips/${tripId}/book`, bookingPayload);
    return res.data;
  },

  async getMyBookings(): Promise<TripBookingDto[]> {
    const res = await api.get<TripBookingDto[]>('/trips/my-bookings');
    return res.data;
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<{ refundAmount: number; penaltyDeducted: number }> {
    const res = await api.post(`/trips/bookings/${bookingId}/cancel`, { reason });
    return res.data;
  },

  async createTrip(payload: Partial<TripDto>): Promise<TripDto> {
    const res = await api.post<TripDto>('/trips', payload);
    return res.data;
  },

  async getManifest(tripId: string): Promise<TripBookingDto[]> {
    const res = await api.get<TripBookingDto[]>(`/trips/${tripId}/manifest`);
    return res.data;
  },

  async checkInPassenger(bookingId: string): Promise<TripBookingDto> {
    const res = await api.post<TripBookingDto>(`/trips/bookings/${bookingId}/check-in`);
    return res.data;
  },

  async submitReview(tripId: string, review: { rating: number; comment: string }): Promise<void> {
    await api.post(`/trips/${tripId}/reviews`, review);
  },
};
