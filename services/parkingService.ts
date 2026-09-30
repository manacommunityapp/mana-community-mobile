import api from './apiClient';

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

export const parkingService = {
  /**
   * List parking spots with availability and optional filtering by type, status, level.
   */
  async getSpots(params?: { type?: string; status?: string; level?: string }): Promise<ParkingSpotDto[]> {
    const res = await api.get<ParkingSpotDto[]>('/parking/spots', { params });
    return res.data;
  },

  /**
   * Reserve/assign a parking spot for the current resident.
   */
  async reserveSpot(data: ReserveSpotRequest): Promise<ParkingSpotDto> {
    const res = await api.post<ParkingSpotDto>('/parking/reserve', data);
    return res.data;
  },

  /**
   * Get parking spots assigned to the current resident.
   */
  async getMySpots(): Promise<ParkingSpotDto[]> {
    const res = await api.get<ParkingSpotDto[]>('/parking/my-spots');
    return res.data;
  },

  /**
   * Create a temporary visitor parking pass.
   */
  async createVisitorPass(data: VisitorPassRequest): Promise<VisitorPassDto> {
    const res = await api.post<VisitorPassDto>('/parking/visitor-pass', data);
    return res.data;
  },
};
