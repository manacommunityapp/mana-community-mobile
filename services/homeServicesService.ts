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

const FALLBACK_WORKERS: HomeHelpWorkerDto[] = [
  {
    id: 'w-1',
    name: 'Ramesh Kumar',
    category: 'PLUMBING',
    phone: '+91 98451 23450',
    rating: 4.9,
    reviewCount: 88,
    priceRange: '₹250 - ₹800',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Pipe leakages, bathroom fittings, flush repair',
    experience: '12 yrs exp',
    flatsServed: 62,
    workingInTowers: 'Tower A, B, C, D',
    badge: 'TOP RATED',
  },
  {
    id: 'w-2',
    name: 'Suresh Electricals',
    category: 'ELECTRICAL',
    phone: '+91 98230 45671',
    rating: 4.8,
    reviewCount: 64,
    priceRange: '₹200 - ₹600',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'MCB tripping, fan installation, chandelier & switch wiring',
    experience: '9 yrs exp',
    flatsServed: 54,
    workingInTowers: 'All Towers',
    badge: 'VERIFIED EXPERT',
  },
  {
    id: 'w-3',
    name: 'Sunita Bai',
    category: 'CLEANING',
    phone: '+91 98112 34567',
    rating: 4.9,
    reviewCount: 112,
    priceRange: '₹350 - ₹1200',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Deep kitchen degreasing, bathroom scrubbing & balcony wash',
    experience: '7 yrs exp',
    flatsServed: 78,
    workingInTowers: 'All Towers',
    badge: 'RESIDENT CHOICE',
  },
  {
    id: 'w-4',
    name: 'QuickFix Appliances',
    category: 'APPLIANCE',
    phone: '+91 99001 23890',
    rating: 4.7,
    reviewCount: 53,
    priceRange: '₹400 - ₹1500',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'AC filter & gas top-up, washing machine & microwave repair',
    experience: '10 yrs exp',
    flatsServed: 45,
    workingInTowers: 'All Towers',
    badge: 'CERTIFIED',
  },
  {
    id: 'w-5',
    name: 'Mistry Woodworks',
    category: 'CARPENTRY',
    phone: '+91 98765 12098',
    rating: 4.8,
    reviewCount: 41,
    priceRange: '₹300 - ₹900',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Modular hinge fix, door latch alignment, furniture assembly',
    experience: '14 yrs exp',
    flatsServed: 39,
    workingInTowers: 'All Towers',
    badge: 'SKILLED MASTER',
  },
  {
    id: 'w-6',
    name: 'Rainbow Painters',
    category: 'PAINTING',
    phone: '+91 97654 32189',
    rating: 4.8,
    reviewCount: 38,
    priceRange: '₹500 - ₹2500',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Waterproof patch, wall touch-up & damp stain protection',
    experience: '11 yrs exp',
    flatsServed: 33,
    workingInTowers: 'Tower B, C, D',
    badge: 'QUALITY FINISH',
  },
  {
    id: 'w-7',
    name: 'Laxmi Maid & Cook',
    category: 'MAID',
    phone: '+91 98334 56781',
    rating: 4.9,
    reviewCount: 95,
    priceRange: '₹1500 - ₹4500/mo',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'North/South Indian cooking, dusting, floor mopping & utensil wash',
    experience: '8 yrs exp',
    flatsServed: 58,
    workingInTowers: 'Tower A & B',
    badge: 'HIGHLY RECOMMENDED',
    monthlyRate: 3500,
  },
  {
    id: 'w-8',
    name: 'PestShield India',
    category: 'PEST_CONTROL',
    phone: '+91 98450 99881',
    rating: 4.7,
    reviewCount: 49,
    priceRange: '₹600 - ₹1800',
    verified: true,
    available: true,
    statusText: 'Available Today',
    speciality: 'Cockroach gel treatment, termite spray & bedbug eradication',
    experience: '6 yrs exp',
    flatsServed: 42,
    workingInTowers: 'All Towers',
    badge: 'HERBAL SAFE',
  },
];

let LOCAL_BOOKINGS: HomeServiceBookingDto[] = [
  {
    id: 'BK-9041',
    workerId: 'w-1',
    providerName: 'Ramesh Kumar (Plumbing)',
    category: 'PLUMBING',
    date: '2026-10-04',
    timeSlot: '10:00 AM - 12:00 PM',
    status: 'CONFIRMED',
    phone: '+91 98451 23450',
    issue: 'Kitchen sink pipe joint leakage inspection & washer replacement',
    createdAt: '2026-09-29T11:20:00Z',
  },
];

const FALLBACK_CATEGORIES: HomeServiceCategoryDto[] = [
  { id: '1', name: 'Plumbing', code: 'PLUMBING', description: 'Taps, pipes, leakage repair', icon: 'water-outline' },
  { id: '2', name: 'Electrical', code: 'ELECTRICAL', description: 'Switches, wiring, fixtures', icon: 'flash-outline' },
  { id: '3', name: 'Cleaning', code: 'CLEANING', description: 'Deep home, sofa, balcony cleaning', icon: 'sparkles-outline' },
  { id: '4', name: 'Appliance', code: 'APPLIANCE', description: 'AC, fridge, washing machine', icon: 'tv-outline' },
  { id: '5', name: 'Carpentry', code: 'CARPENTRY', description: 'Door, latch, woodwork repairs', icon: 'hammer-outline' },
  { id: '6', name: 'Painting', code: 'PAINTING', description: 'Wall painting, waterproof touch-ups', icon: 'color-palette-outline' },
  { id: '7', name: 'Maid & Cook', code: 'MAID', description: 'Daily house help, cooking & dusting', icon: 'people-outline' },
  { id: '8', name: 'Pest Control', code: 'PEST_CONTROL', description: 'Cockroach, termite & bedbug control', icon: 'bug-outline' },
];

const FALLBACK_DOMESTIC_STAFF: DomesticStaffDto[] = [
  { id: 'ds-1', name: 'Laxmi Devi', role: 'MAID', phone: '+91 98334 56781', verified: true, policeVerified: true, aadhaarOnFile: true, rating: 4.9, reviewCount: 95, experience: '8 yrs', monthlySalary: 3500, workingFlats: ['A-1204', 'A-1205', 'B-302'], workingTowers: 'Tower A & B', shiftTime: '7:00 AM - 11:00 AM', joiningDate: '2022-03-15', status: 'ACTIVE' },
  { id: 'ds-2', name: 'Meena Kumari', role: 'COOK', phone: '+91 99001 78923', verified: true, policeVerified: true, aadhaarOnFile: true, rating: 4.8, reviewCount: 72, experience: '6 yrs', monthlySalary: 5000, workingFlats: ['A-1204', 'C-302'], workingTowers: 'Tower A & C', shiftTime: '6:30 AM - 9:30 AM', joiningDate: '2023-01-10', status: 'ACTIVE' },
  { id: 'ds-3', name: 'Raju Driver', role: 'DRIVER', phone: '+91 98765 44321', verified: true, policeVerified: true, aadhaarOnFile: true, rating: 4.7, reviewCount: 45, experience: '12 yrs', monthlySalary: 12000, workingFlats: ['A-1204'], workingTowers: 'Tower A', shiftTime: '8:00 AM - 8:00 PM', joiningDate: '2024-06-01', status: 'ACTIVE' },
  { id: 'ds-4', name: 'Priya Sharma', role: 'NANNY', phone: '+91 88990 11223', verified: true, policeVerified: true, aadhaarOnFile: true, rating: 4.9, reviewCount: 38, experience: '5 yrs', monthlySalary: 8000, workingFlats: ['B-302'], workingTowers: 'Tower B', shiftTime: '9:00 AM - 5:00 PM', joiningDate: '2025-02-14', status: 'ACTIVE' },
  { id: 'ds-5', name: 'Babu Gardener', role: 'GARDENER', phone: '+91 97654 33289', verified: true, policeVerified: false, aadhaarOnFile: true, rating: 4.6, reviewCount: 28, experience: '10 yrs', monthlySalary: 2500, workingFlats: ['A-1204', 'A-1205', 'C-302', 'B-101'], workingTowers: 'All Towers', shiftTime: '6:00 AM - 10:00 AM', joiningDate: '2021-08-20', status: 'ACTIVE' },
  { id: 'ds-6', name: 'Kamla Bai', role: 'MAID', phone: '+91 98112 55678', verified: true, policeVerified: true, aadhaarOnFile: true, rating: 4.8, reviewCount: 64, experience: '9 yrs', monthlySalary: 4000, workingFlats: ['C-302', 'C-303'], workingTowers: 'Tower C', shiftTime: '2:00 PM - 6:00 PM', joiningDate: '2023-07-01', status: 'ON_LEAVE' },
];

const FALLBACK_ATTENDANCE: StaffAttendanceDto[] = [
  { id: 'att-1', staffId: 'ds-1', staffName: 'Laxmi Devi', role: 'MAID', date: '2026-10-02', checkInTime: '7:05 AM', checkInGate: 'Main Gate', status: 'CHECKED_IN', markedBy: 'Guard Suresh' },
  { id: 'att-2', staffId: 'ds-2', staffName: 'Meena Kumari', role: 'COOK', date: '2026-10-02', checkInTime: '6:32 AM', checkInGate: 'Main Gate', checkOutTime: '9:45 AM', checkOutGate: 'Side Gate', status: 'CHECKED_OUT', markedBy: 'Guard Suresh' },
  { id: 'att-3', staffId: 'ds-3', staffName: 'Raju Driver', role: 'DRIVER', date: '2026-10-02', checkInTime: '7:55 AM', checkInGate: 'Basement', status: 'CHECKED_IN', markedBy: 'ANPR' },
  { id: 'att-4', staffId: 'ds-4', staffName: 'Priya Sharma', role: 'NANNY', date: '2026-10-02', status: 'NOT_MARKED' },
  { id: 'att-5', staffId: 'ds-5', staffName: 'Babu Gardener', role: 'GARDENER', date: '2026-10-02', checkInTime: '6:10 AM', checkInGate: 'Service Gate', status: 'CHECKED_IN', markedBy: 'Guard Ram' },
  { id: 'att-6', staffId: 'ds-6', staffName: 'Kamla Bai', role: 'MAID', date: '2026-10-02', status: 'ON_LEAVE' },
];

const FALLBACK_ATTENDANCE_SUMMARY: StaffAttendanceSummary = {
  totalStaff: 6, checkedIn: 3, checkedOut: 1, absent: 0, onLeave: 1, notMarked: 1,
};

const FALLBACK_PACKAGES: ServicePackageDto[] = [
  { id: 'pkg-1', staffId: 'ds-1', staffName: 'Laxmi Devi', role: 'MAID', flatNumber: 'A-1204', packageType: 'MONTHLY', services: ['Sweeping', 'Mopping', 'Utensils', 'Dusting'], monthlySalary: 3500, lastPaidDate: '2026-09-01', nextDueDate: '2026-10-01', paymentStatus: 'OVERDUE', startDate: '2022-03-15' },
  { id: 'pkg-2', staffId: 'ds-2', staffName: 'Meena Kumari', role: 'COOK', flatNumber: 'A-1204', packageType: 'MONTHLY', services: ['Breakfast', 'Lunch Prep', 'Dinner'], monthlySalary: 5000, lastPaidDate: '2026-09-05', nextDueDate: '2026-10-05', paymentStatus: 'DUE', startDate: '2023-01-10' },
  { id: 'pkg-3', staffId: 'ds-3', staffName: 'Raju Driver', role: 'DRIVER', flatNumber: 'A-1204', packageType: 'MONTHLY', services: ['School Drop', 'Office Commute', 'Errands'], monthlySalary: 12000, lastPaidDate: '2026-09-01', nextDueDate: '2026-10-01', paymentStatus: 'OVERDUE', startDate: '2024-06-01' },
  { id: 'pkg-4', staffId: 'ds-5', staffName: 'Babu Gardener', role: 'GARDENER', flatNumber: 'A-1204', packageType: 'MONTHLY', services: ['Lawn', 'Plant Watering', 'Pruning'], monthlySalary: 2500, lastPaidDate: '2026-09-15', nextDueDate: '2026-10-15', paymentStatus: 'PAID', startDate: '2021-08-20' },
];

const FALLBACK_JOB_POSTS: StaffJobPostDto[] = [
  { id: 'job-1', title: 'Full-time Maid Needed', role: 'MAID', description: 'Looking for experienced maid for 3BHK apartment. Daily sweeping, mopping, utensils, and laundry folding.', requirements: ['Hindi speaking', '3+ years experience', 'Police verified'], salaryRange: '₹3,500 - ₹4,500/mo', shiftPreference: 'Morning (7 AM - 11 AM)', tower: 'Tower B', flatNumber: 'B-501', postedBy: 'Arun Mehta', postedAt: '2026-09-28', status: 'OPEN', applicantCount: 3 },
  { id: 'job-2', title: 'Part-time Cook (Dinner Only)', role: 'COOK', description: 'Need a cook for dinner preparation. North Indian cuisine preferred. Family of 4.', requirements: ['North Indian cooking', 'Hygiene conscious'], salaryRange: '₹3,000 - ₹4,000/mo', shiftPreference: 'Evening (5 PM - 8 PM)', tower: 'Tower A', flatNumber: 'A-803', postedBy: 'Sunita Roy', postedAt: '2026-09-30', status: 'OPEN', applicantCount: 1 },
  { id: 'job-3', title: 'Experienced Nanny for Toddler', role: 'NANNY', description: 'Nanny needed for 2-year-old. Must be caring, patient, and have first-aid knowledge.', requirements: ['First aid certified', '2+ years with toddlers', 'English speaking'], salaryRange: '₹8,000 - ₹10,000/mo', shiftPreference: 'Full Day (9 AM - 6 PM)', tower: 'Tower C', flatNumber: 'C-402', postedBy: 'Prateek Sharma', postedAt: '2026-10-01', status: 'OPEN', applicantCount: 5 },
  { id: 'job-4', title: 'Driver for School & Office', role: 'DRIVER', description: 'Need reliable driver with own two-wheeler for school pickup/drop and occasional office commute.', requirements: ['Valid license', 'Know city routes', '5+ years driving'], salaryRange: '₹10,000 - ₹14,000/mo', shiftPreference: 'Split Shift', flatNumber: 'A-1204', postedBy: 'Resident', postedAt: '2026-09-25', status: 'FILLED', applicantCount: 8 },
];

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
