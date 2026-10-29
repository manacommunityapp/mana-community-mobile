import api from './apiClient';
import { secureLog } from '@/security';
import type {
  MobilityTripDto, MobilityFareQuoteDto, MobilityDriverDto,
  MobilityDriverDocumentDto, MobilityVehicleDto, DriverEarningsSummaryDto,
  MobilityStatsDto, MobilityServiceZoneDto, MobilityLocationUpdateDto,
  PendingDocumentReviewDto, DriverRideOfferDto, MobilityOffer,
  CreateRideRequest, FareQuoteRequest, CancelRideRequest, RateTripRequest,
  RegisterDriverRequest, ReviewDocumentRequest, AcceptRejectOfferRequest,
} from '@/types/mobility';
import type { PageResponse } from '@/types/api';

// Mock fare data per service type (used when backend returns an error)
const MOCK_FARE_BASE: Record<string, { base: number; rate: number; eta: number }> = {
  BIKE:       { base: 25,  rate: 5,  eta: 3  },
  AUTO:       { base: 40,  rate: 8,  eta: 5  },
  CAB:        { base: 70,  rate: 12, eta: 7  },
  CARPOOL:    { base: 20,  rate: 4,  eta: 6  },
  GROUP_RIDE: { base: 15,  rate: 3,  eta: 10 },
};

function mockFareQuote(req: FareQuoteRequest): MobilityFareQuoteDto {
  const m = MOCK_FARE_BASE[req.serviceType] ?? MOCK_FARE_BASE.CAB;
  const distKm = Math.round(3 + Math.random() * 7);
  const baseFare     = m.base;
  const distanceFare = distKm * m.rate;
  const durationFare = Math.round(distKm * 1.5);
  const taxes        = Math.round((baseFare + distanceFare + durationFare) * 0.05);
  return {
    quoteId:      `mock-${req.serviceType}-${Date.now()}`,
    serviceType:  req.serviceType,
    baseFare,
    distanceFare,
    durationFare,
    taxes,
    total:        baseFare + distanceFare + durationFare + taxes,
    currency:     'INR',
    distanceKm:   distKm,
    etaMinutes:   m.eta,
    expiresAt:    new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

// ── Passenger ────────────────────────────────────────────────────
export const mobilityPassengerService = {
  async getFareQuote(req: FareQuoteRequest): Promise<MobilityFareQuoteDto> {
    try {
      const res = await api.post<MobilityFareQuoteDto>('/mobility/fare-quote', req);
      if (res.data?.quoteId) return res.data;
    } catch {
      // fall through to mock
    }
    return mockFareQuote(req);
  },

  async requestRide(req: CreateRideRequest): Promise<MobilityTripDto> {
    const res = await api.post<MobilityTripDto>('/mobility/trips', req);
    return res.data;
  },

  async getActiveTrip(): Promise<MobilityTripDto | null> {
    try {
      const res = await api.get<MobilityTripDto | null>('/mobility/trips/active');
      return res.data;
    } catch {
      return null;
    }
  },

  async getTrip(id: number): Promise<MobilityTripDto> {
    const res = await api.get<MobilityTripDto>(`/mobility/trips/${id}`);
    return res.data;
  },

  async getTripHistory(page = 0): Promise<PageResponse<MobilityTripDto>> {
    const res = await api.get<PageResponse<MobilityTripDto>>('/mobility/trips/history', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async cancelRide(tripId: number, req: CancelRideRequest): Promise<MobilityTripDto> {
    const res = await api.post<MobilityTripDto>(`/mobility/trips/${tripId}/cancel`, req);
    return res.data;
  },

  async rateTrip(tripId: number, req: RateTripRequest): Promise<void> {
    await api.post(`/mobility/trips/${tripId}/rate`, req);
  },

  async getDriverLocation(tripId: number): Promise<MobilityLocationUpdateDto> {
    const res = await api.get<MobilityLocationUpdateDto>(`/mobility/trips/${tripId}/location`);
    return res.data;
  },

  async getStats(): Promise<MobilityStatsDto> {
    try {
      const res = await api.get<MobilityStatsDto>('/mobility/stats');
      if (res.data) {
        return {
          activeTrips: res.data.activeTrips ?? 0,
          completedTrips: res.data.completedTrips ?? 0,
          cancelledTrips: res.data.cancelledTrips ?? 0,
          totalSpent: Number(res.data.totalSpent) || 0,
          currency: res.data.currency || 'INR',
        };
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        secureLog.warn('MobilityService: getStats fallback', err?.message || err);
      }
    }
    return {
      activeTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      totalSpent: 0,
      currency: 'INR',
    };
  },

  async getServiceZones(): Promise<MobilityServiceZoneDto[]> {
    const res = await api.get<MobilityServiceZoneDto[]>('/mobility/service-zones');
    return res.data;
  },
};

// ── Driver ───────────────────────────────────────────────────────
export const mobilityDriverService = {
  async getMyProfile(): Promise<MobilityDriverDto | null> {
    const res = await api.get<MobilityDriverDto | null>('/mobility/driver/profile');
    return res.data;
  },

  async register(req: RegisterDriverRequest): Promise<MobilityDriverDto> {
    const res = await api.post<MobilityDriverDto>('/mobility/driver/register', req);
    return res.data;
  },

  async setAvailability(availability: 'ONLINE' | 'OFFLINE'): Promise<void> {
    await api.patch('/mobility/driver/availability', { availability });
  },

  async getDocuments(): Promise<MobilityDriverDocumentDto[]> {
    const res = await api.get<MobilityDriverDocumentDto[]>('/mobility/driver/documents');
    return res.data;
  },

  async uploadDocument(formData: FormData): Promise<MobilityDriverDocumentDto> {
    const res = await api.post<MobilityDriverDocumentDto>('/mobility/driver/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getVehicles(): Promise<MobilityVehicleDto[]> {
    const res = await api.get<MobilityVehicleDto[]>('/mobility/driver/vehicles');
    return res.data;
  },

  async getEarnings(): Promise<DriverEarningsSummaryDto> {
    const res = await api.get<DriverEarningsSummaryDto>('/mobility/driver/earnings');
    return res.data;
  },

  async getPendingOffer(): Promise<DriverRideOfferDto | null> {
    const res = await api.get<DriverRideOfferDto | null>('/mobility/driver/offer');
    return res.data;
  },

  async respondToOffer(offerId: string, req: AcceptRejectOfferRequest): Promise<void> {
    await api.post(`/mobility/driver/offer/${offerId}/respond`, req);
  },

  async getActiveTrip(): Promise<MobilityTripDto | null> {
    const res = await api.get<MobilityTripDto | null>('/mobility/driver/trip/active');
    return res.data;
  },

  async updateTripStatus(tripId: number, status: 'ARRIVED' | 'PICKED_UP' | 'COMPLETED'): Promise<MobilityTripDto> {
    const res = await api.patch<MobilityTripDto>(`/mobility/driver/trip/${tripId}/status`, { status });
    return res.data;
  },

  async verifyPickupPin(tripId: number, pin: string): Promise<boolean> {
    const res = await api.post<{ valid: boolean }>(`/mobility/driver/trip/${tripId}/verify-pin`, { pin });
    return res.data.valid;
  },
};

// ── Community Carpool (Mobility variant) ────────────────────────
export const mobilityCarpoolService = {
  async getOffers(origin?: string, page = 0): Promise<PageResponse<MobilityOffer>> {
    const res = await api.get<PageResponse<MobilityOffer>>('/mobility/carpool/offers', {
      params: { origin, page, size: 20 },
    });
    return res.data;
  },

  async getOffer(id: number): Promise<MobilityOffer> {
    const res = await api.get<MobilityOffer>(`/mobility/carpool/offers/${id}`);
    return res.data;
  },

  async joinOffer(offerId: number, seats: number): Promise<void> {
    await api.post(`/mobility/carpool/offers/${offerId}/join`, { seats });
  },

  async createOffer(data: {
    origin: string; destination: string; departureTime: string;
    totalSeats: number; pricePerSeat: number; vehicleModel?: string; vehicleNumber?: string;
  }): Promise<MobilityOffer> {
    const res = await api.post<MobilityOffer>('/mobility/carpool/offers', data);
    return res.data;
  },
};

// ── Ops / Admin ──────────────────────────────────────────────────
export const mobilityOpsService = {
  async getPendingDocuments(page = 0): Promise<PageResponse<PendingDocumentReviewDto>> {
    const res = await api.get<PageResponse<PendingDocumentReviewDto>>('/mobility/ops/documents/pending', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async reviewDocument(driverId: number, documentId: number, req: ReviewDocumentRequest): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/documents/${documentId}/review`, req);
  },

  async getActiveTrips(page = 0): Promise<PageResponse<MobilityTripDto>> {
    const res = await api.get<PageResponse<MobilityTripDto>>('/mobility/ops/trips/active', {
      params: { page, size: 50 },
    });
    return res.data;
  },

  async suspendDriver(driverId: number, reason: string): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/suspend`, { reason });
  },

  async reinstateDriver(driverId: number): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/reinstate`);
  },
};
