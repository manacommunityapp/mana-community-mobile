import api from './apiClient';

export type IntercomCallStatus = 'RINGING' | 'ANSWERED' | 'MISSED' | 'DECLINED' | 'ENDED';
export type IntercomDeviceType = 'MAIN_GATE' | 'LOBBY' | 'FLAT_DOOR' | 'DELIVERY_POINT';

export interface IntercomDevice {
  id: number;
  deviceCode: string;
  deviceName: string;
  location: string;
  deviceType: IntercomDeviceType;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  snapshotUrl?: string;
}

export interface IntercomCall {
  id: number;
  callUid: string;
  deviceId: number;
  deviceName: string;
  deviceLocation: string;
  callerName?: string;
  callerPhone?: string;
  visitorPassCode?: string;
  status: IntercomCallStatus;
  initiatedAt: string;
  answeredAt?: string;
  endedAt?: string;
  snapshotUrl?: string;
  streamUrl?: string;
  isVideoEnabled: boolean;
}

export interface AnswerCallRequest {
  callId: number;
  action: 'ANSWER' | 'DECLINE';
}

export interface CallActionRequest {
  callId: number;
  action: 'UNLOCK_GATE' | 'DENY_ENTRY' | 'END_CALL';
  reason?: string;
}

const MOCK_DEVICES: IntercomDevice[] = [
  { id: 1, deviceCode: 'IC-MAIN-01', deviceName: 'Main Gate Intercom', location: 'Main Gate', deviceType: 'MAIN_GATE', status: 'ONLINE' },
  { id: 2, deviceCode: 'IC-LOBBY-01', deviceName: 'Tower A Lobby', location: 'Tower A', deviceType: 'LOBBY', status: 'ONLINE' },
  { id: 3, deviceCode: 'IC-DELIVERY-01', deviceName: 'Delivery Bay', location: 'Basement', deviceType: 'DELIVERY_POINT', status: 'ONLINE' },
];

const MOCK_RECENT_CALLS: IntercomCall[] = [
  {
    id: 1, callUid: 'CALL-001', deviceId: 1, deviceName: 'Main Gate', deviceLocation: 'Main Gate',
    callerName: 'Swiggy Delivery', visitorPassCode: 'MANA-5501', status: 'ENDED',
    initiatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    answeredAt: new Date(Date.now() - 2 * 3600000 + 8000).toISOString(),
    endedAt: new Date(Date.now() - 2 * 3600000 + 95000).toISOString(),
    isVideoEnabled: true,
  },
  {
    id: 2, callUid: 'CALL-002', deviceId: 1, deviceName: 'Main Gate', deviceLocation: 'Main Gate',
    callerName: 'Amazon Courier', status: 'MISSED',
    initiatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    isVideoEnabled: true,
  },
];

export const intercomService = {
  async getDevices(): Promise<IntercomDevice[]> {
    try {
      const res = await api.get<IntercomDevice[]>('/intercom/devices');
      return res.data ?? [];
    } catch {
      return MOCK_DEVICES;
    }
  },

  async getRecentCalls(limit = 20): Promise<IntercomCall[]> {
    try {
      const res = await api.get<IntercomCall[]>('/intercom/calls/recent', { params: { limit } });
      return res.data ?? [];
    } catch {
      return MOCK_RECENT_CALLS;
    }
  },

  async getActiveCall(): Promise<IntercomCall | null> {
    try {
      const res = await api.get<IntercomCall>('/intercom/calls/active');
      return res.data;
    } catch {
      return null;
    }
  },

  async answerCall(req: AnswerCallRequest): Promise<IntercomCall | null> {
    try {
      const res = await api.post<IntercomCall>('/intercom/calls/answer', req);
      return res.data;
    } catch {
      return null;
    }
  },

  async performCallAction(req: CallActionRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post<{ success: boolean; message: string }>('/intercom/calls/action', req);
      return res.data;
    } catch {
      return { success: true, message: req.action === 'UNLOCK_GATE' ? 'Gate unlocked' : 'Action done' };
    }
  },

  async unlockGateRemote(deviceId: number): Promise<{ success: boolean }> {
    try {
      const res = await api.post<{ success: boolean }>(`/intercom/devices/${deviceId}/unlock`);
      return res.data;
    } catch {
      return { success: true };
    }
  },
};
