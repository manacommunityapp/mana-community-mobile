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

export const intercomService = {
  async getDevices(): Promise<IntercomDevice[]> {
    const res = await api.get<IntercomDevice[]>('/intercom/devices');
    return res.data ?? [];
  },

  async getRecentCalls(limit = 20): Promise<IntercomCall[]> {
    const res = await api.get<IntercomCall[]>('/intercom/calls/recent', { params: { limit } });
    return res.data ?? [];
  },

  async getActiveCall(): Promise<IntercomCall | null> {
    const res = await api.get<IntercomCall | null>('/intercom/calls/active');
    return res.data ?? null;
  },

  async answerCall(req: AnswerCallRequest): Promise<IntercomCall> {
    const res = await api.post<IntercomCall>('/intercom/calls/answer', req);
    return res.data;
  },

  async performCallAction(req: CallActionRequest): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/intercom/calls/action', req);
    return res.data;
  },

  async unlockGateRemote(deviceId: number): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean }>(`/intercom/devices/${deviceId}/unlock`);
    return res.data;
  },
};
