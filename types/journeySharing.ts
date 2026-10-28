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
}

export interface JourneyPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  number?: number;
  size?: number;
}
