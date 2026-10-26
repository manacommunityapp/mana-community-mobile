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

export const shiftHandoverService = {
  async getTodayHandovers(): Promise<ShiftHandover[]> {
    try {
      const res = await api.get<ShiftHandover[]>('/guard/handovers/today');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getHandoverHistory(limit?: number): Promise<ShiftHandover[]> {
    try {
      const res = await api.get<ShiftHandover[]>('/guard/handovers', { params: { limit } });
      return res.data ?? [];
    } catch {
      return [];
    }
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
