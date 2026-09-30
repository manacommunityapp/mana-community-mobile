import api from './apiClient';
import { secureLog } from '@/security';

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

export interface HomeServiceCategoryDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
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

function mapWorkerEntityToDto(w: any): HomeHelpWorkerDto {
  return {
    id: w.id,
    name: w.displayName || w.name || 'Verified Service Provider',
    category: (w.category || w.skills?.[0]?.categoryId || 'PLUMBING').toUpperCase(),
    phone: w.primaryPhone || w.phone || '',
    rating: typeof w.rating === 'number' ? w.rating : 4.8,
    reviewCount: w.totalReviews ?? w.reviewCount ?? 25,
    priceRange: w.priceRange || '₹200 - ₹800',
    verified: w.verificationStatus === 'VERIFIED' || w.policeVerified === true || w.verified === true,
    available: w.active ?? w.available ?? true,
    statusText: w.statusText || (w.active ? 'Available Today' : 'Busy'),
    speciality: w.speciality || (w.experienceYears ? `${w.experienceYears} yrs experience` : undefined),
    experience: w.experienceYears ? `${w.experienceYears} yrs exp` : undefined,
    flatsServed: w.flatsServed ?? 40,
    workingInTowers: w.workingInTowers || 'All Towers',
    badge: w.badge || ((w.rating >= 4.8) ? 'TOP RATED' : undefined),
    avatarUrl: w.profilePhotoUrl,
  };
}

function mapBookingEntityToDto(b: any): HomeServiceBookingDto {
  return {
    id: String(b.id),
    workerId: b.workerId,
    providerName: b.providerName || b.workerName || 'Service Specialist',
    category: (b.categoryId || 'GENERAL').toUpperCase(),
    date: b.startDate ? String(b.startDate) : 'Scheduled Date',
    timeSlot: b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : 'Scheduled Time',
    status: (b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'IN_PROGRESS')
      ? b.status
      : 'CONFIRMED',
    phone: b.phone || '+919876543210',
    issue: b.notes || `${b.categoryId || 'Home'} Service Visit`,
    createdAt: b.createdAt,
  };
}

export const homeServicesService = {
  /**
   * GET /api/v1/home-services/workers
   */
  async getWorkers(category?: string): Promise<HomeHelpWorkerDto[]> {
    try {
      const res = await api.get('/v1/home-services/workers', {
        params: category && category !== 'ALL' ? { category } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapWorkerEntityToDto);
    } catch (err) {
      secureLog.error('[homeServicesService] Failed to load workers', err);
      return [];
    }
  },

  /**
   * POST /api/v1/home-services/bookings
   */
  async bookWorker(data: HomeServiceBookingRequest): Promise<{ bookingId: string; status: string }> {
    try {
      const payload = {
        workerId: String(data.workerId),
        categoryId: data.category,
        notes: data.requirementsNotes || `${data.category} request`,
        timeSlot: data.timeSlot,
      };

      const res = await api.post<{ id?: string; bookingId?: string; status?: string }>(
        '/v1/home-services/bookings',
        payload,
      );

      const bookingId = res.data?.bookingId || res.data?.id || `BK-${Date.now().toString().slice(-4)}`;
      const status = res.data?.status || 'CONFIRMED';
      return { bookingId, status };
    } catch (err) {
      secureLog.error('[homeServicesService] Failed to create booking', err);
      throw err;
    }
  },

  /**
   * GET /api/v1/home-services/bookings/mine
   */
  async getMyBookings(): Promise<HomeServiceBookingDto[]> {
    try {
      const res = await api.get('/v1/home-services/bookings/mine');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapBookingEntityToDto);
    } catch (err) {
      secureLog.error('[homeServicesService] Failed to load bookings', err);
      return [];
    }
  },

  /**
   * GET /api/v1/home-services/categories
   */
  async getCategories(): Promise<HomeServiceCategoryDto[]> {
    try {
      const res = await api.get('/v1/home-services/categories');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        code: (c.code || c.name || '').toUpperCase(),
        description: c.description,
        icon: c.icon,
      }));
    } catch (err) {
      secureLog.error('[homeServicesService] Failed to load categories', err);
      return [];
    }
  },

  /**
   * PATCH /api/v1/home-services/bookings/{id}/status
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    try {
      await api.patch(`/v1/home-services/bookings/${bookingId}/status`, null, {
        params: { status: 'CANCELLED' },
      });
      return { success: true };
    } catch (err) {
      secureLog.error(`[homeServicesService] Failed to cancel booking ${bookingId}`, err);
      throw err;
    }
  },
};


