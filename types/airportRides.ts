export type AirportRideDirection = 'TO_AIRPORT' | 'FROM_AIRPORT';
export type AirportRideStatus = 'ACTIVE' | 'FULL' | 'CANCELLED' | 'COMPLETED';

export interface AirportDto {
  code: string;
  name: string;
  city: string;
  timezone?: string;
}

export interface AirportRideDto {
  id: number;
  direction: AirportRideDirection;
  airportCode: string;
  airportName?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalWindowStart?: string;
  arrivalWindowEnd?: string;
  flightNumber?: string;
  terminal?: string;
  totalSeats: number;
  availableSeats: number;
  luggageCapacity?: number;
  pricePerSeat: number;
  driverName: string;
  driverRating?: number;
  vehicleModel?: string;
  vehicleNumber?: string;
  status: AirportRideStatus;
}

export interface AirportRideSearchRequest {
  direction: AirportRideDirection;
  airportCode: string;
  area?: string;
  travelDate: string;
  timeFrom?: string;
  timeTo?: string;
  seats?: number;
  luggageCount?: number;
  page?: number;
  size?: number;
}

export interface CreateAirportRideRequest {
  direction: AirportRideDirection;
  airportCode: string;
  airportName?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalWindowStart?: string;
  arrivalWindowEnd?: string;
  flightNumber?: string;
  terminal?: string;
  totalSeats: number;
  luggageCapacity?: number;
  pricePerSeat: number;
  vehicleModel?: string;
  vehicleNumber?: string;
}

export interface AirportRideDemandRequest {
  id: number;
  direction: AirportRideDirection;
  airportCode: string;
  area: string;
  travelAt: string;
  timeWindowMinutes: number;
  seats: number;
  luggageCount: number;
  flightNumber?: string;
  terminal?: string;
  status: 'OPEN' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

export interface CreateAirportRideDemandRequest {
  direction: AirportRideDirection;
  airportCode: string;
  area: string;
  travelAt: string;
  timeWindowMinutes: number;
  seats: number;
  luggageCount: number;
  flightNumber?: string;
  terminal?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  number?: number;
  size?: number;
}
