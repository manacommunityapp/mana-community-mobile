import api from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SportsTrainerDto {
  id: number;
  communityId: number;
  userId: number;
  fullName: string;
  email?: string;
  phone?: string;
  sport: string;
  certBody?: string;
  certNumber?: string;
  certYear?: number;
  ageGroupsCoached?: string;
  bio?: string;
  experienceYears?: number;
  profilePicUrl?: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  approvedAt?: string;
  createdAt?: string;
}

export interface TrainerSlotDto {
  id: number;
  trainerId: number;
  trainerName: string;
  sport: string;
  slotDate: string;       // ISO date "2026-11-01"
  startTime: string;      // "07:00:00"
  endTime: string;        // "08:00:00"
  durationMinutes: number;
  slotType: 'INDIVIDUAL' | 'GROUP';
  maxCapacity: number;
  bookedCount: number;
  venueId?: number;
  venueName?: string;
  price: number;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
}

export interface TrainerSlotBookingDto {
  id: number;
  slotId: number;
  trainerId: number;
  userId: number;
  userName: string;
  tower?: string;
  flatNumber?: string;
  status: 'CONFIRMED' | 'CANCELLED';
  amountPaid: number;
  bookedAt?: string;
  slot?: TrainerSlotDto;
}

export interface ApplyAsTrainerRequest {
  fullName: string;
  email?: string;
  phone?: string;
  sport: string;
  certBody?: string;
  certNumber?: string;
  certYear?: number;
  ageGroupsCoached?: string;
  bio: string;
  experienceYears?: number;
}

export interface BookSlotRequest {
  userName: string;
  tower?: string;
  flatNumber?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const sportsTrainerService = {

  async listApproved(communityId: number): Promise<SportsTrainerDto[]> {
    const res = await api.get<SportsTrainerDto[]>('/sports/trainers', {
      params: { communityId },
    });
    return res.data;
  },

  async applyAsTrainer(communityId: number, data: ApplyAsTrainerRequest): Promise<SportsTrainerDto> {
    const res = await api.post<SportsTrainerDto>('/sports/trainers/apply', data, {
      params: { communityId },
    });
    return res.data;
  },

  async getSlots(trainerId: number): Promise<TrainerSlotDto[]> {
    const res = await api.get<TrainerSlotDto[]>(`/sports/trainers/${trainerId}/slots`);
    return res.data;
  },

  async bookSlot(slotId: number, data: BookSlotRequest): Promise<TrainerSlotBookingDto> {
    const res = await api.post<TrainerSlotBookingDto>(`/sports/trainer-slots/${slotId}/book`, data);
    return res.data;
  },

  async cancelBooking(bookingId: number): Promise<TrainerSlotBookingDto> {
    const res = await api.post<TrainerSlotBookingDto>(`/sports/trainer-bookings/${bookingId}/cancel`);
    return res.data;
  },

  async myBookings(communityId: number): Promise<TrainerSlotBookingDto[]> {
    const res = await api.get<TrainerSlotBookingDto[]>('/sports/trainer-bookings/my', {
      params: { communityId },
    });
    return res.data;
  },
};
