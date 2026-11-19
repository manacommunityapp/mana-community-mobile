import apiClient from './apiClient';

const BASE = '/api/home-services';

export interface HsWorker {
  id: number;
  name: string;
  phone?: string;
  rating?: number;
  totalJobs: number;
  isActive: boolean;
}

export interface HsServicePackage {
  id: number;
  name: string;
  category: string;
  durationMinutes: number;
  basePrice: number;
}

export interface HsBooking {
  id: number;
  category: string;
  bookingType: string;
  scheduledAt?: string;
  status: string;
  flatNumber?: string;
  description?: string;
  quotedPrice?: number;
  finalPrice?: number;
  createdAt: string;
}

export interface HsRecurringPlan {
  id: number;
  category: string;
  frequency: string;
  nextServiceDate: string;
  status: string;
}

export const homeServicesService = {
  listWorkers: (category?: string) =>
    apiClient.get<HsWorker[]>(`${BASE}/workers${category ? `?category=${category}` : ''}`).then(r => r.data),
  listPackages: (category?: string) =>
    apiClient.get<HsServicePackage[]>(`${BASE}/packages${category ? `?category=${category}` : ''}`).then(r => r.data),
  createBooking: (data: Partial<HsBooking>) =>
    apiClient.post<HsBooking>(`${BASE}/bookings`, data).then(r => r.data),
  myBookings: () =>
    apiClient.get<HsBooking[]>(`${BASE}/bookings/my`).then(r => r.data),
  cancelBooking: (id: number) =>
    apiClient.delete<HsBooking>(`${BASE}/bookings/${id}`).then(r => r.data),
  myPlans: () =>
    apiClient.get<HsRecurringPlan[]>(`${BASE}/plans/my`).then(r => r.data),
  createPlan: (data: Partial<HsRecurringPlan>) =>
    apiClient.post<HsRecurringPlan>(`${BASE}/plans`, data).then(r => r.data),
  pausePlan: (id: number) =>
    apiClient.put<HsRecurringPlan>(`${BASE}/plans/${id}/pause`, {}).then(r => r.data),
  cancelPlan: (id: number) =>
    apiClient.delete<HsRecurringPlan>(`${BASE}/plans/${id}`).then(r => r.data),
};
