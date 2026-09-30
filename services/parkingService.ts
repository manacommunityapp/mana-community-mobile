import api from './apiClient';
import { secureLog } from '@/security';

export interface ParkingSpotDto {
  id: number;
  spotNumber: string;
  level: string;
  type: 'CAR' | 'BIKE' | 'EV';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  vehicleNumber?: string;
  ownerName?: string;
  ownerFlat?: string;
  assignedUserId?: number;
  communityId?: number;
  notes?: string;
}

export interface ReserveSpotRequest {
  spotId: number;
  vehicleNumber: string;
  vehicleType?: 'CAR' | 'BIKE' | 'EV';
  notes?: string;
}

export interface VisitorPassRequest {
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber: string;
  vehicleType?: 'CAR' | 'BIKE' | 'EV';
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

// ── Structured Hybrid Fallback Dataset ──────────────────────────────
export const FALLBACK_PARKING_SPOTS: ParkingSpotDto[] = [
  { id: 1,  spotNumber: 'B1-P12', level: 'Basement 1', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-01-AB-1234', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 2,  spotNumber: 'B1-P13', level: 'Basement 1', type: 'BIKE', status: 'OCCUPIED',  vehicleNumber: 'KA-01-CD-5678', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 3,  spotNumber: 'B1-EV1', level: 'Basement 1', type: 'EV',   status: 'AVAILABLE', notes: '22kW AC Fast Charger' },
  { id: 4,  spotNumber: 'B1-P08', level: 'Basement 1', type: 'BIKE', status: 'AVAILABLE' },
  { id: 5,  spotNumber: 'B1-P14', level: 'Basement 1', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-02-EE-9011', ownerName: 'Sunil Rao', ownerFlat: 'A2-104' },
  { id: 6,  spotNumber: 'B1-EV3', level: 'Basement 1', type: 'EV',   status: 'RESERVED',  vehicleNumber: 'KA-05-EV-4421', ownerName: 'Rahul K.', ownerFlat: 'B2-201' },
  { id: 7,  spotNumber: 'B2-P05', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 8,  spotNumber: 'B2-P06', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 9,  spotNumber: 'B2-P22', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 10, spotNumber: 'B2-P23', level: 'Basement 2', type: 'BIKE', status: 'AVAILABLE' },
  { id: 11, spotNumber: 'B2-EV2', level: 'Basement 2', type: 'EV',   status: 'AVAILABLE', notes: '7.4kW Type-2 Connector' },
  { id: 12, spotNumber: 'B2-P30', level: 'Basement 2', type: 'CAR',  status: 'OCCUPIED',  vehicleNumber: 'KA-03-MM-7890', ownerName: 'Vikram Joshi', ownerFlat: 'C1-501' },
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

// In-memory mutation buffers for offline continuity
let inMemorySpots: ParkingSpotDto[] = [...FALLBACK_PARKING_SPOTS];
let inMemoryVisitorPasses: VisitorPassDto[] = [...FALLBACK_VISITOR_PASSES];

export const parkingService = {
  /**
   * List parking spots with availability and optional filtering by type, status, level.
   */
  async getSpots(params?: { type?: string; status?: string; level?: string }): Promise<ParkingSpotDto[]> {
    try {
      const res = await api.get<ParkingSpotDto[]>('/parking/spots', { params });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      secureLog.warn('ParkingService: Live /parking/spots unavailable, using fallback spots', err);
    }

    let result = [...inMemorySpots];
    if (params?.type && params.type !== 'ALL') {
      result = result.filter(s => s.type === params.type);
    }
    if (params?.status && params.status !== 'ALL') {
      result = result.filter(s => s.status === params.status);
    }
    if (params?.level && params.level !== 'ALL') {
      result = result.filter(s => s.level.toLowerCase().includes(params.level!.toLowerCase()));
    }
    return result;
  },

  /**
   * Get parking spots assigned to the current resident.
   */
  async getMySpots(): Promise<ParkingSpotDto[]> {
    try {
      const res = await api.get<ParkingSpotDto[]>('/parking/my-spots');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      secureLog.warn('ParkingService: Live /parking/my-spots unavailable, using fallback', err);
    }

    return inMemorySpots.filter(
      s => s.ownerName === 'You' || s.ownerName?.toLowerCase().includes('you') || s.assignedUserId === 1
    );
  },

  /**
   * List visitor passes for the community/user.
   */
  async getVisitorPasses(): Promise<VisitorPassDto[]> {
    try {
      const res = await api.get<VisitorPassDto[]>('/parking/visitor-pass');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      try {
        const res2 = await api.get<any[]>('/visitors/mine');
        if (Array.isArray(res2.data) && res2.data.length > 0) {
          return res2.data.map((v, idx) => ({
            id: v.id || idx + 1,
            passCode: v.passCode || `VP-${1000 + idx}`,
            visitorName: v.visitorName || 'Guest',
            visitorPhone: v.visitorPhone,
            vehicleNumber: v.vehicleNumber || 'N/A',
            vehicleType: v.passType === 'CAR' ? 'CAR' : 'BIKE',
            validFrom: v.expectedAt || new Date().toISOString(),
            validUntil: v.validUntil || new Date(Date.now() + 8 * 3600000).toISOString(),
            purpose: v.purpose || 'Guest Visit',
            status: (v.status || 'ACTIVE') as 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
          }));
        }
      } catch (err) {
        secureLog.warn('ParkingService: Live visitor passes unavailable, using fallback', err);
      }
    }

    return inMemoryVisitorPasses;
  },

  /**
   * Reserve/assign a parking spot for the current resident.
   */
  async reserveSpot(data: ReserveSpotRequest): Promise<ParkingSpotDto> {
    try {
      const res = await api.post<ParkingSpotDto>('/parking/reserve', data);
      if (res.data) return res.data;
    } catch (err) {
      secureLog.warn('ParkingService: /parking/reserve failed, applying resilient fallback reservation', err);
    }

    const idx = inMemorySpots.findIndex(s => s.id === data.spotId);
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

    const simulated: ParkingSpotDto = {
      id: data.spotId,
      spotNumber: `SP-${data.spotId}`,
      level: 'Basement 1',
      type: data.vehicleType || 'CAR',
      status: 'RESERVED',
      vehicleNumber: data.vehicleNumber,
      ownerName: 'You',
      ownerFlat: 'A1-302',
      notes: data.notes,
    };
    inMemorySpots.push(simulated);
    return simulated;
  },

  /**
   * Create a temporary visitor parking pass.
   */
  async createVisitorPass(data: VisitorPassRequest): Promise<VisitorPassDto> {
    try {
      const res = await api.post<VisitorPassDto>('/parking/visitor-pass', data);
      if (res.data) return res.data;
    } catch (err) {
      secureLog.warn('ParkingService: /parking/visitor-pass failed, generating fallback pass', err);
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
      validFrom: data.validFrom || now.toISOString(),
      validUntil,
      purpose: data.purpose || 'Guest Visit',
      status: 'ACTIVE',
    };
    inMemoryVisitorPasses.unshift(newPass);
    return newPass;
  },
};
