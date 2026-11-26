export type JourneyTypeCode = 'OFFICE' | 'SCHOOL' | 'EVENT' | 'SPORTS' | 'RAILWAY' | 'BUS_TERMINAL' | 'AIRPORT';

export interface JourneyTypeConfig {
  code: JourneyTypeCode;
  label: string;
  description: string;
  icon: string;
  hubExamples: string[];
}

export interface JourneyOffer {
  id: number;
  driverUserId?: number;
  driverName: string;
  rating?: number;
  journeyType: JourneyTypeCode;
  journeyDirection?: 'TO_HUB' | 'FROM_HUB';
  hubCode?: string;
  contextName?: string;
  origin: string;
  destination: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  luggageCapacity: number;
  pricePerSeat: number;
  vehicleModel?: string;
  vehicleNumber?: string;
  status: 'ACTIVE' | 'FULL' | 'CANCELLED' | 'COMPLETED';
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  maxDetourKm?: number;
  routeDetourKm?: number;
  allowCrossCommunity?: boolean;
  parentConsentRequired?: boolean;
}

export interface JourneySearchRequest {
  journeyType: JourneyTypeCode;
  direction?: 'TO_HUB' | 'FROM_HUB';
  hubCode: string;
  area?: string;
  travelAt?: string;
  timeWindowMinutes?: number;
  seats?: number;
  luggageCount?: number;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  maxDetourKm?: number;
  allowCrossCommunity?: boolean;
  page?: number;
  size?: number;
}

export interface CreateJourneyRequest {
  journeyType: JourneyTypeCode;
  direction: 'TO_HUB' | 'FROM_HUB';
  hubCode: string;
  area: string;
  contextName?: string;
  travelAt: string;
  timeWindowMinutes: number;
  seats: number;
  luggageCount: number;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  maxDetourKm?: number;
  allowCrossCommunity?: boolean;
  autoReserve?: boolean;
  guardianName?: string;
  guardianPhone?: string;
}

export interface CreateJourneyOfferRequest {
  journeyType: JourneyTypeCode;
  direction: 'TO_HUB' | 'FROM_HUB';
  hubCode: string;
  contextName?: string;
  origin: string;
  destination: string;
  departureTime: string;
  totalSeats: number;
  luggageCapacity: number;
  pricePerSeat: number;
  vehicleModel?: string;
  vehicleNumber?: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  maxDetourKm?: number;
  allowCrossCommunity?: boolean;
  parentConsentRequired?: boolean;
}

export interface JourneyDemand {
  id: number;
  direction: string;
  journeyType: JourneyTypeCode;
  hubCode?: string;
  contextName?: string;
  area: string;
  travelAt: string;
  timeWindowMinutes: number;
  seats: number;
  luggageCount: number;
  status: string;
  createdAt: string;
  allowCrossCommunity?: boolean;
  autoReserve?: boolean;
  maxDetourKm?: number;
  parentConsentRequired?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianConsentStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;
}

export interface JourneySlot {
  id: number;
  journeyType: JourneyTypeCode;
  direction: 'TO_HUB' | 'FROM_HUB';
  hubCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  daysOfWeek: string;
  seatCapacity: number;
  luggageCapacity: number;
  pricePerSeat: number;
  status: 'ACTIVE' | 'PAUSED';
  allowCrossCommunity?: boolean;
  autoGenerate?: boolean;
  maxDetourKm?: number;
}

export interface JourneyMatchProposal {
  id: number;
  requestId: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  offer: JourneyOffer;
}

export interface JourneyBooking {
  id: number;
  offerId: number;
  userId: number;
  userName?: string;
  seats: number;
  status: string;
  bookedAt: string;
  offer: JourneyOffer;
  offerOwner?: boolean;
  totalAmount?: number;
  paymentStatus?: string;
  paymentOrderId?: string;
  paymentRef?: string;
  guardianConsentStatus?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface JourneyPassenger {
  id: number;
  offerId: number;
  userId: number;
  userName?: string;
  seats: number;
  status: string;
  bookedAt: string;
  offer: JourneyOffer;
}

export interface CreateJourneySlotRequest {
  journeyType: JourneyTypeCode;
  direction: 'TO_HUB' | 'FROM_HUB';
  hubCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  daysOfWeek: string;
  seatCapacity: number;
  luggageCapacity: number;
  pricePerSeat: number;
  allowCrossCommunity?: boolean;
  autoGenerate?: boolean;
  maxDetourKm?: number;
}

export interface JourneyPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  number?: number;
  size?: number;
}
