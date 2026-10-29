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

const MOCK_CAMERAS: Camera[] = [
  { id: 1, name: 'Main Gate',     location: 'MAIN_GATE',  status: 'ONLINE',      isNightMode: false },
  { id: 2, name: 'Exit Gate',     location: 'EXIT_GATE',  status: 'ONLINE',      isNightMode: false },
  { id: 3, name: 'Parking A',     location: 'PARKING',    status: 'ONLINE',      isNightMode: false },
  { id: 4, name: 'Lobby Tower A', location: 'LOBBY',      status: 'OFFLINE',     isNightMode: false },
  { id: 5, name: 'Lobby Tower B', location: 'LOBBY',      status: 'MAINTENANCE', isNightMode: false },
  { id: 6, name: 'Playground',    location: 'PLAYGROUND', status: 'ONLINE',      isNightMode: true, lastSnapshotAt: new Date(Date.now() - 5 * 60000).toISOString() },
];

export const cctvService = {
  async getCameras(): Promise<Camera[]> {
    try {
      const res = await api.get<Camera[]>('/security/cameras');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_CAMERAS;
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
