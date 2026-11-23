import { apiClient } from './apiClient';

export interface IoTSensor {
  id: number;
  sensorName: string;
  sensorType: string;
  location: string;
  unit?: string;
  lastReading?: number;
  lastReadingAt?: string;
}

export interface SensorAnomaly {
  id: number;
  sensorId: number;
  eventType: string;
  severity: string;
  description?: string;
  detectedAt: string;
  sensorName?: string;
  location?: string;
}

export const iotService = {
  async getPublicSensors(communityId: number): Promise<IoTSensor[]> {
    const res = await apiClient.get(`/api/iot/sensors/public?communityId=${communityId}`);
    return res.data.data ?? [];
  },

  async getActiveAnomalies(communityId: number): Promise<SensorAnomaly[]> {
    const res = await apiClient.get(`/api/iot/anomalies/active?communityId=${communityId}`);
    return res.data.data ?? [];
  },
};
