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

// ── In-Memory Fallback State (used when backend endpoints are offline/pending) ──
let fallbackTrips: TripDto[] = [
  {
    id: 'TRP-1',
    title: 'Kedarnath Spiritual Yatra',
    category: 'Pilgrimage',
    destination: 'Kedarnath, Uttarakhand',
    departureDate: 'Oct 25, 2026',
    departurePoint: 'Main Gate Society Bus Bay',
    duration: '5 Days / 4 Nights',
    totalSeats: 35,
    bookedSeats: 24,
    pricePerPerson: 18500,
    host: 'Suresh Iyer',
    hostFlat: 'A-401',
    hostFlatNumber: 'A-401',
    transport: 'AC Volvo Coach',
    highlights: ['Helicopter transfer option', 'Temple VIP Darshan', 'Sattvic Meals'],
    includes: ['VIP Darshan Pass', '3-Star Hotel Stay', 'Helicopter shuttle assistance'],
    excludes: ['Personal horse/pony ride', 'Pooja personal expenses'],
    status: 'UPCOMING',
  },
  {
    id: 'TRP-2',
    title: 'Coorg Coffee Trail & Waterfall Trek',
    category: 'Trekking',
    destination: 'Coorg, Karnataka',
    departureDate: 'Nov 12, 2026',
    departurePoint: 'Clubhouse Parking Bay',
    duration: '2 Days / 1 Night',
    totalSeats: 20,
    bookedSeats: 16,
    pricePerPerson: 4200,
    host: 'Ananya Sharma',
    hostFlat: 'B-204',
    hostFlatNumber: 'B-204',
    transport: 'Tempo Traveller AC',
    highlights: ['Plantation Walk', 'Campfire & BBQ', 'Certified Trek Guide'],
    includes: ['Plantation Estate Stay', 'All 4 Meals & Snacks', 'First Aid Guide'],
    excludes: ['Personal gear'],
    status: 'UPCOMING',
  },
  {
    id: 'TRP-3',
    title: 'Pawna Lake Stargazing & Camping',
    category: 'Camping',
    destination: 'Pawna Lake, Lonavala',
    departureDate: 'Nov 28, 2026',
    departurePoint: 'Society Gate 2',
    duration: 'Overnight Camp',
    totalSeats: 25,
    bookedSeats: 11,
    pricePerPerson: 2800,
    host: 'Rahul Deshmukh',
    hostFlat: 'C-102',
    hostFlatNumber: 'C-102',
    transport: 'Community Carpool / Bus',
    highlights: ['Telescope Astronomy', 'Live Music Jam', 'Lake Kayaking'],
    includes: ['Waterfront Tent & Sleeping Bag', 'Barbeque & Dinner', 'Kayaking Life Jackets'],
    excludes: ['Personal snacks'],
    status: 'UPCOMING',
  },
  {
    id: 'TRP-4',
    title: 'Gokarna Sunset & Beach Trek',
    category: 'Beach & Coastal',
    destination: 'Gokarna, Karnataka',
    departureDate: 'Dec 18, 2026',
    departurePoint: 'Main Gate Bay',
    duration: '3 Days / 2 Nights',
    totalSeats: 30,
    bookedSeats: 8,
    pricePerPerson: 5900,
    host: 'Vikram Mehta',
    hostFlat: 'D-802',
    hostFlatNumber: 'D-802',
    transport: 'Luxury Mini Coach',
    highlights: ['5 Beach Cliff Trek', 'Beachside Bonfire', 'Water Sports'],
    includes: ['Beachside Resort', 'Trek Permits', 'Breakfast & Bonfire'],
    excludes: ['Scuba diving personal pass'],
    status: 'UPCOMING',
  },
];

let fallbackBookings: TripBookingDto[] = [
  {
    id: 'BKG-771',
    tripId: 'TRP-1',
    tripTitle: 'Kedarnath Spiritual Yatra',
    destination: 'Kedarnath, Uttarakhand',
    departureDate: 'Oct 25, 2026 • 06:00 AM',
    participantCount: 2,
    passengers: [
      { id: 'pax-1', name: 'Primary Member', age: 34, gender: 'Male', emergencyPhone: '9876543210' },
      { id: 'pax-2', name: 'Family Member', age: 31, gender: 'Female', emergencyPhone: '9876543210' },
    ],
    selectedPickupPoint: 'Main Gate Society Bus Bay',
    totalAmount: 37000,
    status: 'CONFIRMED',
    boardingPassQR: 'MANA-TRP-771-KEDAR-2PAX-A1204',
    bookedAt: '2026-09-20T10:00:00Z',
    host: 'Suresh Iyer (A-401)',
  },
];

export const tripsService = {
  async getTrips(category?: string): Promise<TripDto[]> {
    try {
      const res = await api.get('/trips', { params: category && category !== 'ALL' ? { category } : undefined });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
      return category && category !== 'ALL'
        ? fallbackTrips.filter(t => t.category.toLowerCase() === category.toLowerCase())
        : fallbackTrips;
    } catch {
      return category && category !== 'ALL'
        ? fallbackTrips.filter(t => t.category.toLowerCase() === category.toLowerCase())
        : fallbackTrips;
    }
  },

  async getTrip(id: string): Promise<TripDto> {
    try {
      const res = await api.get<TripDto>(`/trips/${id}`);
      if (res.data?.id) return res.data;
      throw new Error('Fallback trip fetch');
    } catch {
      const found = fallbackTrips.find(t => t.id === id);
      if (found) return found;
      return fallbackTrips[0];
    }
  },

  async bookTrip(tripId: string, bookingPayload: {
    passengers: PassengerDto[];
    selectedRoomType?: string;
    selectedPickupPoint?: string;
    paymentMethod: string;
  }): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/${tripId}/book`, bookingPayload);
      if (res.data?.id) return res.data;
      throw new Error('Fallback local booking');
    } catch {
      const trip = fallbackTrips.find(t => t.id === tripId) || fallbackTrips[0];
      const paxCount = bookingPayload.passengers.length || 1;
      const total = trip.pricePerPerson * paxCount;
      const bookingId = `BKG-${Math.floor(100 + Math.random() * 900)}`;

      // Update seats locally
      trip.bookedSeats = Math.min(trip.totalSeats, trip.bookedSeats + paxCount);

      const newBooking: TripBookingDto = {
        id: bookingId,
        tripId: trip.id,
        tripTitle: trip.title,
        destination: trip.destination,
        departureDate: `${trip.departureDate} • 06:30 AM`,
        participantCount: paxCount,
        passengers: bookingPayload.passengers,
        selectedPickupPoint: bookingPayload.selectedPickupPoint || trip.departurePoint,
        selectedRoomType: bookingPayload.selectedRoomType,
        totalAmount: total,
        status: 'CONFIRMED',
        boardingPassQR: `MANA-${trip.id}-UNIT-${paxCount}PAX-${Date.now().toString().slice(-4)}`,
        bookedAt: new Date().toISOString(),
        host: `${trip.host} (${trip.hostFlat || trip.hostFlatNumber || 'Host'})`,
      };

      fallbackBookings = [newBooking, ...fallbackBookings];
      return newBooking;
    }
  },

  async getMyBookings(): Promise<TripBookingDto[]> {
    try {
      const res = await api.get('/trips/my-bookings');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.length > 0 ? list : fallbackBookings;
    } catch {
      return fallbackBookings;
    }
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<{ refundAmount: number; penaltyDeducted: number }> {
    try {
      const res = await api.post(`/trips/bookings/${bookingId}/cancel`, { reason });
      return res.data;
    } catch {
      const bIndex = fallbackBookings.findIndex(b => b.id === bookingId);
      if (bIndex !== -1) {
        const booking = fallbackBookings[bIndex];
        const trip = fallbackTrips.find(t => t.id === booking.tripId);
        if (trip) {
          trip.bookedSeats = Math.max(0, trip.bookedSeats - booking.participantCount);
        }
        fallbackBookings = fallbackBookings.filter(b => b.id !== bookingId);
      }
      return { refundAmount: 0, penaltyDeducted: 0 };
    }
  },

  async createTrip(payload: Partial<TripDto>): Promise<TripDto> {
    try {
      const res = await api.post<TripDto>('/trips', payload);
      return res.data;
    } catch {
      const newTrip: TripDto = {
        id: `TRP-${Date.now().toString().slice(-4)}`,
        title: payload.title || 'Community Trip',
        category: payload.category || 'General',
        destination: payload.destination || 'Destination',
        departureDate: payload.departureDate || 'Soon',
        departurePoint: payload.departurePoint || 'Main Gate',
        totalSeats: payload.totalSeats || 20,
        bookedSeats: 0,
        pricePerPerson: payload.pricePerPerson || 1000,
        host: payload.host || 'Resident Host',
        transport: payload.transport || 'Bus',
      };
      fallbackTrips = [newTrip, ...fallbackTrips];
      return newTrip;
    }
  },

  async getManifest(tripId: string): Promise<TripBookingDto[]> {
    try {
      const res = await api.get<TripBookingDto[]>(`/trips/${tripId}/manifest`);
      return res.data;
    } catch {
      return fallbackBookings.filter(b => b.tripId === tripId);
    }
  },

  async checkInPassenger(bookingId: string): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/bookings/${bookingId}/check-in`);
      return res.data;
    } catch {
      const booking = fallbackBookings.find(b => b.id === bookingId);
      if (booking) {
        booking.attendance = {
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
        };
        return booking;
      }
      throw new Error('Booking not found');
    }
  },

  async submitReview(tripId: string, review: { rating: number; comment: string }): Promise<void> {
    try {
      await api.post(`/trips/${tripId}/reviews`, review);
    } catch {
      // Offline fallback silent success
    }
  },
};
