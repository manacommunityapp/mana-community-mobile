import api from './apiClient';

export type BroadcastCategory = 'WATER' | 'POWER' | 'SECURITY' | 'MAINTENANCE' | 'EMERGENCY' | 'GENERAL';
export type BroadcastPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BroadcastTarget = 'ALL' | 'BLOCK_A' | 'BLOCK_B' | 'BLOCK_C' | 'OWNERS_ONLY' | 'TENANTS_ONLY';
export type BroadcastStatus = 'SENT' | 'SCHEDULED' | 'FAILED';

export interface Broadcast {
  id: number;
  title: string;
  message: string;
  category: BroadcastCategory;
  priority: BroadcastPriority;
  target: BroadcastTarget;
  sentAt?: string;
  scheduledAt?: string;
  status: BroadcastStatus;
  sentBy: string;
  reachCount?: number;
}

export interface SendBroadcastRequest {
  title: string;
  message: string;
  category: BroadcastCategory;
  priority: BroadcastPriority;
  target: BroadcastTarget;
  scheduledAt?: string;
}

const MOCK_BROADCAST_HISTORY: Broadcast[] = [
  { id: 1, title: 'Water Supply Interruption', message: 'Water supply will be interrupted from 10 AM to 2 PM today due to tank cleaning. Please store water in advance.', category: 'WATER', priority: 'HIGH', target: 'ALL', sentAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), status: 'SENT', sentBy: 'Society Admin', reachCount: 240 },
  { id: 2, title: 'Security Alert — Suspicious Vehicle', message: 'A suspicious vehicle (MH-12-AB-1234, white sedan) has been spotted near Gate 2. Please be alert and report to security.', category: 'SECURITY', priority: 'CRITICAL', target: 'ALL', sentAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), status: 'SENT', sentBy: 'Security Officer', reachCount: 240 },
  { id: 3, title: 'Elevator Maintenance — Tower B', message: 'Tower B elevator will be under maintenance tomorrow (Saturday) from 9 AM to 12 PM. Please use the staircase during this time.', category: 'MAINTENANCE', priority: 'MEDIUM', target: 'BLOCK_B', sentAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), status: 'SENT', sentBy: 'Maintenance Team', reachCount: 80 },
];

export const broadcastService = {
  async getBroadcastHistory(limit = 20): Promise<Broadcast[]> {
    try {
      const res = await api.get<Broadcast[]>('/admin/broadcasts', { params: { limit } });
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_BROADCAST_HISTORY;
  },

  async sendBroadcast(data: SendBroadcastRequest): Promise<Broadcast> {
    try {
      const res = await api.post<Broadcast>('/admin/broadcasts', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to send broadcast. Please try again.');
    }
  },

  async cancelScheduledBroadcast(id: number): Promise<void> {
    try {
      await api.delete(`/admin/broadcasts/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to cancel broadcast.');
    }
  },
};
