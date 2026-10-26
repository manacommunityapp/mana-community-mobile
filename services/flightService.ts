import api from './apiClient';

// ── Request/Response types ──────────────────────────────────────────────────

export interface FlightSearchRequest {
  origin: string;          // IATA code e.g. 'BLR'
  destination: string;     // IATA code e.g. 'GOI'
  departureDate: string;   // ISO date e.g. '2026-11-15'
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  directOnly?: boolean;
}

export interface FlightSegment {
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  aircraftType?: string;
  originCode: string;
  originCity: string;
  originTerminal?: string;
  originTime: string;        // ISO datetime
  destinationCode: string;
  destinationCity: string;
  destinationTerminal?: string;
  destinationTime: string;   // ISO datetime
  durationMinutes: number;
  stopCount: number;
  cabinBaggage?: number;     // kg
  checkInBaggage?: number;   // kg
  mealIncluded?: boolean;
}

export interface FareInfo {
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;         // per adult
  totalFareAllPax: number;
  adults: number;
  children: number;
  infants: number;
}

export interface FlightOption {
  optionId: string;
  segments: FlightSegment[];
  fare: FareInfo;
  totalDurationMinutes: number;
  stops: number;
  refundable: boolean;
  fareIdentifier?: string;
}

export interface FlightSearchResponse {
  searchId: string;
  flights: FlightOption[];
  totalResults: number;
  currency: string;
}

export interface FlightFareQuoteResponse {
  optionId: string;
  priceChanged: boolean;
  previousTotalFare: number;
  currentTotalFare: number;
  baseFare: number;
  taxesAndFees: number;
  totalFareAllPax: number;
  seatsAvailable: number;
  available: boolean;
  fareIdentifier?: string;
  expiresAt?: string;
}

export interface PassengerInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  passengerType: 'ADULT' | 'CHILD' | 'INFANT';
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  seatPreference?: 'WINDOW' | 'AISLE' | 'MIDDLE';
  mealPreference?: 'VEG' | 'NON_VEG' | 'JAIN' | 'VEGAN';
  extraBaggageKg?: number;
}

export interface FlightBookRequest {
  searchId: string;
  optionId: string;
  passengers: PassengerInfo[];
  contactEmail?: string;
  contactPhone?: string;
}

export interface FlightBookResponse {
  bookingId: string;
  airlinePnr: string;
  tripjackOrderId?: string;
  status: 'HOLD' | 'TICKETED' | 'FAILED';
  totalAmount: number;
  currency: string;
  holdExpiresAt?: string;
  paymentRef?: string;
}

export interface FlightTicketRequest {
  bookingId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface FlightTicketResponse {
  bookingId: string;
  airlinePnr: string;
  status: 'TICKETED' | 'FAILED';
  eTicketUrl?: string;
  eTicketNumbers?: string[];
  totalPaid: number;
  issuedAt?: string;
  airline?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
}

// ── API calls ───────────────────────────────────────────────────────────────

export const flightService = {
  search: (req: FlightSearchRequest): Promise<FlightSearchResponse> =>
    api.post<FlightSearchResponse>('/flights/search', req).then(r => r.data),

  fareQuote: (searchId: string, optionId: string): Promise<FlightFareQuoteResponse> =>
    api.post<FlightFareQuoteResponse>('/flights/fare-quote', { searchId, optionId }).then(r => r.data),

  book: (req: FlightBookRequest): Promise<FlightBookResponse> =>
    api.post<FlightBookResponse>('/flights/book', req).then(r => r.data),

  issueTicket: (req: FlightTicketRequest): Promise<FlightTicketResponse> =>
    api.post<FlightTicketResponse>('/flights/ticket', req).then(r => r.data),
};
