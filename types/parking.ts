export type ParkingSpotType = 'CAR' | 'BIKE' | 'EV';
export type ParkingSpotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

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
export type ANPRVehicleCategory = 'RESIDENT' | 'VISITOR' | 'CAB' | 'DELIVERY' | 'UNREGISTERED';

export interface ANPRLogDto {
  id: string;
  plateNumber: string;
  ocrConfidence: number; // e.g. 99.4%
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
  availableEVSpots: number;
  b1Available: number;
  b1Total: number;
  b2Available: number;
  b2Total: number;
  activeVisitors: number;
}
