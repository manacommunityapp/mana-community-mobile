import api from './apiClient';

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type HandoverStatus = 'PENDING' | 'ACKNOWLEDGED';

export interface HandoverItem {
  id: number;
  category: 'VISITOR' | 'VEHICLE' | 'INCIDENT' | 'MAINTENANCE' | 'OTHER';
  description: string;
  resolvedBefore: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ShiftHandover {
  id: number;
  shiftType: ShiftType;
  date: string;
  outgoingGuardName: string;
  incomingGuardName?: string;
  handoverTime: string;
  items: HandoverItem[];
  notes?: string;
  status: HandoverStatus;
  acknowledgedAt?: string;
}

export interface CreateHandoverRequest {
  shiftType: ShiftType;
  items: Omit<HandoverItem, 'id'>[];
  notes?: string;
}

const _TODAY = new Date().toISOString().split('T')[0];

const MOCK_TODAY_HANDOVERS: ShiftHandover[] = [
  {
    id: 1, shiftType: 'MORNING', date: _TODAY,
    outgoingGuardName: 'Ramesh Kumar', incomingGuardName: 'Suresh Yadav',
    handoverTime: '14:00', status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString(),
    notes: 'All clear. Parking B light bulb needs replacement.',
    items: [
      { id: 1, category: 'VISITOR',     description: 'Visitor in Flat 1204 Tower A expected until 16:00', resolvedBefore: false, priority: 'MEDIUM' },
      { id: 2, category: 'MAINTENANCE', description: 'Parking B light bulb flickering', resolvedBefore: false, priority: 'LOW' },
    ],
  },
  {
    id: 2, shiftType: 'AFTERNOON', date: _TODAY,
    outgoingGuardName: 'Suresh Yadav',
    handoverTime: '22:00', status: 'PENDING',
    items: [
      { id: 3, category: 'INCIDENT',    description: 'Suspicious vehicle KA-04-XX-1234 circled compound twice at 19:30', resolvedBefore: false, priority: 'HIGH' },
      { id: 4, category: 'VISITOR',     description: 'Delivery pending collection at gate — Flat 308 Tower B', resolvedBefore: false, priority: 'MEDIUM' },
      { id: 5, category: 'MAINTENANCE', description: 'Main gate camera offline since 18:00, reported to IT', resolvedBefore: false, priority: 'HIGH' },
    ],
  },
];

const MOCK_HANDOVER_HISTORY: ShiftHandover[] = [
  { id: 10, shiftType: 'NIGHT',    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], outgoingGuardName: 'Mohan Lal',    handoverTime: '06:00', status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString(), items: [{ id: 10, category: 'OTHER',   description: 'Quiet night, no incidents', resolvedBefore: true, priority: 'LOW' }] },
  { id: 11, shiftType: 'MORNING',  date: new Date(Date.now() - 86400000).toISOString().split('T')[0], outgoingGuardName: 'Ramesh Kumar', handoverTime: '14:00', status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString(), items: [{ id: 11, category: 'VISITOR', description: 'Package left at gate for Flat 502 Tower A', resolvedBefore: true, priority: 'LOW' }] },
];

export const shiftHandoverService = {
  async getTodayHandovers(): Promise<ShiftHandover[]> {
    try {
      const res = await api.get<ShiftHandover[]>('/guard/handovers/today');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_TODAY_HANDOVERS;
  },

  async getHandoverHistory(limit?: number): Promise<ShiftHandover[]> {
    try {
      const res = await api.get<ShiftHandover[]>('/guard/handovers', { params: { limit } });
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_HANDOVER_HISTORY;
  },

  async createHandover(data: CreateHandoverRequest): Promise<ShiftHandover> {
    try {
      const res = await api.post<ShiftHandover>('/guard/handovers', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create handover log.');
    }
  },

  async acknowledgeHandover(id: number): Promise<ShiftHandover> {
    try {
      const res = await api.patch<ShiftHandover>(`/guard/handovers/${id}/acknowledge`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to acknowledge handover.');
    }
  },
};
