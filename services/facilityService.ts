import api from './apiClient';
import { secureLog } from '@/security';

export interface FacilityDto {
  id: string;
  name: string;
  type: 'CLUBHOUSE' | 'TENNIS' | 'BADMINTON' | 'SWIMMING_POOL' | 'PARTY_HALL' | 'GYM' | string;
  capacity: number;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  hourlyRate: number;
  rules?: string;
  location?: string;
  imageUrl?: string;
}

export interface FacilityBookingRequest {
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount?: number;
  purpose?: string;
}

export interface FacilityBookingDto {
  id: string;
  facilityId: string;
  facilityName: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount?: number;
  totalAmount?: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'PENDING';
  bookingRef?: string;
  qrCode?: string;
  createdAt?: string;
}

function mapResourceToFacility(r: any): FacilityDto {
  let catType: string = 'CLUBHOUSE';
  const nameUpper = (r.name || '').toUpperCase();
  const catUpper = (r.categoryName || r.bookingType || '').toUpperCase();

  if (nameUpper.includes('GYM') || catUpper.includes('GYM')) catType = 'GYM';
  else if (nameUpper.includes('SWIM') || catUpper.includes('SWIM') || catUpper.includes('POOL')) catType = 'SWIMMING_POOL';
  else if (nameUpper.includes('BADMINTON') || catUpper.includes('BADMINTON')) catType = 'BADMINTON';
  else if (nameUpper.includes('TENNIS') || catUpper.includes('TENNIS')) catType = 'TENNIS';
  else if (nameUpper.includes('HALL') || catUpper.includes('HALL') || catUpper.includes('PARTY')) catType = 'PARTY_HALL';
  else if (catUpper) catType = catUpper;

  return {
    id: String(r.id),
    name: r.name || 'Community Amenity',
    type: catType,
    capacity: r.capacity || r.maxCapacity || 20,
    openTime: r.openTime || '06:00 AM',
    closeTime: r.closeTime || '10:00 PM',
    slotDurationMinutes: r.bookingDurationMinutes || 60,
    hourlyRate: typeof r.feePerHour === 'number' ? r.feePerHour : (typeof r.hourlyRate === 'number' ? r.hourlyRate : 0),
    rules: r.description || r.rules,
    location: r.location,
    imageUrl: r.primaryImageUrl,
  };
}

function mapBookingResponseToDto(b: any): FacilityBookingDto {
  return {
    id: String(b.id),
    facilityId: String(b.resourceId || b.facilityId || ''),
    facilityName: b.resourceName || b.facilityName || 'Community Facility',
    date: b.bookingDate || b.date || '',
    startTime: b.startTime || '06:00 AM',
    endTime: b.endTime || '07:00 AM',
    guestCount: b.numberOfGuests ?? b.guestCount ?? 1,
    totalAmount: typeof b.totalAmount === 'number' ? b.totalAmount : 0,
    status: (b.status === 'CANCELLED' || b.status === 'COMPLETED') ? b.status : 'CONFIRMED',
    bookingRef: b.bookingNumber || b.bookingRef || `FAC-${b.id}`,
    qrCode: b.qrCode,
    createdAt: b.createdAt,
  };
}

export const facilityService = {
  /**
   * GET /api/resource-booking/resources or /facilities
   */
  async getFacilities(): Promise<FacilityDto[]> {
    try {
      const res = await api.get('/api/resource-booking/resources');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapResourceToFacility);
    } catch (err) {
      secureLog.warn('[facilityService] /api/resource-booking/resources failed, trying /facilities alias', err);
      const res = await api.get('/facilities');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapResourceToFacility);
    }
  },

  /**
   * GET /api/resource-booking/resources/{id}/slots or /facilities/{id}/slots
   */
  async getAvailableSlots(facilityId: string, date: string): Promise<string[]> {
    try {
      const res = await api.get(`/api/resource-booking/resources/${facilityId}/slots`, {
        params: { date },
      });
      const data = res.data;
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && 'startTime' in data[0]) {
          return data
            .filter((s: any) => s.available !== false)
            .map((s: any) => `${s.startTime} - ${s.endTime}`);
        }
        return data as string[];
      }
      return [];
    } catch (err) {
      secureLog.warn('[facilityService] Primary slot query failed, checking alias', err);
      try {
        const res = await api.get<string[]>(`/facilities/${facilityId}/slots`, { params: { date } });
        return Array.isArray(res.data) ? res.data : [];
      } catch (aliasErr) {
        secureLog.error('[facilityService] Failed to load live slots', aliasErr);
        throw aliasErr;
      }
    }
  },

  /**
   * POST /api/resource-booking/bookings or /facilities/book
   */
  async bookSlot(data: FacilityBookingRequest): Promise<FacilityBookingDto> {
    try {
      const payload = {
        resourceId: isNaN(Number(data.facilityId)) ? data.facilityId : Number(data.facilityId),
        bookingDate: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        attendeeCount: data.guestCount || 1,
        numberOfGuests: data.guestCount || 1,
        purpose: data.purpose || 'Amenity Slot Reservation',
      };

      const res = await api.post('/api/resource-booking/bookings', payload);
      return mapBookingResponseToDto(res.data);
    } catch (err) {
      secureLog.warn('[facilityService] /api/resource-booking/bookings failed, trying /facilities/book alias', err);
      const res = await api.post('/facilities/book', data);
      return mapBookingResponseToDto(res.data);
    }
  },

  /**
   * GET /api/resource-booking/bookings/mine or /facilities/my-bookings
   */
  async getMyBookings(): Promise<FacilityBookingDto[]> {
    try {
      const res = await api.get('/api/resource-booking/bookings/mine');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapBookingResponseToDto);
    } catch (err) {
      secureLog.warn('[facilityService] /api/resource-booking/bookings/mine failed, trying /facilities/my-bookings', err);
      const res = await api.get('/facilities/my-bookings');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return list.map(mapBookingResponseToDto);
    }
  },

  /**
   * PUT /api/resource-booking/bookings/{id}/cancel
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      await api.put(`/api/resource-booking/bookings/${bookingId}/cancel`, {
        reason: reason || 'Cancelled by resident',
      });
      return { success: true };
    } catch (err) {
      secureLog.error(`[facilityService] Failed to cancel booking ${bookingId}`, err);
      throw err;
    }
  },
};
