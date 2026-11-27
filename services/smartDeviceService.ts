import api from './apiClient';
import type { ApiEnvelope } from './apiClient';

export type DeviceType = 'FLAT_DOOR' | 'MAIN_GATE' | 'LOBBY_BARRIER' | 'PARKING_BARRIER' | 'ELEVATOR';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'LOCKED' | 'MAINTENANCE';
export type DeviceAction = 'UNLOCK' | 'LOCK' | 'OPEN' | 'CLOSE';

export interface SmartDevice {
  id: number;
  deviceCode: string;
  deviceName: string;
  location: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  supportsVisitorOtp: boolean;
  lastActionAt?: string;
  lastActionBy?: string;
}

export interface DeviceControlResponse {
  deviceId: number;
  action: DeviceAction;
  success: boolean;
  message: string;
  executedAt: string;
}

export interface VisitorOtpResponse {
  otp: string;
  deviceId: number;
  visitorName: string;
  validUntil: string;
  validMinutes: number;
}

export const smartDeviceService = {
  async getMyDevices(): Promise<SmartDevice[]> {
    const res = await api.get<ApiEnvelope<SmartDevice[]> | SmartDevice[]>(
      '/api/v1/smart-devices/my',
    );
    const d = res.data as any;
    return Array.isArray(d) ? d : (d?.data ?? []);
  },

  async control(deviceId: number, action: DeviceAction): Promise<DeviceControlResponse> {
    const res = await api.post<ApiEnvelope<DeviceControlResponse>>(
      `/api/v1/smart-devices/${deviceId}/control`,
      { action },
    );
    const d = res.data as any;
    return d?.data ?? d;
  },

  async issueVisitorOtp(
    deviceId: number,
    visitorName: string,
    validMinutes: number,
  ): Promise<VisitorOtpResponse> {
    const res = await api.post<ApiEnvelope<VisitorOtpResponse>>(
      `/api/v1/smart-devices/${deviceId}/visitor-otp`,
      { visitorName, validMinutes },
    );
    const d = res.data as any;
    return d?.data ?? d;
  },

  async issueOfflineTimeBoundPin(
    deviceId: number,
    visitorName: string,
    validFromIso: string,
    validUntilIso: string,
    singleUse = true,
  ): Promise<any> {
    const res = await api.post<ApiEnvelope<any>>(
      `/api/devices/${deviceId}/offline-pin`,
      { visitorName, validFrom: validFromIso, validUntil: validUntilIso, singleUse },
    );
    const d = res.data as any;
    return d?.data ?? d;
  },
};
