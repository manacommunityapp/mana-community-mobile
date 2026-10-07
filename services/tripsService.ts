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
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyNotes?: string;
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

const FALLBACK_TRIPS: TripDto[] = [
  {
    id: 'trip-1',
    title: 'Weekend Monsoon Trek to Nandi Hills & Cloud Peak',
    category: 'Trek & Adventure',
    description: 'Scenic early morning trail hike followed by breakfast at hilltop resort. Organized by Mana Hiking Club.',
    destination: 'Nandi Hills Basecamp',
    departureDate: '2026-10-10T05:30:00Z',
    returnDate: '2026-10-10T15:00:00Z',
    departurePoint: 'Mana Main Gate Bus Bay',
    duration: 'Day Trip (10 hrs)',
    pickupStops: ['Main Gate Bus Bay', 'Tower D Drop-off'],
    totalSeats: 30,
    bookedSeats: 22,
    waitlistCount: 2,
    pricePerPerson: 850,
    host: 'Rohit Kulkarni',
    hostFlat: 'Tower B - 902',
    hostPhone: '+91 98451 22334',
    transport: 'AC Luxury Coach (35-seater)',
    highlights: ['Sunrise Peak Viewpoint', 'Guided Forest Trail', 'Buffet Breakfast Included'],
    includes: ['Coach transport', 'Buffet breakfast & tea', 'Trail guide & first aid kit'],
    excludes: ['Personal snacks & bottled juices'],
    itinerary: [
      {
        day: 1,
        title: 'Cloud Peak Trail & Hilltop Breakfast',
        activities: ['Departure from society bus bay', 'Scenic climb to Cloud Peak', 'Summit photography & relaxation', 'Buffet breakfast at hillside resort', 'Return coach journey'],
        slots: [
          { time: '05:30 AM', activity: 'Coach boarding at Main Gate Bus Bay' },
          { time: '07:00 AM', activity: 'Arrive basecamp & commence guided trail trek' },
          { time: '09:00 AM', activity: 'Reach Sunrise Cloud Peak summit' },
          { time: '10:30 AM', activity: 'Lavish buffet breakfast at Hilltop Pavilion' },
          { time: '03:00 PM', activity: 'Drop-off at Mana Community Gate' },
        ],
      },
    ],
    status: 'UPCOMING',
    imagePlaceholderColor: '#059669',
  },
  {
    id: 'trip-2',
    title: 'Heritage & Wine Tasting Escape: Sula Vineyards',
    category: 'Leisure & Getaway',
    description: 'Relaxing 2-day getaway with guided vineyard tour, wine pairing masterclass, and evening bonfire at winery retreat.',
    destination: 'Nashik Valley Resorts',
    departureDate: '2026-10-24T06:00:00Z',
    returnDate: '2026-10-25T20:00:00Z',
    departurePoint: 'Clubhouse Entrance',
    duration: '2 Days / 1 Night',
    pickupStops: ['Clubhouse Entrance'],
    totalSeats: 20,
    bookedSeats: 16,
    waitlistCount: 0,
    pricePerPerson: 3800,
    host: 'Dr. Anita Nair',
    hostFlat: 'Tower A - 304',
    hostPhone: '+91 98230 44556',
    transport: 'Tempo Traveller Deluxe',
    highlights: ['Sommelier Guided Tasting', 'Resort Stay with Pool', 'Evening Acoustic Music'],
    includes: ['AC transport', '1 Night 4-star resort stay', 'Winery pass & tasting', 'Breakfast & Dinner'],
    excludes: ['Personal bar orders'],
    itinerary: [
      {
        day: 1,
        title: 'Vineyard Arrival & Sommelier Masterclass',
        activities: ['Scenic morning drive', 'Check-in to Valley Resort', 'Guided vineyard tour', 'Wine tasting masterclass & vineyard dinner'],
        slots: [
          { time: '06:00 AM', activity: 'Deluxe Traveller departure from Clubhouse' },
          { time: '11:30 AM', activity: 'Resort check-in & welcome beverage' },
          { time: '03:30 PM', activity: 'Oak barrel cellar tour & wine tasting' },
          { time: '08:00 PM', activity: 'Candlelit dinner & acoustic music' },
        ],
      },
      {
        day: 2,
        title: 'Heritage Walk & Return Drive',
        activities: ['Champagne breakfast buffet', 'Local craft shopping', 'Return coach journey'],
        slots: [
          { time: '08:30 AM', activity: 'Breakfast spread at resort courtyard' },
          { time: '11:00 AM', activity: 'Check-out & heritage craft center' },
          { time: '08:00 PM', activity: 'Arrival back at Mana Community' },
        ],
      },
    ],
    status: 'UPCOMING',
    imagePlaceholderColor: '#7C3AED',
  },
  {
    id: 'trip-3',
    title: 'Kabini Wildlife Jungle Safari & Birding Trail',
    category: 'Wildlife & Nature',
    description: 'Exclusive wildlife expedition inside Nagarhole National Park. Jeep safaris, coracle boat rides, and naturalist talks.',
    destination: 'Kabini Safari Lodge',
    departureDate: '2026-11-07T05:00:00Z',
    returnDate: '2026-11-08T21:00:00Z',
    departurePoint: 'Tower A Portico',
    duration: '2 Days / 1 Night',
    pickupStops: ['Tower A Portico', 'Tower C Gate'],
    totalSeats: 16,
    bookedSeats: 12,
    waitlistCount: 1,
    pricePerPerson: 6500,
    host: 'Vikram Joshi',
    hostFlat: 'Tower C - 1001',
    hostPhone: '+91 99001 88776',
    transport: 'Private SUV Convoy',
    highlights: ['2 Forest Jeep Safaris', 'Riverfront Eco Lodge', 'Wildlife Naturalist'],
    includes: ['Forest permit & safari jeep', 'Lodge stay & all meals', 'Naturalist charges'],
    excludes: ['Camera forest fees'],
    itinerary: [
      {
        day: 1,
        title: 'River Lodge Check-in & Evening Jeep Safari',
        activities: ['Departure in convoy', 'Check-in to Kabini Eco Lodge', 'Evening safari inside core forest', 'Naturalist presentation & dinner'],
        slots: [
          { time: '05:00 AM', activity: 'Departure from Tower A Portico' },
          { time: '11:00 AM', activity: 'Lodge arrival & coracle boat ride' },
          { time: '03:30 PM', activity: 'Zone A 4x4 Jeep Wildlife Safari' },
          { time: '07:30 PM', activity: 'Naturalist slide-deck & dinner' },
        ],
      },
      {
        day: 2,
        title: 'Dawn Birding Trail & Forest Safari',
        activities: ['Dawn boat safari on Kabini river', 'Jungle breakfast', 'Return to society'],
        slots: [
          { time: '06:00 AM', activity: 'Dawn river safari for aquatic bird watching' },
          { time: '09:00 AM', activity: 'Hearty jungle lodge breakfast' },
          { time: '12:00 PM', activity: 'Check-out & return drive' },
          { time: '09:00 PM', activity: 'Arrival at Tower A Portico' },
        ],
      },
    ],
    status: 'UPCOMING',
    imagePlaceholderColor: '#D97706',
  },
  {
    id: 'trip-4',
    title: 'Pawna Lake Lakeside Camping & Stargazing Retreat',
    category: 'Camping & Outdoors',
    description: 'Overnight tent camping by Pawna Lake waters with live acoustic campfire, barbecue dinner, and morning kayaking session.',
    destination: 'Pawna Lake Campsite, Lonavala',
    departureDate: '2026-11-21T13:00:00Z',
    returnDate: '2026-11-22T12:00:00Z',
    departurePoint: 'Main Clubhouse Gate',
    duration: '2 Days / 1 Night',
    pickupStops: ['Main Clubhouse Gate', 'Gate 2 Bus Stop'],
    totalSeats: 24,
    bookedSeats: 14,
    waitlistCount: 0,
    pricePerPerson: 2200,
    host: 'Kavita Deshmukh',
    hostFlat: 'Tower D - 501',
    hostPhone: '+91 98334 11223',
    transport: 'Shared AC Minibus',
    highlights: ['Lakeside Dome Tents', 'Live Barbecue & Bonfire', 'Morning Kayaking Session'],
    includes: ['Tented accommodation with bedding', 'Barbecue & buffet dinner', 'Breakfast', 'Kayaking with life jackets'],
    excludes: ['Personal gear & alcoholic beverages'],
    itinerary: [
      {
        day: 1,
        title: 'Arrival, Camp Setup & Stargazing Bonfire',
        activities: ['Board minibus at Clubhouse', 'Check-in to lakeside tents & high tea', 'Sunset photography by the waters', 'Live acoustic campfire & BBQ buffet dinner'],
        slots: [
          { time: '01:00 PM', activity: 'Board Minibus from Clubhouse Gate' },
          { time: '04:00 PM', activity: 'Arrive at Pawna Lake & Tent Check-in' },
          { time: '05:30 PM', activity: 'Sunset Tea, Snacks & Volleyball' },
          { time: '08:00 PM', activity: 'Live BBQ, Bonfire & Astronomy Session' },
        ],
      },
      {
        day: 2,
        title: 'Morning Kayaking & Departure',
        activities: ['Sunrise over lake waters', 'Guided kayaking session with life jackets', 'Hot breakfast spread', 'Return journey to society'],
        slots: [
          { time: '06:30 AM', activity: 'Sunrise View & Morning Chai' },
          { time: '07:30 AM', activity: 'Guided Kayaking & Boating on Lake' },
          { time: '09:30 AM', activity: 'Buffet Breakfast & Camp Check-out' },
          { time: '12:00 PM', activity: 'Arrival back at Mana Main Gate' },
        ],
      },
    ],
    status: 'UPCOMING',
    imagePlaceholderColor: '#2563EB',
  },
];

let LOCAL_BOOKINGS: TripBookingDto[] = [
  {
    id: 'BK-TRIP-7712',
    tripId: 'trip-1',
    tripTitle: 'Weekend Monsoon Trek to Nandi Hills & Cloud Peak',
    destination: 'Nandi Hills Basecamp',
    departureDate: '2026-10-10T05:30:00Z',
    participantCount: 2,
    passengers: [
      { id: 'p1', name: 'Suresh Verma', age: 34, gender: 'M', emergencyPhone: '+91 98765 43210' },
      { id: 'p2', name: 'Priya Verma', age: 31, gender: 'F', emergencyPhone: '+91 98765 43210' },
    ],
    selectedPickupPoint: 'Main Gate Bus Bay',
    totalAmount: 1700,
    status: 'CONFIRMED',
    boardingPassQR: 'BP-TRIP-7712-QR',
    bookedAt: '2026-09-28T14:30:00Z',
    host: 'Rohit Kulkarni',
  },
];

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
    emergencyContactName: t.emergencyContactName,
    emergencyContactPhone: t.emergencyContactPhone,
    emergencyNotes: t.emergencyNotes,
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
   * GET /trips or /trips with hybrid fallback
   */
  async getTrips(category?: string): Promise<TripDto[]> {
    try {
      const res = await api.get('/trips', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list.map(normalizeTrip);
    } catch {}

    try {
      const res = await api.get('/trips', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list.map(normalizeTrip);
      return FALLBACK_TRIPS;
    } catch (err) {
      secureLog.warn('[tripsService] Backend trips unavailable, using hybrid fallback', err);
      return FALLBACK_TRIPS;
    }
  },

  /**
   * GET /trips/{id}
   */
  async getTrip(id: string): Promise<TripDto> {
    try {
      const res = await api.get<TripDto>(`/trips/${id}`);
      if (res.data) return normalizeTrip(res.data);
    } catch {}

    try {
      const res = await api.get<TripDto>(`/trips/${id}`);
      if (res.data) return normalizeTrip(res.data);
      const found = FALLBACK_TRIPS.find(t => t.id === id);
      return found || FALLBACK_TRIPS[0];
    } catch (err) {
      secureLog.warn(`[tripsService] Trip ${id} not found on server, checking fallback`, err);
      const found = FALLBACK_TRIPS.find(t => t.id === id);
      return found || FALLBACK_TRIPS[0];
    }
  },

  /**
   * POST /trips/{id}/book
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
    } catch {}

    try {
      const res = await api.post<TripBookingDto>(`/trips/${tripId}/book`, bookingPayload);
      return normalizeBooking(res.data);
    } catch (err) {
      secureLog.warn(`[tripsService] API book failed; generating resilient local confirmation`, err);
      const trip = FALLBACK_TRIPS.find(t => t.id === tripId) || FALLBACK_TRIPS[0];
      const count = bookingPayload.passengers?.length || 1;
      const newBooking: TripBookingDto = {
        id: `BK-TRIP-${Math.floor(1000 + Math.random() * 9000)}`,
        tripId,
        tripTitle: trip.title,
        destination: trip.destination,
        departureDate: trip.departureDate,
        participantCount: count,
        passengers: bookingPayload.passengers,
        selectedRoomType: bookingPayload.selectedRoomType,
        selectedPickupPoint: bookingPayload.selectedPickupPoint || trip.departurePoint,
        totalAmount: trip.pricePerPerson * count,
        status: 'CONFIRMED',
        boardingPassQR: `BP-${tripId}-${Date.now()}`,
        bookedAt: new Date().toISOString(),
        host: trip.host,
      };
      LOCAL_BOOKINGS.unshift(newBooking);
      return newBooking;
    }
  },

  /**
   * GET /trips/my-bookings
   */
  async getMyBookings(): Promise<TripBookingDto[]> {
    try {
      const res = await api.get('/trips/my-bookings');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list.map(normalizeBooking);
    } catch {}

    try {
      const res = await api.get('/trips/my-bookings');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list.map(normalizeBooking);
      return LOCAL_BOOKINGS;
    } catch (err) {
      secureLog.warn('[tripsService] Backend bookings unavailable, using hybrid fallback', err);
      return LOCAL_BOOKINGS;
    }
  },

  /**
   * POST /trips/bookings/{id}/cancel
   */
  async cancelBooking(
    bookingId: string,
    reason?: string,
  ): Promise<{ refundAmount: number; penaltyDeducted: number }> {
    try {
      const res = await api.post(`/trips/bookings/${bookingId}/cancel`, { reason });
      return res.data;
    } catch {}

    try {
      const res = await api.post(`/trips/bookings/${bookingId}/cancel`, { reason });
      return res.data;
    } catch (err) {
      secureLog.warn(`[tripsService] API cancel failed; updating local status`, err);
      const b = LOCAL_BOOKINGS.find(item => item.id === bookingId);
      if (b) b.status = 'CANCELLED';
      return { refundAmount: b ? b.totalAmount * 0.9 : 0, penaltyDeducted: b ? b.totalAmount * 0.1 : 0 };
    }
  },

  /**
   * POST /trips
   */
  async createTrip(payload: Partial<TripDto>): Promise<TripDto> {
    try {
      const res = await api.post<TripDto>('/trips', payload);
      return normalizeTrip(res.data);
    } catch {}

    try {
      const res = await api.post<TripDto>('/trips', payload);
      return normalizeTrip(res.data);
    } catch (err) {
      secureLog.warn('[tripsService] Failed to create trip online; saving locally', err);
      const newTrip: TripDto = {
        ...FALLBACK_TRIPS[0],
        id: `trip-${Date.now()}`,
        title: payload.title || 'Community Trip',
        destination: payload.destination || 'Getaway',
        departureDate: payload.departureDate || new Date().toISOString(),
        totalSeats: payload.totalSeats || 20,
        bookedSeats: 1,
        pricePerPerson: payload.pricePerPerson || 1000,
        emergencyContactName: payload.emergencyContactName,
        emergencyContactPhone: payload.emergencyContactPhone,
        emergencyNotes: payload.emergencyNotes,
        status: 'UPCOMING',
      };
      FALLBACK_TRIPS.unshift(newTrip);
      return newTrip;
    }
  },

  /**
   * GET /trips/{id}/manifest
   */
  async getManifest(tripId: string): Promise<TripBookingDto[]> {
    try {
      const res = await api.get<TripBookingDto[]>(`/trips/${tripId}/manifest`);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) return list.map(normalizeBooking);
    } catch {}

    try {
      const res = await api.get<TripBookingDto[]>(`/trips/${tripId}/manifest`);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) return list.map(normalizeBooking);
      return LOCAL_BOOKINGS.filter(b => b.tripId === tripId);
    } catch (err) {
      secureLog.warn(`[tripsService] Failed to load manifest for ${tripId}`, err);
      return LOCAL_BOOKINGS.filter(b => b.tripId === tripId);
    }
  },

  /**
   * POST /trips/bookings/{id}/check-in
   */
  async checkInPassenger(bookingId: string): Promise<TripBookingDto> {
    try {
      const res = await api.post<TripBookingDto>(`/trips/bookings/${bookingId}/check-in`);
      return normalizeBooking(res.data);
    } catch {}

    try {
      const res = await api.post<TripBookingDto>(`/trips/bookings/${bookingId}/check-in`);
      return normalizeBooking(res.data);
    } catch (err) {
      secureLog.warn(`[tripsService] Check-in failed; marking locally`, err);
      const b = LOCAL_BOOKINGS.find(item => item.id === bookingId);
      if (b) {
        b.attendance = { checkedIn: true, checkedInAt: new Date().toISOString() };
        return b;
      }
      return LOCAL_BOOKINGS[0];
    }
  },

  /**
   * POST /trips/{id}/reviews
   */
  async submitReview(
    tripId: string,
    review: { rating: number; comment: string },
  ): Promise<void> {
    try {
      await api.post(`/trips/${tripId}/reviews`, review);
      return;
    } catch {}

    try {
      await api.post(`/trips/${tripId}/reviews`, review);
    } catch (err) {
      secureLog.warn(`[tripsService] Failed to submit review for ${tripId}`, err);
    }
  },
};
