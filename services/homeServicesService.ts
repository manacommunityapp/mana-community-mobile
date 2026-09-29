import api from './apiClient';

export interface HomeHelpWorkerDto {
  id: string | number;
  name: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'APPLIANCE' | 'CARPENTRY' | 'PAINTING' | 'MAID' | 'PEST_CONTROL' | 'COOK' | 'DRIVER' | 'BABYSITTER' | 'GARDENER' | string;
  phone: string;
  rating: number;
  reviewCount: number;
  priceRange?: string;
  verified: boolean;
  available: boolean;
  statusText?: string;
  speciality?: string;
  experience?: string;
  flatsServed?: number;
  workingInTowers?: string;
  workingInFlats?: string[];
  badge?: string;
  avatarUrl?: string;
  monthlyRate?: number;
  dailyRate?: number;
  availability?: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE';
}

export interface HomeServiceBookingDto {
  id: string;
  workerId?: string | number;
  providerName: string;
  category: string;
  date: string;
  timeSlot: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  phone: string;
  issue: string;
  createdAt?: string;
}

export interface HomeServiceBookingRequest {
  workerId: string | number;
  providerName?: string;
  phone?: string;
  category: string;
  slotDate: string;
  timeSlot: string;
  requirementsNotes?: string;
}

// ── In-Memory Fallback State (used when backend microservice is offline) ──
let fallbackWorkers: HomeHelpWorkerDto[] = [
  {
    id: 1,
    name: 'Raju Sharma (Master Plumber)',
    category: 'PLUMBING',
    phone: '+919876543210',
    rating: 4.8,
    reviewCount: 54,
    priceRange: '₹200 - ₹500',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Pipe leaks, taps, bathroom fittings, flush tanks',
    experience: '9 yrs exp',
    flatsServed: 140,
    workingInTowers: 'Tower A, B, C',
    badge: 'TOP RATED',
  },
  {
    id: 2,
    name: 'Spark Electrical Works (Vinod)',
    category: 'ELECTRICAL',
    phone: '+919876543211',
    rating: 4.7,
    reviewCount: 62,
    priceRange: '₹250 - ₹800',
    verified: true,
    available: true,
    statusText: 'Available (30 min response)',
    speciality: 'MCB tripping, fan, chandelier, geyser & smart switches',
    experience: '12 yrs exp',
    flatsServed: 210,
    workingInTowers: 'All Towers',
    badge: 'FAST RESPONSE',
  },
  {
    id: 3,
    name: 'Urban CleanPro Team',
    category: 'CLEANING',
    phone: '+919876543212',
    rating: 4.9,
    reviewCount: 88,
    priceRange: '₹600 - ₹2,200',
    verified: true,
    available: true,
    statusText: 'Slots Open Tomorrow',
    speciality: 'Deep kitchen, bathroom scrub, sofa & balcony cleaning',
    experience: '6 yrs in society',
    flatsServed: 95,
    workingInTowers: 'Tower B, D, E',
    badge: 'POPULAR',
  },
  {
    id: 4,
    name: 'QuickFix AC & Appliances',
    category: 'APPLIANCE',
    phone: '+919876543215',
    rating: 4.6,
    reviewCount: 39,
    priceRange: '₹350 - ₹1,200',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'AC gas refill, filter cleaning, fridge, washing machine',
    experience: '8 yrs exp',
    flatsServed: 120,
    workingInTowers: 'Tower A, C, F',
  },
  {
    id: 5,
    name: 'Kumar Wooden Craft',
    category: 'CARPENTRY',
    phone: '+919876543213',
    rating: 4.4,
    reviewCount: 28,
    priceRange: '₹300 - ₹1,500',
    verified: true,
    available: false,
    statusText: 'Busy till 4 PM',
    speciality: 'Door locks, hinge fixing, modular kitchen & wardrobe work',
    experience: '15 yrs exp',
    flatsServed: 70,
    workingInTowers: 'Tower C, D',
  },
  {
    id: 6,
    name: 'Sunil Wall Paints & Textures',
    category: 'PAINTING',
    phone: '+919876543214',
    rating: 4.5,
    reviewCount: 31,
    priceRange: '₹18 - ₹28/sqft',
    verified: true,
    available: true,
    statusText: 'Book in Advance',
    speciality: 'Interior touch-up, waterproof coating, balcony paint',
    experience: '10 yrs exp',
    flatsServed: 45,
    workingInTowers: 'All Towers',
  },
  {
    id: 7,
    name: 'Laxmi Domestic Services',
    category: 'MAID',
    phone: '+919876543216',
    rating: 4.8,
    reviewCount: 47,
    priceRange: '₹3,000 - ₹7,000/mo',
    verified: true,
    available: true,
    statusText: 'Morning / Evening Slots',
    speciality: 'Home cooking (North & South Indian), housekeeping, utensil wash',
    experience: '5 yrs verified resident helper',
    flatsServed: 18,
    workingInTowers: 'Tower A, B',
    badge: 'RECOMMENDED',
  },
  {
    id: 8,
    name: 'Shield Pest Solutions',
    category: 'PEST_CONTROL',
    phone: '+919876543217',
    rating: 4.7,
    reviewCount: 26,
    priceRange: '₹750 - ₹1,800',
    verified: true,
    available: true,
    statusText: 'Available This Weekend',
    speciality: 'Cockroach herbal gel, termite, mosquito & rodent control',
    experience: '7 yrs exp',
    flatsServed: 60,
    workingInTowers: 'All Towers',
  },
];

let fallbackBookings: HomeServiceBookingDto[] = [
  {
    id: 'BK-101',
    workerId: 2,
    providerName: 'Spark Electrical Works (Vinod)',
    category: 'ELECTRICAL',
    date: 'Today, 28 Sep',
    timeSlot: '3:00 PM - 4:00 PM',
    status: 'CONFIRMED',
    phone: '+919876543211',
    issue: 'Balcony light switch fixing & MCB check',
    createdAt: '2026-09-28T09:30:00Z',
  },
];

export const homeServicesService = {
  /**
   * GET /home-services/workers or /api/v1/home-services/workers
   */
  async getWorkers(category?: string): Promise<HomeHelpWorkerDto[]> {
    try {
      const res = await api.get('/home-services/workers', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (list.length > 0) return list;
      return category && category !== 'ALL'
        ? fallbackWorkers.filter((w) => w.category.toLowerCase() === category.toLowerCase())
        : fallbackWorkers;
    } catch {
      return category && category !== 'ALL'
        ? fallbackWorkers.filter((w) => w.category.toLowerCase() === category.toLowerCase())
        : fallbackWorkers;
    }
  },

  /**
   * POST /home-services/bookings
   */
  async bookWorker(data: HomeServiceBookingRequest): Promise<{ bookingId: string; status: string }> {
    try {
      const res = await api.post<{ bookingId?: string; id?: string; status?: string }>(
        '/home-services/bookings',
        data,
      );
      if (res.data?.bookingId || res.data?.id) {
        return {
          bookingId: res.data.bookingId || res.data.id!,
          status: res.data.status || 'CONFIRMED',
        };
      }
      throw new Error('Fallback local booking');
    } catch {
      const provider = fallbackWorkers.find((w) => String(w.id) === String(data.workerId));
      const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      if (provider) {
        provider.flatsServed = (provider.flatsServed || 0) + 1;
      }

      const newBooking: HomeServiceBookingDto = {
        id: bookingId,
        workerId: data.workerId,
        providerName: data.providerName || provider?.name || 'Verified Service Provider',
        category: data.category,
        date: data.slotDate,
        timeSlot: data.timeSlot,
        status: 'CONFIRMED',
        phone: data.phone || provider?.phone || '+919876543210',
        issue: data.requirementsNotes?.trim() || `${data.category} service visit`,
        createdAt: new Date().toISOString(),
      };

      fallbackBookings = [newBooking, ...fallbackBookings];

      return { bookingId, status: 'CONFIRMED' };
    }
  },

  /**
   * GET /home-services/bookings/mine or /api/v1/home-services/bookings/mine
   */
  async getMyBookings(): Promise<HomeServiceBookingDto[]> {
    try {
      const res = await api.get('/home-services/bookings/mine');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.length > 0 ? list : fallbackBookings;
    } catch {
      return fallbackBookings;
    }
  },

  /**
   * PATCH /home-services/bookings/{id}/status
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    try {
      await api.patch(`/home-services/bookings/${bookingId}/status`, null, {
        params: { status: 'CANCELLED' },
      });
      return { success: true };
    } catch {
      const b = fallbackBookings.find((item) => item.id === bookingId);
      if (b) {
        b.status = 'CANCELLED';
      }
      return { success: true };
    }
  },
};
