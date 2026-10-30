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
    const res = await api.get<Camera[]>('/security/cameras');
    return res.data ?? [];
  },

  async getSnapshot(cameraId: number): Promise<SnapshotResult> {
    const res = await api.post<SnapshotResult>(`/security/cameras/${cameraId}/snapshot`);
    return res.data;
  },

  async refreshSnapshot(cameraId: number): Promise<SnapshotResult> {
    const res = await api.post<SnapshotResult>(`/security/cameras/${cameraId}/snapshot`);
    return res.data;
  },
};
