import api from './apiClient';

export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type CameraLocation = 'MAIN_GATE' | 'EXIT_GATE' | 'PARKING' | 'LOBBY' | 'CORRIDOR' | 'PLAYGROUND';

export interface Camera {
  id: number;
  name: string;
  location: CameraLocation;
  status: CameraStatus;
  snapshotUrl?: string;
  lastSnapshotAt?: string;
  isNightMode: boolean;
  streamUrl?: string;
}

export interface SnapshotResult {
  url: string;
  capturedAt: string;
}

export const cctvService = {
  async getCameras(): Promise<Camera[]> {
    try {
      const res = await api.get<Camera[]>('/security/cameras');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getSnapshot(cameraId: number): Promise<SnapshotResult | null> {
    try {
      const res = await api.post<SnapshotResult>(`/security/cameras/${cameraId}/snapshot`);
      return res.data;
    } catch {
      return null;
    }
  },

  async refreshSnapshot(cameraId: number): Promise<SnapshotResult | null> {
    try {
      const res = await api.post<SnapshotResult>(`/security/cameras/${cameraId}/snapshot`);
      return res.data;
    } catch {
      return null;
    }
  },
};
