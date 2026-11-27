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

  packageId?: string;

  date: string;

  timeSlot: string;

  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  phone: string;

  issue: string;

  slaHours?: number;

  slaDueAt?: string;

  slaBreached?: boolean;

  completionOtp?: string;

  completedAt?: string;

  paymentStatus?: string;

  paymentTransactionId?: string;

  paidAt?: string;

  createdAt?: string;

  vehicleNumber?: string;

  beforePhotoUrl?: string;

  afterPhotoUrl?: string;

  rating?: number;

  reviewComment?: string;

}



export interface HomeServiceBookingRequest {

  workerId: string | number;

  providerName?: string;

  phone?: string;

  category: string;

  packageId?: string;

  slotDate: string;

  timeSlot: string;

  slaHours?: number;

  requirementsNotes?: string;

}



// ── Domestic Staff Types ────────────────────────────────────────



export type StaffRole = 'MAID' | 'COOK' | 'DRIVER' | 'NANNY' | 'GARDENER' | 'WATCHMAN' | 'HELPER';

export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'ON_LEAVE' | 'NOT_MARKED';



export interface DomesticStaffDto {

  id: string;

  name: string;

  role: StaffRole;

  phone: string;

  photo?: string;

  verified: boolean;

  policeVerified: boolean;

  aadhaarOnFile: boolean;

  rating: number;

  reviewCount: number;

  experience: string;

  monthlySalary: number;

  workingFlats: string[];

  workingTowers: string;

  shiftTime: string;

  joiningDate: string;

  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

}



export interface StaffAttendanceDto {

  id: string;

  staffId: string;

  staffName: string;

  role: StaffRole;

  date: string;

  checkInTime?: string;

  checkInGate?: string;

  checkOutTime?: string;

  checkOutGate?: string;

  status: AttendanceStatus;

  markedBy?: string;

  photoUrl?: string;

}



export interface StaffAttendanceSummary {

  totalStaff: number;

  checkedIn: number;

  checkedOut: number;

  absent: number;

  onLeave: number;

  notMarked: number;

}



export interface StaffMonthlyAttendanceDto {

  staffId: string;

  staffName: string;

  month: number;

  year: number;

  days: { day: number; status: AttendanceStatus; checkInTime?: string; checkOutTime?: string }[];

  summary: { present: number; absent: number; onLeave: number; notMarked: number };

}



export interface ServicePackageDto {

  id: string;

  staffId: string;

  staffName: string;

  role: StaffRole;

  flatNumber: string;

  packageType: 'MONTHLY' | 'WEEKLY' | 'DAILY';

  services: string[];

  monthlySalary: number;

  lastPaidDate?: string;

  nextDueDate: string;

  paymentStatus: 'PAID' | 'DUE' | 'OVERDUE';

  startDate: string;

  endDate?: string;

}



export interface StaffJobPostDto {

  id: string;

  title: string;

  role: StaffRole;

  description: string;

  requirements: string[];

  salaryRange: string;

  shiftPreference: string;

  tower?: string;

  flatNumber: string;

  postedBy: string;

  postedAt: string;

  status: 'OPEN' | 'FILLED' | 'CLOSED';

  applicantCount: number;

}



export interface CreateJobPostRequest {

  title: string;

  role: StaffRole;

  description: string;

  requirements?: string[];

  salaryRange: string;

  shiftPreference: string;

}



export interface BookWorkerRequest {

  workerId?: number;

  category: string;

  issue?: string;

  scheduledAt?: string;

  timeSlot?: string;

  flatNumber?: string;

  providerName?: string;

  slotDate?: string;

  requirementsNotes?: string;

}




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

function mapWorkerEntityToDto(w: any): HomeHelpWorkerDto {

  return {

    id: w.id,

    name: w.displayName || w.name || 'Verified Service Provider',

    category: (w.category || w.skills?.[0]?.categoryId || 'PLUMBING').toUpperCase(),

    phone: w.primaryPhone || w.phone || '+919876543210',

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

    packageId: b.packageId,

    date: b.startDate ? String(b.startDate) : 'Scheduled Date',

    timeSlot: b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : 'Scheduled Time',

    status: (b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'IN_PROGRESS')

      ? b.status

      : 'CONFIRMED',

    phone: b.phone || '+919876543210',

    issue: b.notes || `${b.categoryId || 'Home'} Service Visit`,

    slaHours: b.slaHours,

    slaDueAt: b.slaDueAt,

    slaBreached: b.slaBreached,

    completionOtp: b.completionOtp,

    completedAt: b.completedAt,

    paymentStatus: b.paymentStatus || 'PENDING',

    paymentTransactionId: b.paymentTransactionId,

    paidAt: b.paidAt,

    createdAt: b.createdAt,

  };

}



export const homeServicesService = {

  /**

   * GET /v1/home-services/workers with hybrid fallback

   */

  async getWorkers(category?: string): Promise<HomeHelpWorkerDto[]> {
    const res = await api.get('/v1/home-services/workers', { params: category && category !== 'ALL' ? { category } : undefined });
    const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    return list.map(mapWorkerEntityToDto);
  },



  /**

   * POST /v1/home-services/bookings with hybrid fallback

   */

  async bookWorker(data: HomeServiceBookingRequest): Promise<{ bookingId: string; status: string }> {
    const res = await api.post<{ id?: string; bookingId?: string; status?: string }>('/v1/home-services/bookings', {
      workerId: String(data.workerId), categoryId: data.category, packageId: data.packageId,
      notes: data.requirementsNotes || `${data.category} request`, timeSlot: data.timeSlot, slaHours: data.slaHours || 24,
    });
    const bookingId = res.data?.bookingId || res.data?.id;
    const status = res.data?.status;
    if (!bookingId || !status) throw new Error('Booking response is incomplete; booking status is unconfirmed.');
    return { bookingId, status };
  },



  /**

   * GET /v1/home-services/bookings/mine with hybrid fallback

   */

  async getMyBookings(): Promise<HomeServiceBookingDto[]> {
    const res = await api.get('/v1/home-services/bookings/mine');
    const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    return list.map(mapBookingEntityToDto);
  },



  /**

   * GET /v1/home-services/categories with hybrid fallback

   */

  async getCategories(): Promise<HomeServiceCategoryDto[]> {
    const res = await api.get('/v1/home-services/categories');
    const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    return list.map((c: any) => ({ id: String(c.id), name: c.name, code: (c.code || c.name || '').toUpperCase(), description: c.description, icon: c.icon }));
  },



  /**

   * PATCH /v1/home-services/bookings/{id}/status with hybrid fallback

   */

  // ── Domestic Staff Directory ────────────────────────────────────

  async getDomesticStaff(role?: StaffRole): Promise<DomesticStaffDto[]> {
    const res = await api.get<DomesticStaffDto[]>('/v1/home-services/domestic-staff', { params: role ? { role } : {} });
    return Array.isArray(res.data) ? res.data : [];
  },



  // ── Staff Attendance ──────────────────────────────────────────

  async getStaffAttendance(date?: string): Promise<StaffAttendanceDto[]> {
    const res = await api.get<StaffAttendanceDto[]>('/v1/home-services/attendance', { params: date ? { date } : {} });
    return Array.isArray(res.data) ? res.data : [];
  },



  async getStaffMonthlyAttendance(staffId: string, year: number, month: number): Promise<StaffMonthlyAttendanceDto> {
    const res = await api.get<StaffMonthlyAttendanceDto>(`/v1/home-services/attendance/monthly/${encodeURIComponent(staffId)}`, { params: { year, month } });
    return res.data;
  },



  async getAttendanceSummary(): Promise<StaffAttendanceSummary> {
    const res = await api.get<StaffAttendanceSummary>('/v1/home-services/attendance/summary');
    return res.data;
  },



  // ── Service Packages & Salary ─────────────────────────────────

  async getServicePackages(): Promise<ServicePackageDto[]> {
    const res = await api.get<ServicePackageDto[]>('/v1/home-services/packages');
    return Array.isArray(res.data) ? res.data : [];
  },



  // ── Job Requirements Board ────────────────────────────────────

  async getJobPosts(): Promise<StaffJobPostDto[]> {
    const res = await api.get<StaffJobPostDto[]>('/v1/home-services/jobs');
    return Array.isArray(res.data) ? res.data : [];
  },



  async createJobPost(data: CreateJobPostRequest): Promise<StaffJobPostDto> {
    const res = await api.post<StaffJobPostDto>('/v1/home-services/jobs', data);
    return res.data;
  },



  async cancelBooking(bookingId: string | number): Promise<{ success: boolean }> {
    await api.patch(`/v1/home-services/bookings/${encodeURIComponent(String(bookingId))}/status`, null, { params: { status: 'CANCELLED' } });
    return { success: true };
  },



  async completeBookingWithOtp(bookingId: string, otp: string): Promise<HomeServiceBookingDto> {
    const res = await api.post<HomeServiceBookingDto>(`/v1/home-services/bookings/${encodeURIComponent(bookingId)}/complete-otp`, null, { params: { otp } });
    if (!res.data) throw new Error('Booking completion was not confirmed by the server.');
    return mapBookingEntityToDto(res.data);
  },



  async payBooking(bookingId: string, transactionId?: string): Promise<HomeServiceBookingDto> {
    if (!transactionId) throw new Error('A confirmed payment transaction ID is required.');
    const res = await api.post<HomeServiceBookingDto>(`/v1/home-services/bookings/${encodeURIComponent(bookingId)}/pay`, null, { params: { transactionId } });
    if (!res.data) throw new Error('Payment status was not confirmed by the server.');
    return mapBookingEntityToDto(res.data);
  },



  async updateWorkerVerification(workerId: string, verificationStatus: string): Promise<boolean> {
    const res = await api.patch<{ success: boolean }>(`/v1/home-services/workers/${encodeURIComponent(workerId)}/verification`, null, { params: { status: verificationStatus } });
    return res.data?.success === true;
  },



  async completeJobWithProof(_bookingId: string, _params: { otp: string; beforePhotoUrl?: string; afterPhotoUrl?: string }): Promise<HomeServiceBookingDto> {
    throw new Error('Job completion with photo proof is not available from the server yet.');
  },



  async rateBooking(_bookingId: string, _rating: number, _comment?: string): Promise<HomeServiceBookingDto> {
    throw new Error('Booking ratings are not available from the server yet.');
  },



  async getGatePassForStaff(_staffId: string): Promise<never> {
    throw new Error('Staff gate passes must be issued by the server.');
  },


  listWorkers: (category?: string) =>
    api.get<HsWorker[]>(`/api/home-services/workers${category ? `?category=${category}` : ''}`).then(r => r.data),
  listPackages: (category?: string) =>
    api.get<HsServicePackage[]>(`/api/home-services/packages${category ? `?category=${category}` : ''}`).then(r => r.data),
  createBooking: (data: Partial<HsBooking>) =>
    api.post<HsBooking>(`/api/home-services/bookings`, data).then(r => r.data),
  myBookings: () =>
    api.get<HsBooking[]>(`/api/home-services/bookings/my`).then(r => r.data),
  myPlans: () =>
    api.get<HsRecurringPlan[]>(`/api/home-services/plans/my`).then(r => r.data),
  createPlan: (data: Partial<HsRecurringPlan>) =>
    api.post<HsRecurringPlan>(`/api/home-services/plans`, data).then(r => r.data),
  pausePlan: (id: number) =>
    api.put<HsRecurringPlan>(`/api/home-services/plans/${id}/pause`, {}).then(r => r.data),
  cancelPlan: (id: number) =>
    api.delete<HsRecurringPlan>(`/api/home-services/plans/${id}`).then(r => r.data),
  upsertMorningOverride: (planId: number, deliveryDate: string, overrideQty: number, paused = false) =>
    api.put<any>(`/api/home-services/plans/${planId}/override`, { deliveryDate, overrideQty, paused }).then(r => r.data),
  quoteDynamicSlot: (payload: { basePrice: number; isWeekend: boolean; zoneUtilizationPct: number; sameCommunityCluster: boolean }) =>
    api.post<any>('/api/home-services/bookings/quote-dynamic', payload).then(r => r.data),
  holdSlot: (slotId: number, holdToken: string) =>
    api.post<any>(`/api/home-services/bookings/slots/${slotId}/hold`, { holdToken }).then(r => r.data),
  confirmHeldSlot: (slotId: number, payload: { holdToken: string; flatNumber: string; category: string; quotedPrice: number }) =>
    api.post<any>(`/api/home-services/bookings/slots/${slotId}/confirm`, payload).then(r => r.data),
  initiateSplitOrder: (payload: {
    orderRef: string;
    bookingId?: number;
    vendorId: number;
    grossAmount: number;
    pointsUsed: number;
    couponCode?: string;
    couponDiscount: number;
    upiAmount: number;
  }) => api.post<any>('/api/home-services/payouts/multi-tender/initiate', payload).then(r => r.data),
};
