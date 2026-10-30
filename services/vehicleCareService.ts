import { apiClient } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VehicleType = 'CAR' | 'BIKE' | 'SUV' | 'TRUCK';
export type ServiceType = 'EXTERIOR_WASH' | 'FULL_WASH' | 'DEEP_CLEAN' | 'PREMIUM_DETAIL' | 'STEAM_CLEAN' | 'INTERIOR_CLEAN';
export type BookingStatus =
  | 'DRAFT' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'ASSIGNED'
  | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
  | 'CANCELLED' | 'PAYMENT_FAILED' | 'NO_SHOW' | 'DISPUTED'
  | 'REFUND_PENDING' | 'REFUNDED';
export type PlanFrequency = 'WEEKLY' | 'MONTHLY';
export type PlanStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export interface VehicleProfile {
  id: string;
  nickname: string;
  type: VehicleType;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  isDefault: boolean;
  imageEmoji: string;
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMins: number;
}

export interface ServiceCatalogItem {
  id: string;
  serviceType: ServiceType;
  name: string;
  description: string;
  emoji: string;
  basePrice: number;
  communityPrice: number;
  durationMins: number;
  vehicleTypes: VehicleType[];
  addons: ServiceAddon[];
  popular: boolean;
  gradientColors: [string, string];
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  remaining: number;
}

export interface VehicleCareBooking {
  id: string;
  bookingNumber: string;
  vehicleId: string;
  vehicleDisplay: string;
  serviceId: string;
  serviceName: string;
  serviceEmoji: string;
  addonIds: string[];
  addonNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: BookingStatus;
  quotedPrice: number;
  paidAmount: number;
  technicianName?: string;
  technicianPhone?: string;
  eta?: string;
  completedAt?: string;
  rating?: number;
  reviewText?: string;
  canCancel: boolean;
  canRate: boolean;
  createdAt: string;
}

export interface WashPlan {
  id: string;
  name: string;
  frequency: PlanFrequency;
  servicesIncluded: ServiceType[];
  creditsTotal: number;
  creditsUsed: number;
  price: number;
  nextRenewalDate: string;
  nextServiceDate?: string;
  status: PlanStatus;
  vehicleId: string;
  vehicleDisplay: string;
}

export interface WashPlanCatalog {
  id: string;
  name: string;
  frequency: PlanFrequency;
  serviceType: ServiceType;
  creditsPerCycle: number;
  price: number;
  savingsPercent: number;
  emoji: string;
  popular: boolean;
}

export interface VendorJob {
  id: string;
  bookingNumber: string;
  residentName: string;
  address: string;
  vehicleDisplay: string;
  serviceName: string;
  addonNames: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  amount: number;
  technicianName?: string;
  checklistCompleted?: boolean;
}

export interface CreateBookingRequest {
  vehicleId: string;
  serviceId: string;
  addonIds: string[];
  slotId: string;
  location: string;
  paymentMethod?: 'UPI' | 'CARD' | 'CASH';
}

export interface SubscribePlanRequest {
  planCatalogId: string;
  vehicleId: string;
  paymentMethod: 'UPI' | 'CARD';
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_VEHICLES: VehicleProfile[] = [
  {
    id: 'v1', nickname: 'My Swift', type: 'CAR', make: 'Maruti', model: 'Swift', color: 'Red',
    plateNumber: 'TS 09 AB 1234', isDefault: true, imageEmoji: '🚗',
  },
  {
    id: 'v2', nickname: 'Activa', type: 'BIKE', make: 'Honda', model: 'Activa 6G', color: 'Silver',
    plateNumber: 'TS 09 CD 5678', isDefault: false, imageEmoji: '🛵',
  },
];

const EXTERIOR_ADDONS: ServiceAddon[] = [
  { id: 'a1', name: 'Tyre Shine', description: 'Polish and protect all 4 tyres', price: 50, durationMins: 10 },
  { id: 'a2', name: 'Wax Coat', description: 'Protective wax layer after wash', price: 150, durationMins: 20 },
  { id: 'a3', name: 'Dashboard Wipe', description: 'Quick interior dashboard dust removal', price: 80, durationMins: 10 },
];

const INTERIOR_ADDONS: ServiceAddon[] = [
  { id: 'a4', name: 'Seat Vacuuming', description: 'Deep vacuum all seat covers', price: 120, durationMins: 15 },
  { id: 'a5', name: 'Air Freshener', description: 'Long-lasting cabin fragrance', price: 60, durationMins: 5 },
];

export const MOCK_CATALOG: ServiceCatalogItem[] = [
  {
    id: 's1', serviceType: 'EXTERIOR_WASH', name: 'Exterior Wash', emoji: '💧',
    description: 'Quick exterior body wash and rinse. Removes dust, bird droppings, and surface grime.',
    basePrice: 199, communityPrice: 149, durationMins: 30,
    vehicleTypes: ['CAR', 'SUV', 'BIKE'],
    addons: EXTERIOR_ADDONS,
    popular: true,
    gradientColors: ['#0284C7', '#38BDF8'],
  },
  {
    id: 's2', serviceType: 'FULL_WASH', name: 'Full Car Wash', emoji: '🚿',
    description: 'Complete exterior + basic interior cleaning. Seats wiped, mats removed and cleaned.',
    basePrice: 399, communityPrice: 299, durationMins: 60,
    vehicleTypes: ['CAR', 'SUV'],
    addons: [...EXTERIOR_ADDONS, ...INTERIOR_ADDONS],
    popular: true,
    gradientColors: ['#4F46E5', '#818CF8'],
  },
  {
    id: 's3', serviceType: 'DEEP_CLEAN', name: 'Interior Deep Clean', emoji: '✨',
    description: 'Full interior detailing: carpets, seats, dashboard, cabin steam cleaning.',
    basePrice: 799, communityPrice: 649, durationMins: 120,
    vehicleTypes: ['CAR', 'SUV'],
    addons: INTERIOR_ADDONS,
    popular: false,
    gradientColors: ['#059669', '#34D399'],
  },
  {
    id: 's4', serviceType: 'PREMIUM_DETAIL', name: 'Premium Detailing', emoji: '💎',
    description: 'Full detailing package: compound polish, ceramic coat prep, interior restoration, odour removal.',
    basePrice: 1999, communityPrice: 1699, durationMins: 240,
    vehicleTypes: ['CAR', 'SUV'],
    addons: [...EXTERIOR_ADDONS, ...INTERIOR_ADDONS],
    popular: false,
    gradientColors: ['#D97706', '#FBBF24'],
  },
  {
    id: 's5', serviceType: 'STEAM_CLEAN', name: 'Steam Clean', emoji: '♨️',
    description: 'Eco-friendly steam cleaning. Sanitizes and deodorises without chemicals.',
    basePrice: 599, communityPrice: 499, durationMins: 90,
    vehicleTypes: ['CAR', 'SUV', 'BIKE'],
    addons: INTERIOR_ADDONS,
    popular: false,
    gradientColors: ['#7C3AED', '#A78BFA'],
  },
  {
    id: 's6', serviceType: 'INTERIOR_CLEAN', name: 'Interior Only', emoji: '🪑',
    description: 'Seat cleaning, carpet vacuuming, dashboard and door panel wipe-down.',
    basePrice: 499, communityPrice: 399, durationMins: 75,
    vehicleTypes: ['CAR', 'SUV'],
    addons: INTERIOR_ADDONS,
    popular: false,
    gradientColors: ['#DB2777', '#F472B6'],
  },
];

const MOCK_BOOKINGS: VehicleCareBooking[] = [
  {
    id: 'b1', bookingNumber: 'VC-240120-001',
    vehicleId: 'v1', vehicleDisplay: 'My Swift • TS 09 AB 1234',
    serviceId: 's2', serviceName: 'Full Car Wash', serviceEmoji: '🚿',
    addonIds: ['a1'], addonNames: ['Tyre Shine'],
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '09:00', endTime: '10:00',
    location: 'B-304, Tower B Parking, Mana Verdant',
    status: 'CONFIRMED', quotedPrice: 349, paidAmount: 349,
    technicianName: 'Ravi Kumar', technicianPhone: '9876543210',
    canCancel: true, canRate: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'b2', bookingNumber: 'VC-240118-002',
    vehicleId: 'v1', vehicleDisplay: 'My Swift • TS 09 AB 1234',
    serviceId: 's1', serviceName: 'Exterior Wash', serviceEmoji: '💧',
    addonIds: [], addonNames: [],
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    startTime: '08:00', endTime: '08:30',
    location: 'B-304, Tower B Parking, Mana Verdant',
    status: 'COMPLETED', quotedPrice: 149, paidAmount: 149,
    technicianName: 'Suresh P', technicianPhone: '9876543211',
    completedAt: new Date(Date.now() - 5 * 86400000 + 1800000).toISOString(),
    canCancel: false, canRate: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'b3', bookingNumber: 'VC-240115-003',
    vehicleId: 'v2', vehicleDisplay: 'Activa • TS 09 CD 5678',
    serviceId: 's1', serviceName: 'Exterior Wash', serviceEmoji: '💧',
    addonIds: [], addonNames: [],
    date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    startTime: '10:00', endTime: '10:30',
    location: 'B-304, Tower B Parking, Mana Verdant',
    status: 'COMPLETED', quotedPrice: 99, paidAmount: 99,
    completedAt: new Date(Date.now() - 10 * 86400000 + 1800000).toISOString(),
    rating: 5, reviewText: 'Excellent service, very thorough!',
    canCancel: false, canRate: false,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
];

const MOCK_PLANS: WashPlan[] = [
  {
    id: 'p1', name: 'Weekly Exterior Pack', frequency: 'WEEKLY',
    servicesIncluded: ['EXTERIOR_WASH'],
    creditsTotal: 4, creditsUsed: 2, price: 499,
    nextRenewalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    nextServiceDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'ACTIVE', vehicleId: 'v1', vehicleDisplay: 'My Swift',
  },
];

const MOCK_PLAN_CATALOG: WashPlanCatalog[] = [
  {
    id: 'pc1', name: 'Weekly Exterior Pack', frequency: 'WEEKLY',
    serviceType: 'EXTERIOR_WASH', creditsPerCycle: 4,
    price: 499, savingsPercent: 16, emoji: '💧', popular: true,
  },
  {
    id: 'pc2', name: 'Monthly Full Wash', frequency: 'MONTHLY',
    serviceType: 'FULL_WASH', creditsPerCycle: 4,
    price: 999, savingsPercent: 17, emoji: '🚿', popular: true,
  },
  {
    id: 'pc3', name: 'Weekly Full Wash', frequency: 'WEEKLY',
    serviceType: 'FULL_WASH', creditsPerCycle: 4,
    price: 1099, savingsPercent: 8, emoji: '🚿', popular: false,
  },
  {
    id: 'pc4', name: 'Monthly Deep Clean', frequency: 'MONTHLY',
    serviceType: 'DEEP_CLEAN', creditsPerCycle: 2,
    price: 1099, savingsPercent: 15, emoji: '✨', popular: false,
  },
];

function genSlots(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const hours = [8, 9, 10, 11, 14, 15, 16, 17];
  hours.forEach((h, i) => {
    slots.push({
      id: `slot-${date.toISOString().split('T')[0]}-${h}`,
      date: date.toISOString().split('T')[0],
      startTime: `${String(h).padStart(2, '0')}:00`,
      endTime: `${String(h + 1).padStart(2, '0')}:00`,
      available: i % 3 !== 2,
      remaining: i % 3 === 0 ? 3 : i % 3 === 1 ? 1 : 0,
    });
  });
  return slots;
}

const MOCK_VENDOR_JOBS: VendorJob[] = [
  {
    id: 'j1', bookingNumber: 'VC-240120-001',
    residentName: 'Arjun Sharma', address: 'B-304, Tower B, Mana Verdant',
    vehicleDisplay: 'Maruti Swift (Red) • TS 09 AB 1234',
    serviceName: 'Full Car Wash', addonNames: ['Tyre Shine'],
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00', status: 'CONFIRMED', amount: 349,
    technicianName: 'Ravi Kumar', checklistCompleted: false,
  },
  {
    id: 'j2', bookingNumber: 'VC-240120-002',
    residentName: 'Priya Reddy', address: 'A-112, Tower A, Mana Verdant',
    vehicleDisplay: 'Honda City (White) • TS 05 EF 9012',
    serviceName: 'Exterior Wash', addonNames: [],
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:30', status: 'ASSIGNED', amount: 149,
    technicianName: 'Ravi Kumar', checklistCompleted: false,
  },
];

// ── Service ───────────────────────────────────────────────────────────────────

export const vehicleCareService = {
  // Vehicle Profiles
  getMyVehicles: async (): Promise<VehicleProfile[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/vehicles');
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((v: any) => ({
          id: String(v.id),
          nickname: v.nickname,
          type: (v.type || v.vehicleType || 'CAR') as VehicleType,
          make: v.make,
          model: v.model,
          color: v.color,
          plateNumber: v.plateNumber,
          isDefault: !!v.isDefault,
          imageEmoji: (v.type || v.vehicleType) === 'BIKE' ? '🛵' : '🚗',
        }));
      }
      return MOCK_VEHICLES;
    } catch {
      return MOCK_VEHICLES;
    }
  },

  addVehicle: async (data: Omit<VehicleProfile, 'id'>): Promise<VehicleProfile> => {
    try {
      const payload = {
        nickname: data.nickname,
        vehicleType: data.type,
        make: data.make,
        model: data.model,
        color: data.color,
        plateNumber: data.plateNumber,
        setAsDefault: data.isDefault,
      };
      const res = await apiClient.post('/vehicle-care/vehicles', payload);
      const v = (res.data as any)?.data || res.data;
      return {
        id: String(v.id),
        nickname: v.nickname,
        type: (v.type || v.vehicleType || data.type) as VehicleType,
        make: v.make,
        model: v.model,
        color: v.color,
        plateNumber: v.plateNumber,
        isDefault: !!v.isDefault,
        imageEmoji: (v.type || v.vehicleType) === 'BIKE' ? '🛵' : '🚗',
      };
    } catch {
      return { ...data, id: `v-${Date.now()}` };
    }
  },

  updateVehicle: async (id: string, data: Partial<VehicleProfile>): Promise<VehicleProfile> => {
    try {
      const payload = {
        nickname: data.nickname,
        vehicleType: data.type,
        make: data.make,
        model: data.model,
        color: data.color,
        plateNumber: data.plateNumber,
        setAsDefault: data.isDefault,
      };
      const res = await apiClient.put(`/vehicle-care/vehicles/${id}`, payload);
      const v = (res.data as any)?.data || res.data;
      return {
        id: String(v.id),
        nickname: v.nickname,
        type: (v.type || v.vehicleType || data.type || 'CAR') as VehicleType,
        make: v.make,
        model: v.model,
        color: v.color,
        plateNumber: v.plateNumber,
        isDefault: !!v.isDefault,
        imageEmoji: (v.type || v.vehicleType) === 'BIKE' ? '🛵' : '🚗',
      };
    } catch {
      const existing = MOCK_VEHICLES.find(v => v.id === id) || MOCK_VEHICLES[0];
      return { ...existing, ...data };
    }
  },

  deleteVehicle: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/vehicle-care/vehicles/${id}`);
    } catch {
      // mock fallback
    }
  },

  setDefaultVehicle: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/vehicles/${id}/default`);
    } catch {
      // mock fallback
    }
  },

  // Catalog
  getServiceCatalog: async (): Promise<ServiceCatalogItem[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/catalog');
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((s: any) => ({
          id: String(s.id),
          serviceType: s.name as ServiceType,
          name: s.name,
          description: s.description || '',
          emoji: s.name?.includes('Full') ? '🚿' : '💧',
          basePrice: Number(s.basePrice || 0),
          communityPrice: Number(s.communityPrice || s.basePrice || 0),
          durationMins: Number(s.durationMinutes || 30),
          vehicleTypes: (s.vehicleTypes || ['CAR', 'SUV', 'BIKE']) as VehicleType[],
          addons: (s.addons || []).map((a: any) => ({
            id: String(a.id),
            name: a.name,
            description: a.name,
            price: Number(a.price || 0),
            durationMins: 10,
          })),
          popular: !!s.isPopular,
          gradientColors: [s.gradientStart || '#0284C7', s.gradientEnd || '#38BDF8'],
        }));
      }
      return MOCK_CATALOG;
    } catch {
      return MOCK_CATALOG;
    }
  },

  // Availability
  getAvailableSlots: async (date: string, _serviceId?: string): Promise<TimeSlot[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/slots', { params: { from: date, to: date } });
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((s: any) => ({
          id: String(s.id),
          date: s.slotDate || date,
          startTime: s.startTime ? s.startTime.substring(0, 5) : '09:00',
          endTime: s.endTime ? s.endTime.substring(0, 5) : '10:00',
          available: !!s.available,
          remaining: Number(s.remaining ?? s.totalCapacity ?? 1),
        }));
      }
      return genSlots(new Date(date));
    } catch {
      return genSlots(new Date(date));
    }
  },

  // Bookings
  createBooking: async (req: CreateBookingRequest): Promise<VehicleCareBooking> => {
    try {
      const payload = {
        vehicleId: isNaN(Number(req.vehicleId)) ? 1 : Number(req.vehicleId),
        serviceId: isNaN(Number(req.serviceId)) ? 1 : Number(req.serviceId),
        slotId: isNaN(Number(req.slotId)) ? 1 : Number(req.slotId),
        addonIds: (req.addonIds || []).map(id => isNaN(Number(id)) ? 1 : Number(id)),
        locationNotes: req.location,
        paymentReference: req.paymentMethod || 'COD',
      };
      const res = await apiClient.post('/vehicle-care/bookings', payload);
      const b = (res.data as any)?.data || res.data;
      const addonNames = b.addonNames || (b.addons || []).map((a: any) => a.name) || [];
      return {
        id: String(b.id),
        bookingNumber: b.bookingNumber || `VC-${Date.now().toString().slice(-6)}`,
        vehicleId: String(b.vehicleId || req.vehicleId),
        vehicleDisplay: b.vehicleDisplay || `${b.vehicleNickname || 'Vehicle'} • ${b.vehiclePlate || ''}`,
        serviceId: String(b.serviceId || req.serviceId),
        serviceName: b.serviceName || 'Vehicle Service',
        serviceEmoji: b.serviceName?.includes('Full') ? '🚿' : '💧',
        addonIds: req.addonIds || [],
        addonNames,
        date: b.date || b.scheduledDate || '',
        startTime: b.startTime || b.scheduledStart || '09:00',
        endTime: b.endTime || b.scheduledEnd || '10:00',
        location: b.location || b.locationNotes || req.location,
        status: b.status || 'CONFIRMED',
        quotedPrice: Number(b.quotedPrice ?? b.totalAmount ?? 0),
        paidAmount: Number(b.paidAmount ?? b.totalAmount ?? 0),
        technicianName: b.technicianName,
        canCancel: b.canCancel ?? true,
        canRate: b.canRate ?? false,
        createdAt: b.createdAt || new Date().toISOString(),
      };
    } catch {
      const svc = MOCK_CATALOG.find(s => s.id === req.serviceId) || MOCK_CATALOG[0];
      const veh = MOCK_VEHICLES.find(v => v.id === req.vehicleId) || MOCK_VEHICLES[0];
      const addonTotal = req.addonIds.reduce((sum, aid) => {
        const addon = svc.addons.find(a => a.id === aid);
        return sum + (addon?.price || 0);
      }, 0);
      return {
        id: `b-${Date.now()}`,
        bookingNumber: `VC-${Date.now().toString().slice(-6)}`,
        vehicleId: veh.id,
        vehicleDisplay: `${veh.nickname} • ${veh.plateNumber}`,
        serviceId: svc.id,
        serviceName: svc.name,
        serviceEmoji: svc.emoji,
        addonIds: req.addonIds,
        addonNames: req.addonIds.map(aid => svc.addons.find(a => a.id === aid)?.name || '').filter(Boolean),
        date: req.slotId.split('-').slice(0, 3).join('-'),
        startTime: '09:00', endTime: '10:00',
        location: req.location,
        status: 'CONFIRMED',
        quotedPrice: svc.communityPrice + addonTotal,
        paidAmount: svc.communityPrice + addonTotal,
        canCancel: true, canRate: false,
        createdAt: new Date().toISOString(),
      };
    }
  },

  getMyBookings: async (): Promise<VehicleCareBooking[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/bookings', { params: { filter: 'all', page: 0, size: 50 } });
      const raw = (res.data as any)?.content || (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((b: any) => ({
          id: String(b.id),
          bookingNumber: b.bookingNumber || `VC-${b.id}`,
          vehicleId: String(b.vehicleId || ''),
          vehicleDisplay: b.vehicleDisplay || `${b.vehicleNickname || 'Vehicle'} • ${b.vehiclePlate || ''}`,
          serviceId: String(b.serviceId || ''),
          serviceName: b.serviceName || 'Vehicle Service',
          serviceEmoji: b.serviceName?.includes('Full') ? '🚿' : '💧',
          addonIds: (b.addons || []).map((a: any) => String(a.id)),
          addonNames: b.addonNames || (b.addons || []).map((a: any) => a.name) || [],
          date: b.date || b.scheduledDate || '',
          startTime: b.startTime || b.scheduledStart || '',
          endTime: b.endTime || b.scheduledEnd || '',
          location: b.location || b.locationNotes || '',
          status: b.status || 'CONFIRMED',
          quotedPrice: Number(b.quotedPrice ?? b.totalAmount ?? 0),
          paidAmount: Number(b.paidAmount ?? b.totalAmount ?? 0),
          technicianName: b.technicianName,
          eta: b.etaMinutes ? `${b.etaMinutes} mins` : undefined,
          rating: b.rating,
          reviewText: b.reviewText,
          canCancel: b.canCancel ?? ['PENDING_PAYMENT', 'CONFIRMED', 'ASSIGNED'].includes(b.status),
          canRate: b.canRate ?? (b.status === 'COMPLETED' && !b.rating),
          createdAt: b.createdAt || '',
        }));
      }
      return MOCK_BOOKINGS;
    } catch {
      return MOCK_BOOKINGS;
    }
  },

  cancelBooking: async (id: string, _reason?: string): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/bookings/${id}/cancel`);
    } catch {
      // mock fallback
    }
  },

  rateBooking: async (id: string, rating: number, review?: string): Promise<void> => {
    try {
      await apiClient.post(`/vehicle-care/bookings/${id}/review`, { rating, reviewText: review || '' });
    } catch {
      // mock fallback
    }
  },

  // Wash Plans
  getMyPlans: async (): Promise<WashPlan[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/plans');
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((p: any) => ({
          id: String(p.id),
          name: p.name || p.planName || 'Wash Plan',
          frequency: (p.frequency || p.frequencyLabel || 'MONTHLY') as PlanFrequency,
          servicesIncluded: ['FULL_WASH'] as ServiceType[],
          creditsTotal: Number(p.creditsTotal || 4),
          creditsUsed: Number(p.creditsUsed || 0),
          price: Number(p.price || 0),
          nextRenewalDate: p.nextRenewalDate || p.endDate || '',
          status: (p.status || 'ACTIVE') as PlanStatus,
          vehicleId: String(p.vehicleId || ''),
          vehicleDisplay: p.vehicleDisplay || `${p.vehicleNickname || ''} ${p.vehiclePlate || ''}`,
        }));
      }
      return MOCK_PLANS;
    } catch {
      return MOCK_PLANS;
    }
  },

  getPlanCatalog: async (): Promise<WashPlanCatalog[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/plans/catalog');
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          frequency: (c.frequency || c.frequencyLabel || 'MONTHLY') as PlanFrequency,
          serviceType: 'FULL_WASH' as ServiceType,
          creditsPerCycle: Number(c.creditsPerCycle || c.washesPerMonth || 4),
          price: Number(c.price || 0),
          savingsPercent: Number(c.savingsPercent || 0),
          emoji: c.emoji || '🚗',
          popular: !!c.popular,
        }));
      }
      return MOCK_PLAN_CATALOG;
    } catch {
      return MOCK_PLAN_CATALOG;
    }
  },

  subscribePlan: async (req: SubscribePlanRequest): Promise<WashPlan> => {
    try {
      const payload = {
        planCatalogId: isNaN(Number(req.planCatalogId)) ? 1 : Number(req.planCatalogId),
        vehicleId: isNaN(Number(req.vehicleId)) ? 1 : Number(req.vehicleId),
        paymentReference: req.paymentMethod,
      };
      const res = await apiClient.post('/vehicle-care/plans/subscribe', payload);
      const p = (res.data as any)?.data || res.data;
      return {
        id: String(p.id),
        name: p.name || p.planName || 'Wash Plan',
        frequency: (p.frequency || p.frequencyLabel || 'MONTHLY') as PlanFrequency,
        servicesIncluded: ['FULL_WASH'] as ServiceType[],
        creditsTotal: Number(p.creditsTotal || 4),
        creditsUsed: Number(p.creditsUsed || 0),
        price: Number(p.price || 0),
        nextRenewalDate: p.nextRenewalDate || p.endDate || '',
        status: (p.status || 'ACTIVE') as PlanStatus,
        vehicleId: String(p.vehicleId || req.vehicleId),
        vehicleDisplay: p.vehicleDisplay || `${p.vehicleNickname || ''} ${p.vehiclePlate || ''}`,
      };
    } catch {
      const cat = MOCK_PLAN_CATALOG.find(p => p.id === req.planCatalogId) || MOCK_PLAN_CATALOG[0];
      const veh = MOCK_VEHICLES.find(v => v.id === req.vehicleId) || MOCK_VEHICLES[0];
      return {
        id: `plan-${Date.now()}`, name: cat.name, frequency: cat.frequency,
        servicesIncluded: [cat.serviceType],
        creditsTotal: cat.creditsPerCycle, creditsUsed: 0, price: cat.price,
        nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'ACTIVE', vehicleId: veh.id, vehicleDisplay: veh.nickname,
      };
    }
  },

  pausePlan: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/plans/${id}/status?status=PAUSED`);
    } catch {
      // mock fallback
    }
  },

  resumePlan: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/plans/${id}/status?status=ACTIVE`);
    } catch {
      // mock fallback
    }
  },

  cancelPlan: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/plans/${id}/status?status=CANCELLED`);
    } catch {
      // mock fallback
    }
  },

  // Vendor / Technician
  getVendorJobs: async (): Promise<VendorJob[]> => {
    try {
      const res = await apiClient.get('/vehicle-care/vendor/jobs');
      const raw = (res.data as any)?.data || res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((j: any) => ({
          id: String(j.id),
          bookingNumber: j.bookingNumber || `VC-${j.id}`,
          residentName: j.vehicleNickname || 'Resident',
          address: j.location || j.locationNotes || 'Flat',
          vehicleDisplay: j.vehicleDisplay || `${j.vehiclePlate || ''}`,
          serviceName: j.serviceName || 'Wash',
          addonNames: j.addonNames || [],
          scheduledDate: j.date || j.scheduledDate || '',
          scheduledTime: j.startTime || j.scheduledStart || '',
          status: j.status || 'CONFIRMED',
          amount: Number(j.totalAmount || j.paidAmount || 0),
          technicianName: j.technicianName,
        }));
      }
      return MOCK_VENDOR_JOBS;
    } catch {
      return MOCK_VENDOR_JOBS;
    }
  },

  updateJobStatus: async (id: string, status: BookingStatus): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/vendor/jobs/${id}/status?status=${status}`);
    } catch {
      // mock fallback
    }
  },

  completeJob: async (id: string, _checklistCompleted: boolean): Promise<void> => {
    try {
      await apiClient.patch(`/vehicle-care/vendor/jobs/${id}/status?status=COMPLETED`);
    } catch {
      // mock fallback
    }
  },
};
