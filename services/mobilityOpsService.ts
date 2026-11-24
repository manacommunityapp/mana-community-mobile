import api from './apiClient';

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
};
