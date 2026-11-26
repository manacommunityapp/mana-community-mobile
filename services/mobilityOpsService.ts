import api from './apiClient';
import type { MobilityOpsAnalyticsDto, MobilityServiceZoneDto, ServiceZoneRequest } from '@/types/mobility';

export interface PendingMobilityDocument {
  documentId: number;
  driverId: number;
  driverName: string;
  docType: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface MobilityOpsTrip {
  id: number;
  tripRef?: string;
  serviceType?: string;
  status?: string;
  driver?: { driverId?: number; driverName?: string; vehicleModel?: string; vehicleNumber?: string };
  requestedAt?: string;
}

export const mobilityOpsService = {
  async getPendingDocuments(): Promise<PendingMobilityDocument[]> {
    const res = await api.get<{ content?: PendingMobilityDocument[] }>('/mobility/ops/documents/pending', { params: { page: 0, size: 50 } });
    return res.data?.content ?? [];
  },
  async reviewDocument(driverId: number, documentId: number, approved: boolean): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/documents/${documentId}/review`, { approved, rejectReason: approved ? undefined : 'Rejected by community operations' });
  },
  async getActiveTrips(): Promise<MobilityOpsTrip[]> {
    const res = await api.get<{ content?: MobilityOpsTrip[] }>('/mobility/ops/trips/active', { params: { page: 0, size: 50 } });
    return res.data?.content ?? [];
  },
  async suspendDriver(driverId: number): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/suspend`, { reason: 'Suspended by community operations' });
  },
  async reinstateDriver(driverId: number): Promise<void> {
    await api.post(`/mobility/ops/drivers/${driverId}/reinstate`);
  },
  async getAllServiceZones(): Promise<MobilityServiceZoneDto[]> {
    const res = await api.get<MobilityServiceZoneDto[]>('/mobility/ops/service-zones');
    return res.data ?? [];
  },
  async createServiceZone(req: ServiceZoneRequest): Promise<MobilityServiceZoneDto> {
    const res = await api.post<MobilityServiceZoneDto>('/mobility/ops/service-zones', req);
    return res.data;
  },
  async updateServiceZone(zoneId: number, req: ServiceZoneRequest): Promise<MobilityServiceZoneDto> {
    const res = await api.put<MobilityServiceZoneDto>(`/mobility/ops/service-zones/${zoneId}`, req);
    return res.data;
  },
  async updateServiceZoneStatus(zoneId: number, active: boolean): Promise<MobilityServiceZoneDto> {
    const res = await api.patch<MobilityServiceZoneDto>(`/mobility/ops/service-zones/${zoneId}/status`, { active });
    return res.data;
  },
  async getAnalytics(): Promise<MobilityOpsAnalyticsDto> {
    const res = await api.get<MobilityOpsAnalyticsDto>('/mobility/ops/analytics');
    return res.data;
  },
  async settleDriver(driverId: number): Promise<{ driverId: number; settledAmount: number }> {
    const res = await api.post<{ driverId: number; settledAmount: number }>(`/mobility/ops/drivers/${driverId}/settle`);
    return res.data;
  },
};
