import api from './apiClient';

// ── DTOs ──────────────────────────────────────────────────────────

export type InstaServiceType = 'CLEANING' | 'COOKING' | 'MAID' | 'IRONING' | 'LAUNDRY' | 'BABYSITTING';
export type InstaHelpDuration = 'ONE_HOUR' | 'TWO_HOURS' | 'FOUR_HOURS' | 'FULL_DAY';
export type InstaHelpStatus = 'PENDING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InstaHelpRequest {
  serviceType: InstaServiceType;
  subtask?: string;
  duration: InstaHelpDuration;
  notes?: string;
}

export interface InstaHelpResponse {
  id: number;
  bookingRef: string;
  serviceType: string;
  subtask?: string;
  duration: string;
  priceAmount: number;
  notes?: string;
  status: InstaHelpStatus;
  closureOtp?: string;
  helperName?: string;
  helperRating?: number;
  helperEtaMinutes?: number;
  helperDistanceLabel?: string;
  residentRating?: number;
  residentFeedback?: string;
  bookedAt: string;
  matchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface RateRequest {
  rating: number;
  feedback?: string;
}

// ── Duration label → API enum mapping ────────────────────────────

const DURATION_MAP: Record<string, InstaHelpDuration> = {
  '1h':       'ONE_HOUR',
  '2h':       'TWO_HOURS',
  '4h':       'FOUR_HOURS',
  'FULL_DAY': 'FULL_DAY',
};

export function toApiDuration(uiValue: string): InstaHelpDuration {
  return DURATION_MAP[uiValue] ?? 'TWO_HOURS';
}

// ── Service ──────────────────────────────────────────────────────

export const instaHelpService = {
  async createBooking(request: InstaHelpRequest): Promise<InstaHelpResponse> {
    try {
      const res = await api.post('/api/v1/insta-help/bookings', request);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    }
  },

  async getMyBookings(): Promise<InstaHelpResponse[]> {
    try {
      const res = await api.get('/api/v1/insta-help/bookings/my');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async startSession(bookingRef: string): Promise<InstaHelpResponse> {
    try {
      const res = await api.put(`/api/v1/insta-help/bookings/${bookingRef}/start`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to start session.');
    }
  },

  async completeSession(bookingRef: string): Promise<InstaHelpResponse> {
    try {
      const res = await api.put(`/api/v1/insta-help/bookings/${bookingRef}/complete`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to complete session.');
    }
  },

  async cancelBooking(bookingRef: string): Promise<InstaHelpResponse> {
    try {
      const res = await api.put(`/api/v1/insta-help/bookings/${bookingRef}/cancel`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel booking.');
    }
  },

  async rateBooking(bookingRef: string, req: RateRequest): Promise<InstaHelpResponse> {
    try {
      const res = await api.put(`/api/v1/insta-help/bookings/${bookingRef}/rate`, req);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to submit rating. Please try again.');
    }
  },
};
