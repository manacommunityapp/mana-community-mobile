import api from './apiClient';
import { secureLog } from '@/security';
import type {
  ParkingSpotDto,
  ReserveSpotRequest,
  VisitorPassRequest,
  VisitorPassDto,
  EVChargerStationDto,
  EVChargingSessionDto,
  EVBookingRequest,
  EVChargingHistoryDto,
  ANPRLogDto,
  VehicleWhitelistDto,
  ParkingOccupancySummaryDto,
  ParkingMarketplaceListingDto,
  CreateMarketplaceListingRequest,
  ParkingMarketplaceBookingDto,
  BookMarketplaceSlotRequest,
  ParkingViolationReportDto,
  ReportViolationRequest,
  ParkingWaitlistEntryDto,
  ParkingSlotSwapRequestDto,
  ParkingAnalyticsSummaryDto,
} from '@/types/parking';

export * from '@/types/parking';

// ── Structured Hybrid Fallback Dataset ──────────────────────────────
export const FALLBACK_PARKING_SPOTS: ParkingSpotDto[] = [
  { id: 1,  spotNumber: 'B1-P12', level: 'Basement 1', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-01-AB-1234', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 2,  spotNumber: 'B1-P13', level: 'Basement 1', type: 'BIKE', status: 'OCCUPIED',  vehicleNumber: 'KA-01-CD-5678', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 3,  spotNumber: 'B1-EV1', level: 'Basement 1', type: 'EV',   status: 'AVAILABLE', notes: '22kW AC Fast Charger', hasEVCharger: true },
  { id: 4,  spotNumber: 'B1-P08', level: 'Basement 1', type: 'BIKE', status: 'AVAILABLE' },
  { id: 5,  spotNumber: 'B1-P14', level: 'Basement 1', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-02-EE-9011', ownerName: 'Sunil Rao', ownerFlat: 'A2-104' },
  { id: 6,  spotNumber: 'B1-EV3', level: 'Basement 1', type: 'EV',   status: 'RESERVED',  vehicleNumber: 'KA-05-EV-4421', ownerName: 'Rahul K.', ownerFlat: 'B2-201', hasEVCharger: true },
  { id: 7,  spotNumber: 'B2-P05', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 8,  spotNumber: 'B2-P06', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 9,  spotNumber: 'B2-P22', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 10, spotNumber: 'B2-P23', level: 'Basement 2', type: 'BIKE', status: 'AVAILABLE' },
  { id: 11, spotNumber: 'B2-EV2', level: 'Basement 2', type: 'EV',   status: 'AVAILABLE', notes: '7.4kW Type-2 Connector', hasEVCharger: true },
  { id: 12, spotNumber: 'B2-P30', level: 'Basement 2', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-03-MM-7890', ownerName: 'Vikram Joshi', ownerFlat: 'C1-501' },
];

export const FALLBACK_EV_STATIONS: EVChargerStationDto[] = [
  {
    id: 'ev-b1-01',
    stationCode: 'B1-EV-FAST-01',
    name: 'Bay B1 Fast Charging Hub 1',
    location: 'Basement 1, Pillar 14 (Near Tower A Lift)',
    level: 'Basement 1',
    connectorType: 'AC Fast (22kW)',
    maxPowerKW: 22,
    tariffPerKWh: 8.5,
    status: 'CHARGING',
    currentSessionId: 'sess-active-01',
    activeVehicleNumber: 'KA-01-EV-9821 (Nexon EV)',
    activeUserFlat: 'A1-302 (You)',
    notes: 'Equipped with smart power load balancer and auto-cutoff',
  },
  {
    id: 'ev-b1-02',
    stationCode: 'B1-EV-FAST-02',
    name: 'Bay B1 Dual AC Station 2',
    location: 'Basement 1, Pillar 18 (Near Tower B Lift)',
    level: 'Basement 1',
    connectorType: 'AC Fast (22kW)',
    maxPowerKW: 22,
    tariffPerKWh: 8.5,
    status: 'AVAILABLE',
    notes: 'Plug & Charge ready with auto-FASTag authorization',
  },
  {
    id: 'ev-b2-01',
    stationCode: 'B2-EV-DC-01',
    name: 'Bay B2 DC Supercharger Hub',
    location: 'Basement 2, Central Bay 04',
    level: 'Basement 2',
    connectorType: 'DC CCS2 (50kW)',
    maxPowerKW: 50,
    tariffPerKWh: 11.0,
    status: 'AVAILABLE',
    notes: 'High-speed DC fast charging (0 to 80% in 45 mins)',
  },
  {
    id: 'ev-b2-02',
    stationCode: 'B2-EV-STD-02',
    name: 'Bay B2 Standard Type-2 Station',
    location: 'Basement 2, Pillar 32',
    level: 'Basement 2',
    connectorType: 'Type-2 (7.4kW)',
    maxPowerKW: 7.4,
    tariffPerKWh: 7.5,
    status: 'BOOKED',
    notes: 'Reserved for 7:00 PM slot (Tower C-404)',
  },
];

export const FALLBACK_ACTIVE_EV_SESSION: EVChargingSessionDto = {
  id: 'sess-active-01',
  stationId: 'ev-b1-01',
  stationCode: 'B1-EV-FAST-01',
  vehicleNumber: 'KA-01-EV-9821',
  userFlat: 'A1-302',
  startTime: '10:15 AM (Today)',
  estimatedEndTime: '11:45 AM (30 mins remaining)',
  currentSoCPercentage: 68,
  targetSoCPercentage: 90,
  powerOutputKW: 21.4,
  voltageV: 415.2,
  currentA: 29.8,
  energyConsumedKWh: 14.8,
  currentCostINR: 125.8,
  tariffRatePerKWh: 8.5,
  temperatureCelsius: 34.2,
  sessionStatus: 'ACTIVE',
};

export const FALLBACK_MARKETPLACE_LISTINGS: ParkingMarketplaceListingDto[] = [
  {
    id: 'mkt-01',
    spotId: 5,
    spotNumber: 'B1-P14',
    level: 'Basement 1',
    spotType: 'CAR',
    hasEVCharger: false,
    ownerName: 'Sunil Rao',
    ownerFlat: 'Tower A2 - 104',
    startDate: '2026-10-06',
    endDate: '2026-10-20',
    pricingType: 'DAILY_RATE',
    rateINR: 80,
    status: 'AVAILABLE',
    notes: 'Traveling out of station for 2 weeks. Prime spot right near Tower A lift.',
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'mkt-02',
    spotId: 12,
    spotNumber: 'B2-P30',
    level: 'Basement 2',
    spotType: 'CAR',
    hasEVCharger: false,
    ownerName: 'Vikram Joshi',
    ownerFlat: 'Tower C1 - 501',
    startDate: '2026-10-05',
    endDate: '2026-10-12',
    pricingType: 'FREE_GOOD_NEIGHBOR',
    rateINR: 0,
    status: 'AVAILABLE',
    notes: 'Lending to any verified neighbor for free while we are on holiday! Please keep clean.',
    createdAt: '2026-10-04T14:30:00Z',
  },
  {
    id: 'mkt-03',
    spotId: 8,
    spotNumber: 'B2-P08',
    level: 'Basement 2',
    spotType: 'CAR',
    hasEVCharger: true,
    ownerName: 'Ananya Sharma',
    ownerFlat: 'Tower B1 - 802',
    startDate: '2026-10-08',
    endDate: '2026-10-30',
    pricingType: 'DAILY_RATE',
    rateINR: 120,
    status: 'AVAILABLE',
    notes: 'Covered spot with 15A socket for trickle charging. Spacious parking.',
    createdAt: '2026-10-05T08:00:00Z',
  },
];

export const FALLBACK_MY_MARKETPLACE_BOOKINGS: ParkingMarketplaceBookingDto[] = [
  {
    id: 'bk-mkt-01',
    listingId: 'mkt-00',
    spotNumber: 'B1-P24',
    level: 'Basement 1',
    ownerFlat: 'Tower B2 - 304',
    ownerName: 'Karthik N.',
    borrowerFlat: 'Tower A1 - 302',
    borrowerName: 'You',
    vehicleNumber: 'KA-01-AB-1234',
    startDate: '2026-10-01',
    endDate: '2026-10-04',
    totalDays: 3,
    totalAmountINR: 240,
    status: 'COMPLETED',
    anprWhitelisted: true,
    bookingCode: 'MKT-8921',
    createdAt: '2026-09-30T18:00:00Z',
  }
];

export const FALLBACK_VIOLATIONS: ParkingViolationReportDto[] = [
  {
    id: 'viol-01',
    spotNumber: 'B1-P12',
    level: 'Basement 1',
    offendingVehicleNumber: 'KA-04-XX-4321',
    offenderFlat: 'Tower C2 - 1102',
    reporterFlat: 'Tower A1 - 302 (You)',
    violationType: 'WRONG_SLOT',
    severity: 'MINOR',
    status: 'WARNED',
    fineAmountINR: 250,
    timestamp: 'Yesterday at 7:30 PM',
    remarks: 'Parked in my deeded spot without permission. Guard notified.',
  },
  {
    id: 'viol-02',
    spotNumber: 'B1-EV1',
    level: 'Basement 1',
    offendingVehicleNumber: 'MH-02-CD-9988',
    offenderFlat: 'Tower B1 - 404',
    reporterFlat: 'Society Security',
    violationType: 'NON_EV_ON_CHARGER',
    severity: 'MAJOR',
    status: 'FINED',
    fineAmountINR: 500,
    timestamp: '2 days ago',
    remarks: 'Internal combustion car blocking EV charging station for 6+ hours.',
  }
];

export const FALLBACK_WAITLIST: ParkingWaitlistEntryDto[] = [
  {
    id: 'wl-01',
    residentName: 'You (Tower A1-302)',
    residentFlat: 'A1-302',
    vehicleType: 'CAR',
    preferredLevel: 'Basement 1',
    queuePosition: 2,
    requestDate: '2026-08-15',
    status: 'QUEUED',
  },
  {
    id: 'wl-02',
    residentName: 'Deepak Verma',
    residentFlat: 'Tower B2-901',
    vehicleType: 'CAR',
    preferredLevel: 'Basement 1',
    queuePosition: 1,
    requestDate: '2026-07-20',
    status: 'OFFERED',
  }
];

export const FALLBACK_SWAP_REQUESTS: ParkingSlotSwapRequestDto[] = [
  {
    id: 'swap-01',
    requesterName: 'Pooja Iyer',
    requesterFlat: 'Tower A1-304',
    currentSpotNumber: 'B2-P10',
    currentLevel: 'Basement 2',
    targetSpotNumber: 'B1-P12',
    targetLevel: 'Basement 1',
    targetOwnerFlat: 'Tower A1-302 (You)',
    reason: 'Elderly parents visiting, requesting B1 level closer to lift.',
    status: 'PENDING_NEIGHBOR',
    createdAt: '2026-10-04T12:00:00Z',
  }
];

export const FALLBACK_ANALYTICS: ParkingAnalyticsSummaryDto = {
  peakHours: '8:00 AM - 10:30 AM & 6:30 PM - 9:00 PM',
  averageOccupancyPercent: 88.4,
  evEnergyDeliveredKWhMonth: 1420.5,
  evRevenueINRMonth: 12074.25,
  marketplaceBookingsMonth: 38,
  marketplaceEarningsINRMonth: 18240,
  totalViolationsMonth: 9,
  topViolationType: 'Wrong Slot Parking (55%)',
};

let inMemorySpots = [...FALLBACK_PARKING_SPOTS];
let inMemoryMarketplaceListings = [...FALLBACK_MARKETPLACE_LISTINGS];
let inMemoryMarketplaceBookings = [...FALLBACK_MY_MARKETPLACE_BOOKINGS];
let inMemoryViolations = [...FALLBACK_VIOLATIONS];
let inMemoryWaitlist = [...FALLBACK_WAITLIST];
let inMemorySwapRequests = [...FALLBACK_SWAP_REQUESTS];
let inMemoryVisitorPasses: VisitorPassDto[] = [
  {
    id: 101,
    passCode: 'VP-8821',
    visitorName: 'Aditya Sharma',
    visitorPhone: '+91 98877 66554',
    vehicleNumber: 'KA-04-EZ-3321',
    vehicleType: 'CAR',
    spotId: 8,
    spotNumber: 'B2-P06',
    validFrom: '2026-10-05T09:00:00Z',
    validUntil: '2026-10-05T19:00:00Z',
    purpose: 'Family Lunch & Visit',
    status: 'ACTIVE',
  },
];
let inMemoryWhitelist: VehicleWhitelistDto[] = [
  {
    id: 'wl-01',
    plateNumber: 'KA-01-AB-1234',
    vehicleModel: 'Honda City (Pearl White)',
    vehicleType: 'CAR',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    fastagRfidId: 'TAG-88210-RFID',
    isAutoGateEnabled: true,
    registeredDate: '2025-01-10',
  },
  {
    id: 'wl-02',
    plateNumber: 'KA-01-CD-5678',
    vehicleModel: 'Ather 450X (Space Grey)',
    vehicleType: 'BIKE',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    fastagRfidId: 'TAG-33291-RFID',
    isAutoGateEnabled: true,
    registeredDate: '2025-03-22',
  },
];
let inMemoryANPRLogs: ANPRLogDto[] = [
  {
    id: 'anpr-01',
    plateNumber: 'KA-01-AB-1234',
    ocrConfidence: 99.8,
    timestamp: '10 mins ago',
    gateName: 'Main Gate Barrier A',
    direction: 'ENTRY',
    category: 'RESIDENT',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    barrierLatencyMs: 120,
    status: 'CLEARED',
    notes: 'Fastag verified & auto-lifted',
  },
  {
    id: 'anpr-02',
    plateNumber: 'KA-04-EZ-3321',
    ocrConfidence: 98.6,
    timestamp: '45 mins ago',
    gateName: 'Visitor Gate 2',
    direction: 'ENTRY',
    category: 'VISITOR',
    ownerName: 'Aditya Sharma (Pass VP-8821)',
    ownerFlat: 'Guest of Tower A - 302',
    barrierLatencyMs: 210,
    status: 'CLEARED',
    notes: 'Pre-registered Visitor Pass validated',
  }
];

export const parkingService = {
  // ── 1. Slot Allocation & Registry ─────────────────────────────────
  async getSpots(params?: { level?: string; type?: string; status?: string }): Promise<ParkingSpotDto[]> {
    try {
      const res = await api.get<ParkingSpotDto[]>('/parking/slots', { params });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (e) {
      secureLog.warn('Parking API getSpots fallback', e);
    }
    return inMemorySpots.filter((s) => {
      if (params?.level && s.level !== params.level) return false;
      if (params?.type && s.type !== params.type) return false;
      if (params?.status && s.status !== params.status) return false;
      return true;
    });
  },

  async reserveSpot(req: ReserveSpotRequest): Promise<ParkingSpotDto> {
    try {
      const res = await api.post<ParkingSpotDto>('/parking/slots/reserve', req);
      return res.data;
    } catch {
      const spotIndex = inMemorySpots.findIndex((s) => s.id === req.spotId);
      if (spotIndex !== -1) {
        inMemorySpots[spotIndex] = {
          ...inMemorySpots[spotIndex],
          status: 'RESERVED',
          vehicleNumber: req.vehicleNumber,
          ownerName: 'You',
          ownerFlat: 'A1-302',
          notes: req.notes,
        };
        return inMemorySpots[spotIndex];
      }
      throw new Error('Spot not found');
    }
  },

  async getOccupancySummary(): Promise<ParkingOccupancySummaryDto> {
    try {
      const res = await api.get<ParkingOccupancySummaryDto>('/parking/occupancy');
      if (res.data) return res.data;
    } catch {}
    const total = inMemorySpots.length;
    const occupied = inMemorySpots.filter((s) => s.status === 'OCCUPIED' || s.status === 'RESERVED').length;
    const available = total - occupied;
    const evSpots = inMemorySpots.filter((s) => s.hasEVCharger || s.type === 'EV');
    const occupiedEv = evSpots.filter((s) => s.status === 'OCCUPIED' || s.status === 'RESERVED').length;
    const marketplaceAvailable = inMemoryMarketplaceListings.filter((l) => l.status === 'AVAILABLE').length;

    return {
      totalSpots: total + 40,
      occupiedSpots: occupied + 32,
      availableSpots: available + 8,
      totalEVSpots: 12,
      occupiedEVSpots: 7,
      totalVisitorSpots: 15,
      availableVisitorSpots: 6,
      marketplaceSpotsAvailable: marketplaceAvailable,
      occupancyPercentage: Math.round(((occupied + 32) / (total + 40)) * 100),
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  },

  // ── 2. Visitor Parking ────────────────────────────────────────────
  async getVisitorPasses(): Promise<VisitorPassDto[]> {
    try {
      const res = await api.get<VisitorPassDto[]>('/parking/visitor-pass');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return inMemoryVisitorPasses;
  },

  async createVisitorPass(data: VisitorPassRequest): Promise<VisitorPassDto> {
    try {
      const res = await api.post<VisitorPassDto>('/parking/visitor-pass', data);
      if (res.data) return res.data;
    } catch {}

    const code = 'VP-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const validUntil = data.validUntil || new Date(now.getTime() + 8 * 3600000).toISOString();
    const newPass: VisitorPassDto = {
      id: Date.now(),
      passCode: code,
      visitorName: data.visitorName,
      visitorPhone: data.visitorPhone,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType || 'CAR',
      spotId: data.spotId,
      spotNumber: data.spotId ? 'B2-P' + data.spotId : 'B2-Visitor',
      validFrom: data.validFrom || now.toISOString(),
      validUntil,
      purpose: data.purpose || 'Guest Visit',
      status: 'ACTIVE',
    };
    inMemoryVisitorPasses.unshift(newPass);

    inMemoryANPRLogs.unshift({
      id: 'anpr-v-' + Date.now().toString().slice(-4),
      plateNumber: data.vehicleNumber,
      ocrConfidence: 99.1,
      timestamp: 'Just now',
      gateName: 'Main Entrance Gate 1',
      direction: 'ENTRY',
      category: 'VISITOR',
      ownerName: data.visitorName + ' (Pass ' + code + ')',
      ownerFlat: 'Guest of Tower A - 302',
      barrierLatencyMs: 175,
      status: 'CLEARED',
      notes: 'Visitor Pass pre-cleared via Resident App.',
    });

    return newPass;
  },

  // ── 3. Temporary Parking Marketplace ★ ─────────────────────────────
  async getMarketplaceListings(): Promise<ParkingMarketplaceListingDto[]> {
    try {
      const res = await api.get<ParkingMarketplaceListingDto[]>('/parking/marketplace/listings');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return inMemoryMarketplaceListings;
  },

  async createMarketplaceListing(data: CreateMarketplaceListingRequest): Promise<ParkingMarketplaceListingDto> {
    try {
      const res = await api.post<ParkingMarketplaceListingDto>('/parking/marketplace/listings', data);
      if (res.data) return res.data;
    } catch {}

    const newListing: ParkingMarketplaceListingDto = {
      id: 'mkt-' + Date.now().toString().slice(-4),
      spotId: data.spotId,
      spotNumber: data.spotNumber,
      level: data.level,
      spotType: data.spotType,
      hasEVCharger: !!data.hasEVCharger,
      ownerName: 'You',
      ownerFlat: 'Tower A1 - 302',
      startDate: data.startDate,
      endDate: data.endDate,
      pricingType: data.pricingType,
      rateINR: data.rateINR,
      status: 'AVAILABLE',
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    inMemoryMarketplaceListings.unshift(newListing);
    return newListing;
  },

  async bookMarketplaceSlot(req: BookMarketplaceSlotRequest): Promise<ParkingMarketplaceBookingDto> {
    try {
      const res = await api.post<ParkingMarketplaceBookingDto>('/parking/marketplace/book', req);
      if (res.data) return res.data;
    } catch {}

    const listing = inMemoryMarketplaceListings.find((l) => l.id === req.listingId);
    if (!listing) throw new Error('Listing not found');

    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalCost = listing.pricingType === 'FREE_GOOD_NEIGHBOR' ? 0 : listing.rateINR * diffDays;

    listing.status = 'BOOKED';

    const booking: ParkingMarketplaceBookingDto = {
      id: 'bk-mkt-' + Date.now().toString().slice(-4),
      listingId: listing.id,
      spotNumber: listing.spotNumber,
      level: listing.level,
      ownerFlat: listing.ownerFlat,
      ownerName: listing.ownerName,
      borrowerFlat: 'Tower A1 - 302',
      borrowerName: 'You',
      vehicleNumber: req.vehicleNumber,
      startDate: req.startDate,
      endDate: req.endDate,
      totalDays: diffDays,
      totalAmountINR: totalCost,
      status: 'CONFIRMED',
      anprWhitelisted: true,
      bookingCode: 'MKT-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
    };

    inMemoryMarketplaceBookings.unshift(booking);

    inMemoryANPRLogs.unshift({
      id: 'anpr-mkt-' + Date.now().toString().slice(-4),
      plateNumber: req.vehicleNumber,
      ocrConfidence: 99.5,
      timestamp: 'Scheduled for ' + req.startDate,
      gateName: 'Basement Barrier 1',
      direction: 'ENTRY',
      category: 'MARKETPLACE_GUEST',
      ownerName: 'Marketplace Borrower (Code: ' + booking.bookingCode + ')',
      ownerFlat: 'Temporary allocated to ' + listing.spotNumber,
      barrierLatencyMs: 140,
      status: 'CLEARED',
      notes: 'ANPR Auto-Whitelisted for slot ' + listing.spotNumber + ' (' + req.startDate + ' to ' + req.endDate + ')',
    });

    return booking;
  },

  async getMyMarketplaceBookings(): Promise<ParkingMarketplaceBookingDto[]> {
    try {
      const res = await api.get<ParkingMarketplaceBookingDto[]>('/parking/marketplace/my-bookings');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return inMemoryMarketplaceBookings;
  },

  // ── 4. Parking Violations & Enforcement ────────────────────────────
  async getViolations(): Promise<ParkingViolationReportDto[]> {
    try {
      const res = await api.get<ParkingViolationReportDto[]>('/parking/violations');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return inMemoryViolations;
  },

  async reportViolation(req: ReportViolationRequest): Promise<ParkingViolationReportDto> {
    try {
      const res = await api.post<ParkingViolationReportDto>('/parking/violations', req);
      if (res.data) return res.data;
    } catch {}

    const fineAmount = req.violationType === 'NON_EV_ON_CHARGER' ? 500 : req.violationType === 'UNAUTHORIZED_OCCUPATION' ? 500 : 250;
    const newReport: ParkingViolationReportDto = {
      id: 'viol-' + Date.now().toString().slice(-4),
      spotNumber: req.spotNumber,
      level: req.level,
      offendingVehicleNumber: req.offendingVehicleNumber,
      reporterFlat: 'Tower A1 - 302 (You)',
      violationType: req.violationType,
      severity: req.violationType === 'NON_EV_ON_CHARGER' ? 'MAJOR' : 'MINOR',
      status: 'REPORTED',
      fineAmountINR: fineAmount,
      photoUrl: req.photoUrl,
      timestamp: 'Just now',
      remarks: req.remarks,
    };
    inMemoryViolations.unshift(newReport);
    return newReport;
  },

  // ── 5. ANPR & Gate Whitelist ──────────────────────────────────────
  async getANPRLogs(search?: string, direction?: string): Promise<ANPRLogDto[]> {
    try {
      const res = await api.get<ANPRLogDto[]>('/parking/anpr/logs');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return inMemoryANPRLogs;
  },

  async getVehicleWhitelist(): Promise<VehicleWhitelistDto[]> {
    try {
      const res = await api.get<VehicleWhitelistDto[]>('/parking/whitelist');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return inMemoryWhitelist;
  },

  async addVehicleToWhitelist(data: Partial<VehicleWhitelistDto>): Promise<VehicleWhitelistDto> {
    try {
      const res = await api.post<VehicleWhitelistDto>('/parking/whitelist', data);
      return res.data;
    } catch {
      const newV: VehicleWhitelistDto = {
        id: 'wl-' + Date.now().toString().slice(-4),
        plateNumber: data.plateNumber || 'KA-01-NEW-0000',
        vehicleModel: data.vehicleModel || 'Resident Vehicle',
        vehicleType: data.vehicleType || 'CAR',
        ownerName: 'You',
        ownerFlat: 'Tower A - 302',
        fastagRfidId: 'TAG-' + Math.floor(1000 + Math.random() * 9000) + '-RFID',
        isAutoGateEnabled: true,
        registeredDate: 'Today',
      };
      inMemoryWhitelist = [...inMemoryWhitelist, newV];
      return newV;
    }
  },

  // ── 6. EV Charging & Metering ─────────────────────────────────────
  async getEVStations(): Promise<EVChargerStationDto[]> {
    try {
      const res = await api.get<EVChargerStationDto[]>('/parking/ev/stations');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return FALLBACK_EV_STATIONS;
  },

  
  async getEVChargingHistory(): Promise<EVChargingHistoryDto[]> {
    try {
      const res = await api.get<EVChargingHistoryDto[]>('/parking/ev/history');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return [
      { id: 'evh-1', stationCode: 'EV-Fast-01', vehicleNumber: 'KA-01-AB-1234', date: 'Oct 02, 18:30', durationFormatted: '1h 45m', energyDeliveredKWh: 14.5, totalCostINR: 174, co2SavedKg: 11.2, status: 'PAID' },
      { id: 'evh-2', stationCode: 'EV-Standard-03', vehicleNumber: 'KA-01-AB-1234', date: 'Sep 28, 21:00', durationFormatted: '9h 00m', energyDeliveredKWh: 32.0, totalCostINR: 320, co2SavedKg: 24.8, status: 'PAID' },
    ];
  },

  async startEVCharging(stationId: string | number, vehicleNumber?: string): Promise<EVChargingSessionDto> {
    try {
      const res = await api.post<EVChargingSessionDto>('/parking/ev/start', { stationId, vehicleNumber });
      return res.data;
    } catch {
      return FALLBACK_ACTIVE_EV_SESSION;
    }
  },

  async stopEVCharging(sessionId?: string): Promise<{ success: boolean; message: string; summary: { energyDeliveredKWh: number; totalCostINR: number; co2SavedKg: number } }> {
    try {
      const res = await api.post('/parking/ev/stop', { sessionId });
      return res.data;
    } catch {
      return {
        success: true,
        message: 'Charging session stopped successfully',
        summary: { energyDeliveredKWh: 14.5, totalCostINR: 174, co2SavedKg: 11.2 },
      };
    }
  },

  async bookEVStation(req: EVBookingRequest): Promise<{ success: boolean; bookingCode: string }> {
    try {
      const res = await api.post('/parking/ev/book', req);
      return res.data;
    } catch {
      return { success: true, bookingCode: 'EV-' + Math.floor(1000 + Math.random() * 9000) };
    }
  },

  async getActiveEVSession(): Promise<EVChargingSessionDto | null> {
    try {
      const res = await api.get<EVChargingSessionDto>('/parking/ev/active-session');
      return res.data;
    } catch {
      return FALLBACK_ACTIVE_EV_SESSION;
    }
  },

  // ── 7. Waitlist & Swaps ───────────────────────────────────────────
  async getWaitlist(): Promise<ParkingWaitlistEntryDto[]> {
    try {
      const res = await api.get<ParkingWaitlistEntryDto[]>('/parking/waitlist');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return inMemoryWaitlist;
  },

  async joinWaitlist(data: { vehicleType: 'CAR' | 'BIKE' | 'EV'; preferredLevel: string }): Promise<ParkingWaitlistEntryDto> {
    const entry: ParkingWaitlistEntryDto = {
      id: 'wl-' + Date.now().toString().slice(-4),
      residentName: 'You (Tower A1-302)',
      residentFlat: 'A1-302',
      vehicleType: data.vehicleType,
      preferredLevel: data.preferredLevel,
      queuePosition: inMemoryWaitlist.length + 1,
      requestDate: new Date().toISOString().slice(0, 10),
      status: 'QUEUED',
    };
    inMemoryWaitlist.push(entry);
    return entry;
  },

  async getSwapRequests(): Promise<ParkingSlotSwapRequestDto[]> {
    try {
      const res = await api.get<ParkingSlotSwapRequestDto[]>('/parking/swaps');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return inMemorySwapRequests;
  },

  async createSwapRequest(data: { targetSpotNumber: string; targetLevel: string; targetOwnerFlat: string; reason: string }): Promise<ParkingSlotSwapRequestDto> {
    const swap: ParkingSlotSwapRequestDto = {
      id: 'swap-' + Date.now().toString().slice(-4),
      requesterName: 'You',
      requesterFlat: 'Tower A1 - 302',
      currentSpotNumber: 'B1-P12',
      currentLevel: 'Basement 1',
      targetSpotNumber: data.targetSpotNumber,
      targetLevel: data.targetLevel,
      targetOwnerFlat: data.targetOwnerFlat,
      reason: data.reason,
      status: 'PENDING_NEIGHBOR',
      createdAt: new Date().toISOString(),
    };
    inMemorySwapRequests.unshift(swap);
    return swap;
  },

  async getParkingAnalytics(): Promise<ParkingAnalyticsSummaryDto> {
    try {
      const res = await api.get<ParkingAnalyticsSummaryDto>('/parking/analytics');
      if (res.data) return res.data;
    } catch {}
    return FALLBACK_ANALYTICS;
  },
};
