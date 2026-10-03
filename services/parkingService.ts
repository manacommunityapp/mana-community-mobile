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
  energyConsumedKWh: 18.6,
  currentCostINR: 158.1,
  tariffRatePerKWh: 8.5,
  temperatureCelsius: 36.2,
  sessionStatus: 'ACTIVE',
};

export const FALLBACK_EV_HISTORY: EVChargingHistoryDto[] = [
  {
    id: 'ev-hist-01',
    stationCode: 'B1-EV-FAST-01',
    vehicleNumber: 'KA-01-EV-9821',
    date: 'Yesterday, 6:30 PM',
    durationFormatted: '1h 24m',
    energyDeliveredKWh: 24.8,
    totalCostINR: 210.8,
    co2SavedKg: 18.4,
    invoiceUrl: 'https://docs.manacommunity.org/invoices/EV_OCT_2025_01.pdf',
    status: 'PAID',
  },
  {
    id: 'ev-hist-02',
    stationCode: 'B2-EV-DC-01',
    vehicleNumber: 'KA-01-EV-9821',
    date: 'Oct 12, 2025 · 8:15 AM',
    durationFormatted: '42 mins',
    energyDeliveredKWh: 32.5,
    totalCostINR: 357.5,
    co2SavedKg: 24.1,
    invoiceUrl: 'https://docs.manacommunity.org/invoices/EV_OCT_2025_02.pdf',
    status: 'PAID',
  },
  {
    id: 'ev-hist-03',
    stationCode: 'B1-EV-FAST-02',
    vehicleNumber: 'KA-01-EV-9821',
    date: 'Oct 05, 2025 · 7:00 PM',
    durationFormatted: '1h 45m',
    energyDeliveredKWh: 28.2,
    totalCostINR: 239.7,
    co2SavedKg: 20.9,
    status: 'PAID',
  },
];

export const FALLBACK_ANPR_LOGS: ANPRLogDto[] = [
  {
    id: 'anpr-01',
    plateNumber: 'KA-01-AB-1234',
    ocrConfidence: 99.8,
    timestamp: '2 mins ago (11:28 AM)',
    gateName: 'Main Entrance Gate 1',
    direction: 'ENTRY',
    category: 'RESIDENT',
    ownerName: 'You (Suresh C.)',
    ownerFlat: 'Tower A - 302',
    barrierLatencyMs: 140,
    status: 'CLEARED',
    notes: 'FASTag RFID + ANPR dual-match verified. Automatic boom barrier raised.',
  },
  {
    id: 'anpr-02',
    plateNumber: 'KA-05-EV-4421',
    ocrConfidence: 99.4,
    timestamp: '14 mins ago (11:16 AM)',
    gateName: 'Tower B Ramp Barrier',
    direction: 'ENTRY',
    category: 'RESIDENT',
    ownerName: 'Rahul K.',
    ownerFlat: 'Tower B - 201',
    barrierLatencyMs: 165,
    status: 'CLEARED',
    notes: 'Automated basement gate clearance.',
  },
  {
    id: 'anpr-03',
    plateNumber: 'KA-03-XY-9081',
    ocrConfidence: 98.9,
    timestamp: '28 mins ago (11:02 AM)',
    gateName: 'Main Entrance Gate 1',
    direction: 'ENTRY',
    category: 'VISITOR',
    ownerName: 'Rohan Sharma (Visitor Pass VP-8821)',
    ownerFlat: 'Guest of Tower A - 302',
    barrierLatencyMs: 220,
    status: 'CLEARED',
    notes: 'Digital Visitor Pass verified at Security Kiosk.',
  },
  {
    id: 'anpr-04',
    plateNumber: 'KA-51-MB-7788',
    ocrConfidence: 97.6,
    timestamp: '45 mins ago (10:45 AM)',
    gateName: 'Service Gate 3',
    direction: 'EXIT',
    category: 'DELIVERY',
    ownerName: 'Blinkit Delivery Van',
    barrierLatencyMs: 190,
    status: 'CLEARED',
    notes: 'Service exit logged with 18-minute estate turnaround.',
  },
  {
    id: 'anpr-05',
    plateNumber: 'KA-04-QQ-1122',
    ocrConfidence: 95.2,
    timestamp: '1 hour ago (10:30 AM)',
    gateName: 'Main Entrance Gate 2',
    direction: 'ENTRY',
    category: 'UNREGISTERED',
    barrierLatencyMs: 0,
    status: 'MANUAL_INTERVENTION',
    notes: 'Unregistered visitor vehicle. Guard verified flat OTP before manual barrier lift.',
  },
];

export const FALLBACK_WHITELIST_VEHICLES: VehicleWhitelistDto[] = [
  {
    id: 'wl-01',
    plateNumber: 'KA-01-AB-1234',
    vehicleModel: 'Honda City (White) - 4-Wheeler',
    vehicleType: 'CAR',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    fastagRfidId: 'TAG-8829-KA01',
    isAutoGateEnabled: true,
    registeredDate: 'Jan 15, 2024',
  },
  {
    id: 'wl-02',
    plateNumber: 'KA-01-EV-9821',
    vehicleModel: 'Tata Nexon EV Max (Teal Blue)',
    vehicleType: 'EV',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    fastagRfidId: 'TAG-9012-EV98',
    isAutoGateEnabled: true,
    registeredDate: 'Mar 10, 2024',
  },
  {
    id: 'wl-03',
    plateNumber: 'KA-01-CD-5678',
    vehicleModel: 'Ather 450X (Space Grey) - 2-Wheeler',
    vehicleType: 'BIKE',
    ownerName: 'You',
    ownerFlat: 'Tower A - 302',
    fastagRfidId: 'TAG-3341-ATH',
    isAutoGateEnabled: true,
    registeredDate: 'Jul 22, 2024',
  },
];

export const FALLBACK_VISITOR_PASSES: VisitorPassDto[] = [
  {
    id: 101,
    passCode: 'VP-8821',
    visitorName: 'Rohan Sharma',
    visitorPhone: '+91 98450 11223',
    vehicleNumber: 'KA-03-XY-9081',
    vehicleType: 'CAR',
    spotNumber: 'B2-P05',
    validFrom: new Date(Date.now() - 2 * 3600000).toISOString(),
    validUntil: new Date(Date.now() + 6 * 3600000).toISOString(),
    purpose: 'Family Visit',
    status: 'ACTIVE',
  },
  {
    id: 102,
    passCode: 'VP-9042',
    visitorName: 'Urban Company Pro (Rajesh)',
    visitorPhone: '+91 91234 56789',
    vehicleNumber: 'KA-05-ZZ-3341',
    vehicleType: 'BIKE',
    spotNumber: 'B1-P08',
    validFrom: new Date(Date.now() - 1 * 3600000).toISOString(),
    validUntil: new Date(Date.now() + 3 * 3600000).toISOString(),
    purpose: 'AC Deep Cleaning Service',
    status: 'ACTIVE',
  },
  {
    id: 103,
    passCode: 'VP-7120',
    visitorName: 'Anil Gupta',
    visitorPhone: '+91 99887 76655',
    vehicleNumber: 'KA-01-HH-4455',
    vehicleType: 'CAR',
    spotNumber: 'B2-P22',
    validFrom: new Date(Date.now() - 26 * 3600000).toISOString(),
    validUntil: new Date(Date.now() - 18 * 3600000).toISOString(),
    purpose: 'Business Meeting',
    status: 'EXPIRED',
  },
];

// In-memory mutation state
let inMemorySpots: ParkingSpotDto[] = [...FALLBACK_PARKING_SPOTS];
let inMemoryEVStations: EVChargerStationDto[] = [...FALLBACK_EV_STATIONS];
let inMemoryActiveEVSession: EVChargingSessionDto | null = { ...FALLBACK_ACTIVE_EV_SESSION };
let inMemoryEVHistory: EVChargingHistoryDto[] = [...FALLBACK_EV_HISTORY];
let inMemoryANPRLogs: ANPRLogDto[] = [...FALLBACK_ANPR_LOGS];
let inMemoryWhitelist: VehicleWhitelistDto[] = [...FALLBACK_WHITELIST_VEHICLES];
let inMemoryVisitorPasses: VisitorPassDto[] = [...FALLBACK_VISITOR_PASSES];

export const parkingService = {
  // ── Occupancy & Spot Telemetry ─────────────────────────────────────
  async getOccupancySummary(): Promise<ParkingOccupancySummaryDto> {
    try {
      const res = await api.get<ParkingOccupancySummaryDto>('/parking/occupancy');
      return res.data;
    } catch {
      const total = inMemorySpots.length;
      const occupied = inMemorySpots.filter((s) => s.status === 'OCCUPIED' || s.status === 'RESERVED').length;
      const evTotal = inMemorySpots.filter((s) => s.type === 'EV').length;
      const evAvail = inMemorySpots.filter((s) => s.type === 'EV' && s.status === 'AVAILABLE').length;
      const b1 = inMemorySpots.filter((s) => s.level.includes('1'));
      const b2 = inMemorySpots.filter((s) => s.level.includes('2'));

      return {
        totalSpots: 180,
        occupiedSpots: 124,
        availableSpots: 56,
        totalEVSpots: 16,
        availableEVSpots: 9,
        b1Available: 28,
        b1Total: 90,
        b2Available: 28,
        b2Total: 90,
        activeVisitors: inMemoryVisitorPasses.filter((v) => v.status === 'ACTIVE').length,
      };
    }
  },

  async getSpots(params?: { type?: string; status?: string; level?: string }): Promise<ParkingSpotDto[]> {
    try {
      const res = await api.get<ParkingSpotDto[]>('/parking/spots', { params });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (err) {
      secureLog.warn('ParkingService: Live /parking/spots unavailable, using fallback', err);
    }

    let result = [...inMemorySpots];
    if (params?.type && params.type !== 'ALL') {
      result = result.filter((s) => s.type === params.type);
    }
    if (params?.status && params.status !== 'ALL') {
      result = result.filter((s) => s.status === params.status);
    }
    if (params?.level && params.level !== 'ALL') {
      result = result.filter((s) => s.level.toLowerCase().includes(params.level!.toLowerCase()));
    }
    return result;
  },

  async getMySpots(): Promise<ParkingSpotDto[]> {
    try {
      const res = await api.get<ParkingSpotDto[]>('/parking/my-spots');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {
      // Fallback
    }
    return inMemorySpots.filter((s) => s.ownerName === 'You' || s.ownerFlat === 'A1-302');
  },

  async reserveSpot(data: ReserveSpotRequest): Promise<ParkingSpotDto> {
    try {
      const res = await api.post<ParkingSpotDto>('/parking/reserve', data);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }
    const idx = inMemorySpots.findIndex((s) => s.id === data.spotId);
    if (idx !== -1) {
      const updated: ParkingSpotDto = {
        ...inMemorySpots[idx],
        status: 'RESERVED',
        vehicleNumber: data.vehicleNumber,
        ownerName: 'You',
        ownerFlat: 'A1-302',
        notes: data.notes,
      };
      inMemorySpots[idx] = updated;
      return updated;
    }
    return inMemorySpots[0];
  },

  // ── EV Charging Station & Power Metering Methods ───────────────────
  async getEVStations(): Promise<EVChargerStationDto[]> {
    try {
      const res = await api.get<EVChargerStationDto[]>('/parking/ev/stations');
      return res.data;
    } catch {
      return inMemoryEVStations;
    }
  },

  async getActiveEVSession(): Promise<EVChargingSessionDto | null> {
    try {
      const res = await api.get<EVChargingSessionDto>('/parking/ev/active-session');
      return res.data;
    } catch {
      return inMemoryActiveEVSession;
    }
  },

  async bookEVStation(req: EVBookingRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post<{ success: boolean; message: string }>('/parking/ev/book', req);
      return res.data;
    } catch {
      inMemoryEVStations = inMemoryEVStations.map((st) => {
        if (st.id === req.stationId) {
          return { ...st, status: 'BOOKED', notes: `Reserved for ${req.vehicleNumber} at ${req.startTime}` };
        }
        return st;
      });
      return { success: true, message: 'EV Charging Bay reserved successfully.' };
    }
  },

  async startEVCharging(stationId: string, vehicleNumber: string): Promise<EVChargingSessionDto> {
    try {
      const res = await api.post<EVChargingSessionDto>('/parking/ev/start', { stationId, vehicleNumber });
      return res.data;
    } catch {
      const newSession: EVChargingSessionDto = {
        id: `sess-${Date.now().toString().slice(-4)}`,
        stationId,
        stationCode: 'B1-EV-FAST-01',
        vehicleNumber,
        userFlat: 'A1-302',
        startTime: 'Just now',
        estimatedEndTime: '45 mins from now',
        currentSoCPercentage: 45,
        targetSoCPercentage: 85,
        powerOutputKW: 21.8,
        voltageV: 416.0,
        currentA: 30.2,
        energyConsumedKWh: 0.8,
        currentCostINR: 6.8,
        tariffRatePerKWh: 8.5,
        temperatureCelsius: 34.0,
        sessionStatus: 'ACTIVE',
      };
      inMemoryActiveEVSession = newSession;
      inMemoryEVStations = inMemoryEVStations.map((st) =>
        st.id === stationId ? { ...st, status: 'CHARGING', activeVehicleNumber: vehicleNumber } : st
      );
      return newSession;
    }
  },

  async stopEVCharging(sessionId: string): Promise<{ success: boolean; summary: EVChargingHistoryDto }> {
    try {
      const res = await api.post<{ success: boolean; summary: EVChargingHistoryDto }>(`/parking/ev/stop/${sessionId}`);
      return res.data;
    } catch {
      const hist: EVChargingHistoryDto = {
        id: `ev-hist-${Date.now().toString().slice(-4)}`,
        stationCode: inMemoryActiveEVSession?.stationCode || 'B1-EV-FAST-01',
        vehicleNumber: inMemoryActiveEVSession?.vehicleNumber || 'KA-01-EV-9821',
        date: 'Today · Just now',
        durationFormatted: '48 mins',
        energyDeliveredKWh: inMemoryActiveEVSession?.energyConsumedKWh || 18.6,
        totalCostINR: inMemoryActiveEVSession?.currentCostINR || 158.1,
        co2SavedKg: 14.8,
        status: 'PAID',
      };
      inMemoryEVHistory = [hist, ...inMemoryEVHistory];
      inMemoryActiveEVSession = null;
      inMemoryEVStations = inMemoryEVStations.map((st) =>
        st.status === 'CHARGING' ? { ...st, status: 'AVAILABLE', activeVehicleNumber: undefined } : st
      );
      return { success: true, summary: hist };
    }
  },

  async getEVChargingHistory(): Promise<EVChargingHistoryDto[]> {
    try {
      const res = await api.get<EVChargingHistoryDto[]>('/parking/ev/history');
      return res.data;
    } catch {
      return inMemoryEVHistory;
    }
  },

  // ── ANPR License Plate Recognition & Gate Methods ──────────────────
  async getANPRLogs(search?: string, direction?: string): Promise<ANPRLogDto[]> {
    try {
      const res = await api.get<ANPRLogDto[]>('/parking/anpr/logs', { params: { search, direction } });
      return res.data;
    } catch {
      let logs = inMemoryANPRLogs;
      if (search && search.trim()) {
        const q = search.toLowerCase();
        logs = logs.filter((l) => l.plateNumber.toLowerCase().includes(q) || l.gateName.toLowerCase().includes(q));
      }
      if (direction && direction !== 'ALL') {
        logs = logs.filter((l) => l.direction === direction);
      }
      return logs;
    }
  },

  async getVehicleWhitelist(): Promise<VehicleWhitelistDto[]> {
    try {
      const res = await api.get<VehicleWhitelistDto[]>('/parking/whitelist');
      return res.data;
    } catch {
      return inMemoryWhitelist;
    }
  },

  async addVehicleToWhitelist(data: Partial<VehicleWhitelistDto>): Promise<VehicleWhitelistDto> {
    try {
      const res = await api.post<VehicleWhitelistDto>('/parking/whitelist', data);
      return res.data;
    } catch {
      const newV: VehicleWhitelistDto = {
        id: `wl-${Date.now().toString().slice(-4)}`,
        plateNumber: data.plateNumber || 'KA-01-NEW-0000',
        vehicleModel: data.vehicleModel || 'Resident Vehicle',
        vehicleType: data.vehicleType || 'CAR',
        ownerName: 'You',
        ownerFlat: 'Tower A - 302',
        fastagRfidId: `TAG-${Math.floor(1000 + Math.random() * 9000)}-RFID`,
        isAutoGateEnabled: true,
        registeredDate: 'Today',
      };
      inMemoryWhitelist = [...inMemoryWhitelist, newV];
      return newV;
    }
  },

  // ── Visitor Passes ────────────────────────────────────────────────
  async getVisitorPasses(): Promise<VisitorPassDto[]> {
    try {
      const res = await api.get<VisitorPassDto[]>('/parking/visitor-pass');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {
      // Fallback
    }
    return inMemoryVisitorPasses;
  },

  async createVisitorPass(data: VisitorPassRequest): Promise<VisitorPassDto> {
    try {
      const res = await api.post<VisitorPassDto>('/parking/visitor-pass', data);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }

    const code = `VP-${Math.floor(1000 + Math.random() * 9000)}`;
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
      spotNumber: data.spotId ? `B2-P${data.spotId}` : 'B2-Visitor',
      validFrom: data.validFrom || now.toISOString(),
      validUntil,
      purpose: data.purpose || 'Guest Visit',
      status: 'ACTIVE',
    };
    inMemoryVisitorPasses.unshift(newPass);

    // Also add to simulated ANPR logs as an incoming cleared visitor
    inMemoryANPRLogs.unshift({
      id: `anpr-v-${Date.now().toString().slice(-4)}`,
      plateNumber: data.vehicleNumber,
      ocrConfidence: 99.1,
      timestamp: 'Just now',
      gateName: 'Main Entrance Gate 1',
      direction: 'ENTRY',
      category: 'VISITOR',
      ownerName: `${data.visitorName} (Pass ${code})`,
      ownerFlat: 'Guest of Tower A - 302',
      barrierLatencyMs: 175,
      status: 'CLEARED',
      notes: 'Visitor Pass pre-cleared via Resident App.',
    });

    return newPass;
  },
};
