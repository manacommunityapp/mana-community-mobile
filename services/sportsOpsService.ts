import apiClient from './apiClient';

export interface CourtSlotSubscription {
  id: number;
  communityId: number;
  userId: number;
  courtId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

export interface OpenPlaySession {
  id: number;
  communityId: number;
  sport: string;
  courtId: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  minPlayers: number;
  maxPlayers: number;
  skillLevel?: string;
  organizerId: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface SportsNoShowDeposit {
  id: number;
  communityId: number;
  userId: number;
  bookingId: number;
  amount: number;
  heldAt: string;
  released: boolean;
  releasedAt?: string;
  forfeited: boolean;
  forfeitedAt?: string;
  reason?: string;
}

export interface PlayerRating {
  id: number;
  ratedUserId: number;
  ratedBy: number;
  sport: string;
  rating: number;
  sportsmanship?: number;
  skillLevel?: number;
  comment?: string;
  createdAt: string;
}

export interface CoachPackage {
  id: number;
  communityId: number;
  coachId: number;
  sport: string;
  name: string;
  description?: string;
  sessions: number;
  durationMinutes: number;
  price: number;
  groupSize: number;
  active: boolean;
}

export interface CoachPackageEnrollment {
  id: number;
  packageId: number;
  userId: number;
  sessionsUsed: number;
  enrolledAt: string;
  active: boolean;
}

const BASE = '/api/sports-ops';

export const sportsOpsService = {
  mySubscriptions: () => apiClient.get<CourtSlotSubscription[]>(`${BASE}/subscriptions/my`).then(r => r.data),
  cancelSubscription: (id: number) => apiClient.put<CourtSlotSubscription>(`${BASE}/subscriptions/${id}/cancel`, {}).then(r => r.data),
  listOpenSessions: () => apiClient.get<OpenPlaySession[]>(`${BASE}/open-play`).then(r => r.data),
  joinSession: (sessionId: number) => apiClient.post(`${BASE}/open-play/${sessionId}/join`, {}).then(r => r.data),
  listDeposits: () => apiClient.get<SportsNoShowDeposit[]>(`${BASE}/deposits/my`).then(r => r.data),
  listAllRatings: () => apiClient.get<PlayerRating[]>(`${BASE}/ratings`).then(r => r.data),
  submitRating: (data: Partial<PlayerRating>) => apiClient.post<PlayerRating>(`${BASE}/ratings`, data).then(r => r.data),
  listPackages: () => apiClient.get<CoachPackage[]>(`${BASE}/coach-packages`).then(r => r.data),
  enrollPackage: (packageId: number) => apiClient.post<CoachPackageEnrollment>(`${BASE}/coach-packages/${packageId}/enroll`, {}).then(r => r.data),
  listEnrollments: () => apiClient.get<CoachPackageEnrollment[]>(`${BASE}/coach-packages/enrollments`).then(r => r.data),
};
