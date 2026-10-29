import api from './apiClient';

export type BusStatus = 'AT_SCHOOL' | 'EN_ROUTE_HOME' | 'EN_ROUTE_SCHOOL' | 'ARRIVED' | 'IDLE';
export type TripDirection = 'TO_SCHOOL' | 'FROM_SCHOOL';

export interface BusLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt: string;
}

export interface BusStop {
  id: number;
  name: string;
  eta?: string;
  reached: boolean;
  reachedAt?: string;
  lat?: number;
  lng?: number;
}

export interface SchoolBus {
  id: number;
  busNumber: string;
  driverName: string;
  driverPhone?: string;
  attendantName?: string;
  attendantPhone?: string;
  schoolName: string;
  routeName: string;
  status: BusStatus;
  currentLocation?: BusLocation;
  stops: BusStop[];
  studentsOnboard?: number;
  capacity?: number;
}

export interface RegisteredChild {
  id: number;
  name: string;
  grade: string;
  schoolName: string;
  busId?: number;
  busNumber?: string;
  stopName?: string;
  residentId?: number;
  flatNumber?: string;
  photo?: string;
}

export interface BusTripLog {
  id: number;
  busId: number;
  direction: TripDirection;
  date: string;
  departureTime?: string;
  arrivalTime?: string;
  childPickedUp: boolean;
  pickedUpAt?: string;
  droppedOffAt?: string;
  notes?: string;
}

export interface RegisterChildRequest {
  name: string;
  grade: string;
  schoolName: string;
  busId?: number;
  stopName?: string;
}

const MOCK_CHILDREN: RegisteredChild[] = [
  { id: 1, name: 'Aarav Kumar', grade: 'Grade 5', schoolName: 'Delhi Public School', busNumber: 'MH-12-3456', stopName: 'Tower A Gate', busId: 1 },
  { id: 2, name: 'Priya Kumar', grade: 'Grade 2', schoolName: 'Delhi Public School', busNumber: 'MH-12-3456', stopName: 'Tower A Gate', busId: 1 },
];

const MOCK_TRIPS: BusTripLog[] = [
  { id: 1, busId: 1, direction: 'FROM_SCHOOL', date: new Date().toISOString().split('T')[0], departureTime: '14:00', arrivalTime: '15:15', childPickedUp: true, pickedUpAt: '14:30', droppedOffAt: '15:15' },
  { id: 2, busId: 1, direction: 'TO_SCHOOL',   date: new Date().toISOString().split('T')[0], departureTime: '07:30', arrivalTime: '08:10', childPickedUp: true, pickedUpAt: '07:35', droppedOffAt: '08:10' },
];

export const schoolBusService = {
  async getMyChildren(): Promise<RegisteredChild[]> {
    try {
      const res = await api.get<RegisteredChild[]>('/school-bus/my-children');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_CHILDREN;
  },

  async getAvailableBuses(schoolName?: string): Promise<SchoolBus[]> {
    try {
      const res = await api.get<SchoolBus[]>('/school-bus/buses', { params: { schoolName } });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getBusById(busId: number): Promise<SchoolBus | null> {
    try {
      const res = await api.get<SchoolBus>(`/school-bus/buses/${busId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async getBusLiveLocation(busId: number): Promise<BusLocation | null> {
    try {
      const res = await api.get<BusLocation>(`/school-bus/buses/${busId}/location`);
      return res.data;
    } catch {
      return null;
    }
  },

  async registerChild(data: RegisterChildRequest): Promise<RegisteredChild> {
    try {
      const res = await api.post<RegisteredChild>('/school-bus/register-child', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to register child. Please try again.');
    }
  },

  async getTripHistory(childId: number, params?: { limit?: number }): Promise<BusTripLog[]> {
    try {
      const res = await api.get<BusTripLog[]>(`/school-bus/children/${childId}/trips`, { params });
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_TRIPS;
  },

  async getTodayTrip(childId: number): Promise<BusTripLog | null> {
    try {
      const res = await api.get<BusTripLog>(`/school-bus/children/${childId}/trips/today`);
      return res.data;
    } catch {
      return null;
    }
  },
};
