export type ParkingSpotType = 'CAR' | 'BIKE' | 'EV';
export type ParkingSpotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export interface ParkingSpotDto {
  id: number;
  spotNumber: string;
  level: string;
  type: ParkingSpotType;
  status: ParkingSpotStatus;
  vehicleNumber?: string;
  ownerName?: string;
  ownerFlat?: string;
  assignedUserId?: number;
  communityId?: number;
  notes?: string;
  hasEVCharger?: boolean;
}

export interface VisitorPassRequest {
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber: string;
  vehicleType?: ParkingSpotType;
  spotId?: number;
  validFrom?: string;
  validUntil?: string;
  purpose?: string;
}

export interface VisitorPassDto {
  id: number;
  passCode: string;
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber: string;
  vehicleType: string;
  spotId?: number;
  spotNumber?: string;
  validFrom: string;
  validUntil: string;
  purpose?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface ReserveSpotRequest {
  spotId: number;
  vehicleNumber: string;
  vehicleType?: ParkingSpotType;
  notes?: string;
}

// ── EV Charging Station & Power Metering Types ─────────────────────
export type EVChargerStatus = 'AVAILABLE' | 'CHARGING' | 'BOOKED' | 'OFFLINE';
export type EVConnectorType = 'Type-2 (7.4kW)' | 'AC Fast (22kW)' | 'DC CCS2 (50kW)';

export interface EVChargerStationDto {
  id: string;
  stationCode: string;
  name: string;
  location: string;
  level: string;
  connectorType: EVConnectorType;
  maxPowerKW: number;
  tariffPerKWh: number;
  status: EVChargerStatus;
  currentSessionId?: string;
  activeVehicleNumber?: string;
  activeUserFlat?: string;
  notes?: string;
}

export interface EVChargingSessionDto {
  id: string;
  stationId: string;
  stationCode: string;
  vehicleNumber: string;
  userFlat: string;
  startTime: string;
  estimatedEndTime: string;
  currentSoCPercentage: number;
  targetSoCPercentage: number;
  powerOutputKW: number;
  voltageV: number;
  currentA: number;
  energyConsumedKWh: number;
  currentCostINR: number;
  tariffRatePerKWh: number;
  temperatureCelsius: number;
  sessionStatus: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'EMERGENCY_STOP';
}

export interface EVBookingRequest {
  stationId: string;
  vehicleNumber: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  targetSoCPercentage?: number;
}

export interface EVChargingHistoryDto {
  id: string;
  stationCode: string;
  vehicleNumber: string;
  date: string;
  durationFormatted: string;
  energyDeliveredKWh: number;
  totalCostINR: number;
  co2SavedKg: number;
  invoiceUrl?: string;
  status: 'PAID' | 'REFUNDED';
}

// ── ANPR License Plate Recognition & Gate IoT Types ───────────────
export type ANPRDirection = 'ENTRY' | 'EXIT';
export type ANPRVehicleCategory = 'RESIDENT' | 'VISITOR' | 'CAB' | 'DELIVERY' | 'MARKETPLACE_GUEST' | 'UNREGISTERED';

export interface ANPRLogDto {
  id: string;
  plateNumber: string;
  ocrConfidence: number;
  timestamp: string;
  gateName: string;
  direction: ANPRDirection;
  category: ANPRVehicleCategory;
  ownerName?: string;
  ownerFlat?: string;
  barrierLatencyMs: number;
  status: 'CLEARED' | 'FLAGGED' | 'MANUAL_INTERVENTION';
  snapshotUrl?: string;
  notes?: string;
}

export interface VehicleWhitelistDto {
  id: string;
  plateNumber: string;
  vehicleModel: string;
  vehicleType: ParkingSpotType;
  ownerName: string;
  ownerFlat: string;
  fastagRfidId: string;
  isAutoGateEnabled: boolean;
  registeredDate: string;
}

export interface ParkingOccupancySummaryDto {
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  totalEVSpots: number;
  occupiedEVSpots: number;
  totalVisitorSpots: number;
  availableVisitorSpots: number;
  marketplaceSpotsAvailable: number;
  occupancyPercentage: number;
  lastUpdated: string;
}

// ── Temporary Parking Marketplace Types ────────────────────────────
export type MarketplacePricingType = 'FREE_GOOD_NEIGHBOR' | 'DAILY_RATE' | 'HOURLY_RATE';
export type MarketplaceListingStatus = 'AVAILABLE' | 'BOOKED' | 'EXPIRED' | 'CANCELLED';

export interface ParkingMarketplaceListingDto {
  id: string;
  spotId: number;
  spotNumber: string;
  level: string;
  spotType: ParkingSpotType;
  hasEVCharger: boolean;
  ownerName: string;
  ownerFlat: string;
  startDate: string;
  endDate: string;
  pricingType: MarketplacePricingType;
  rateINR: number;
  status: MarketplaceListingStatus;
  notes?: string;
  createdAt: string;
}

export interface CreateMarketplaceListingRequest {
  spotId: number;
  spotNumber: string;
  level: string;
  spotType: ParkingSpotType;
  hasEVCharger?: boolean;
  startDate: string;
  endDate: string;
  pricingType: MarketplacePricingType;
  rateINR: number;
  notes?: string;
}

export interface ParkingMarketplaceBookingDto {
  id: string;
  listingId: string;
  spotNumber: string;
  level: string;
  ownerFlat: string;
  ownerName: string;
  borrowerFlat: string;
  borrowerName: string;
  vehicleNumber: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmountINR: number;
  status: 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  anprWhitelisted: boolean;
  bookingCode: string;
  createdAt: string;
}

export interface BookMarketplaceSlotRequest {
  listingId: string;
  vehicleNumber: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// ── Violations & Enforcement Types ──────────────────────────────────
export type ViolationType = 'UNAUTHORIZED_OCCUPATION' | 'OVERSTAY' | 'WRONG_SLOT' | 'BLOCKING_DRIVEWAY' | 'NON_EV_ON_CHARGER';
export type ViolationSeverity = 'WARNING' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type ViolationStatus = 'REPORTED' | 'WARNED' | 'FINED' | 'PAID' | 'DISPUTED' | 'DISMISSED';

export interface ParkingViolationReportDto {
  id: string;
  spotNumber: string;
  level: string;
  offendingVehicleNumber: string;
  offenderFlat?: string;
  reporterFlat: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  status: ViolationStatus;
  fineAmountINR: number;
  photoUrl?: string;
  timestamp: string;
  remarks: string;
  disputeReason?: string;
}

export interface ReportViolationRequest {
  spotNumber: string;
  level: string;
  offendingVehicleNumber: string;
  violationType: ViolationType;
  photoUrl?: string;
  remarks: string;
}

// ── Waitlist & Slot Swap Types ─────────────────────────────────────
export interface ParkingWaitlistEntryDto {
  id: string;
  residentName: string;
  residentFlat: string;
  vehicleType: ParkingSpotType;
  preferredLevel: string;
  queuePosition: number;
  requestDate: string;
  status: 'QUEUED' | 'OFFERED' | 'ALLOCATED' | 'EXPIRED';
}

export interface ParkingSlotSwapRequestDto {
  id: string;
  requesterName: string;
  requesterFlat: string;
  currentSpotNumber: string;
  currentLevel: string;
  targetSpotNumber: string;
  targetLevel: string;
  targetOwnerFlat: string;
  reason: string;
  status: 'PENDING_NEIGHBOR' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// ── Analytics & Heatmaps ───────────────────────────────────────────
export interface ParkingAnalyticsSummaryDto {
  peakHours: string;
  averageOccupancyPercent: number;
  evEnergyDeliveredKWhMonth: number;
  evRevenueINRMonth: number;
  marketplaceBookingsMonth: number;
  marketplaceEarningsINRMonth: number;
  totalViolationsMonth: number;
  topViolationType: string;
}
