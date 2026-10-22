// ── Enumerations ────────────────────────────────────────────────
export type MobilityServiceType = 'CARPOOL' | 'GROUP_RIDE' | 'BIKE' | 'AUTO' | 'CAB';
export type MobilityRideStatus  =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'ARRIVED'
  | 'PICKED_UP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_FOUND'
  | 'EXPIRED';

export type DriverStatus         = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export type DocumentType         =
  | 'DRIVING_LICENCE'
  | 'VEHICLE_RC'
  | 'INSURANCE'
  | 'FITNESS_CERTIFICATE'
  | 'PERMIT'
  | 'PAN_CARD'
  | 'AADHAAR';

export type VehicleType          = 'BIKE' | 'AUTO' | 'MINI_CAB' | 'SEDAN' | 'SUV';
export type MobilityDocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type DriverAvailability    = 'ONLINE' | 'OFFLINE' | 'BUSY';

// ── Location ─────────────────────────────────────────────────────
export interface GeoPoint {
  lat:     number;
  lng:     number;
  address: string;
  placeId?: string;
}

// ── Fare ─────────────────────────────────────────────────────────
export interface MobilityFareQuoteDto {
  quoteId:        string;
  serviceType:    MobilityServiceType;
  baseFare:       number;
  distanceFare:   number;
  durationFare:   number;
  taxes:          number;
  total:          number;
  currency:       string;
  distanceKm:     number;
  etaMinutes:     number;
  expiresAt:      string;
}

export interface FareComponent {
  label:  string;
  amount: number;
}

// ── Driver ───────────────────────────────────────────────────────
export interface MobilityDriverDto {
  id:            number;
  userId:        number;
  driverName:    string;
  profilePhoto?: string;
  rating:        number;
  totalTrips:    number;
  vehicleType:   VehicleType;
  vehicleNumber: string;
  vehicleModel:  string;
  vehicleColor:  string;
  status:        DriverStatus;
  availability:  DriverAvailability;
  phone:         string;
}

// ── Ride Request / Trip ──────────────────────────────────────────
export interface MobilityTripDto {
  id:              number;
  tripRef:         string;
  serviceType:     MobilityServiceType;
  status:          MobilityRideStatus;
  pickup:          GeoPoint;
  destination:     GeoPoint;
  driver?:         MobilityDriverDto;
  fareQuote:       MobilityFareQuoteDto;
  finalFare?:      number;
  pickupPin?:      string;
  requestedAt:     string;
  pickedUpAt?:     string;
  completedAt?:    string;
  cancelledAt?:    string;
  cancellationReason?: string;
  passengerName:   string;
  passengerPhone:  string;
  rating?:         number;
  receiptUrl?:     string;
  paymentStatus:   'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
}

export interface MobilityLocationUpdateDto {
  tripId:    number;
  driverLat: number;
  driverLng: number;
  etaMinutes?: number;
  updatedAt: string;
}

// ── Driver Documents ─────────────────────────────────────────────
export interface MobilityDriverDocumentDto {
  id:            number;
  type:          DocumentType;
  fileUrl:       string;
  status:        MobilityDocumentStatus;
  expiresAt?:    string;
  rejectedReason?: string;
  uploadedAt:    string;
}

// ── Driver Vehicle ───────────────────────────────────────────────
export interface MobilityVehicleDto {
  id:          number;
  vehicleType: VehicleType;
  number:      string;
  model:       string;
  color:       string;
  year:        number;
  isActive:    boolean;
}

// ── Driver Earnings ──────────────────────────────────────────────
export interface DriverEarningsSummaryDto {
  todayEarnings:    number;
  weekEarnings:     number;
  monthEarnings:    number;
  totalTrips:       number;
  pendingSettlement: number;
  currency:         string;
}

// ── Driver Onboarding ────────────────────────────────────────────
export interface RegisterDriverRequest {
  vehicleType:    VehicleType;
  vehicleNumber:  string;
  vehicleModel:   string;
  vehicleColor:   string;
  vehicleYear:    number;
  serviceZoneIds: number[];
}

// ── Ride Requests ────────────────────────────────────────────────
export interface CreateRideRequest {
  serviceType:     MobilityServiceType;
  pickupLat:       number;
  pickupLng:       number;
  pickupAddress:   string;
  destLat:         number;
  destLng:         number;
  destAddress:     string;
  quoteId:         string;
  idempotencyKey:  string;
  scheduledAt?:    string;
}

export interface FareQuoteRequest {
  serviceType:   MobilityServiceType;
  pickupLat:     number;
  pickupLng:     number;
  destLat:       number;
  destLng:       number;
}

export interface CancelRideRequest {
  reason: string;
}

export interface RateTripRequest {
  rating:   number;
  feedback?: string;
}

// ── Stats ────────────────────────────────────────────────────────
export interface MobilityStatsDto {
  activeTrips:      number;
  completedTrips:   number;
  cancelledTrips:   number;
  totalSpent:       number;
  currency:         string;
}

// ── Service Zone ─────────────────────────────────────────────────
export interface MobilityServiceZoneDto {
  id:          number;
  name:        string;
  description?: string;
  isActive:    boolean;
}

// ── Ops / Admin ──────────────────────────────────────────────────
export interface PendingDocumentReviewDto {
  driverId:    number;
  driverName:  string;
  documentId:  number;
  documentType: DocumentType;
  fileUrl:     string;
  uploadedAt:  string;
}

export interface ReviewDocumentRequest {
  status:          'APPROVED' | 'REJECTED';
  rejectedReason?: string;
}

// ── Carpool (community) ──────────────────────────────────────────
export interface MobilityOffer {
  id:            number;
  driverName:    string;
  driverPhoto?:  string;
  origin:        string;
  destination:   string;
  departureTime: string;
  totalSeats:    number;
  availableSeats: number;
  pricePerSeat:  number;
  currency:      string;
  vehicleModel?: string;
  vehicleNumber?: string;
  rating:        number;
}

// ── Incoming offer (driver side) ─────────────────────────────────
export interface DriverRideOfferDto {
  offerId:       string;
  tripId:        number;
  passengerName: string;
  pickupAddress: string;
  destAddress:   string;
  fareAmount:    number;
  distanceKm:    number;
  expiresAt:     string;
}

export interface AcceptRejectOfferRequest {
  accept: boolean;
}
