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

export const broadcastService = {
  async getBroadcastHistory(limit = 20): Promise<Broadcast[]> {
    try {
      const res = await api.get<Broadcast[]>('/admin/broadcasts', { params: { limit } });
      return res.data ?? [];
    } catch {
      return [];
    }
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
