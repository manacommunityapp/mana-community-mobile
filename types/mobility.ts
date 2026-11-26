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
  serviceZoneId?: number;
  serviceZoneName?: string;
  currentLat?:   number;
  currentLng?:   number;
  locationUpdatedAt?: string;
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
  receiptNumber?:  string;
  paymentMethod?:  'CASH' | 'ONLINE' | 'UPI' | 'CARD' | 'WALLET';
  paymentStatus:   'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  paymentOrderId?: string;
  paymentRef?:     string;
  gateway?:        string;
  refundStatus?:   'NONE' | 'INITIATED' | 'PROCESSED' | 'FAILED';
  refundAmount?:   number;
  refundRef?:      string;
  platformFee?:    number;
  driverPayout?:   number;
  settled?:        boolean;
  paidAt?:         string;
  serviceZoneId?:  number;
  serviceZoneName?: string;
}

export interface MobilityLocationUpdateDto {
  tripId?:   number;
  driverLat?: number;
  driverLng?: number;
  etaMinutes?: number;
  updatedAt?: string;
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
  settledEarnings?: number;
  currency:         string;
}

// ── Driver Onboarding ────────────────────────────────────────────
export interface RegisterDriverRequest {
  vehicleType:    VehicleType;
  vehicleNumberPlate: string;
  vehicleModel:   string;
  vehicleColor:   string;
  vehicleYear:    number;
  serviceZoneId?: number;
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
  paymentMethod?:  string;
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
  id:        number;
  name:      string;
  centerLat: number;
  centerLng: number;
  radiusKm:  number;
  active:    boolean;
}

export interface ServiceZoneRequest {
  name:      string;
  centerLat: number;
  centerLng: number;
  radiusKm:  number;
  active?:   boolean;
}

export interface MobilityReceiptDto {
  tripId:         number;
  tripRef:        string;
  receiptNumber?: string;
  serviceType:    MobilityServiceType;
  passengerName:  string;
  driverName?:    string;
  vehicleNumber?: string;
  pickupAddress:  string;
  destAddress:    string;
  paymentMethod?: string;
  paymentStatus:  string;
  gateway?:       string;
  paymentOrderId?: string;
  paymentRef?:    string;
  fareAmount:     number;
  platformFee?:   number;
  driverPayout?:  number;
  refundStatus?:  string;
  refundAmount?:  number;
  currency:       string;
  paidAt?:        string;
  completedAt?:   string;
}

export interface MobilityOpsAnalyticsDto {
  totalTrips:              number;
  completedTrips:          number;
  cancelledTrips:          number;
  activeTrips:             number;
  cancellationRatePct:     number;
  grossRevenue:            number;
  onlineRevenue:           number;
  cashRevenue:             number;
  platformFeeRevenue:      number;
  totalRefunded:           number;
  pendingDriverSettlement: number;
  settledDriverPayouts:    number;
  approvedDrivers:         number;
  onlineDrivers:           number;
  averageDriverRating:     number;
  averageTripDurationMin:  number;
  totalCarpoolOffers:      number;
  totalCarpoolSeats:       number;
  bookedCarpoolSeats:      number;
  carpoolUtilizationPct:   number;
  currency:                string;
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
  approved:        boolean;
  rejectReason?:   string;
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
