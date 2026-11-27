import api from './apiClient';
import type {
  DeliveryEvent,
  DeliveryRoutePlan,
  StorageFinOpsSummary,
  TelecomFinOpsSummary,
} from '@/types/finops';

export const finopsService = {
  async dispatchGateAlert(
    societyId: number,
    residentId: string,
    wsOnlineOverride: boolean,
    aggressiveDozeOverride: boolean,
  ): Promise<DeliveryRoutePlan> {
    const res = await api.post<DeliveryRoutePlan>('/finops/delivery/dispatch', {
      societyId,
      residentId,
      visitorType: 'DELIVERY',
      slaMs: 15000,
      wsOnlineOverride,
      aggressiveDozeOverride,
      waOptInOverride: true,
    });
    return res.data;
  },

  async ackGateAlert(alertId: string, channel: string, latencyMs: number): Promise<DeliveryEvent> {
    const res = await api.post<DeliveryEvent>(`/finops/delivery/${alertId}/ack`, { channel, latencyMs });
    return res.data;
  },

  async getTelecomSummary(societyId: number): Promise<TelecomFinOpsSummary> {
    const res = await api.get<TelecomFinOpsSummary>('/finops/delivery/summary', { params: { societyId } });
    return res.data;
  },

  async getStorageSummary(societyId: number): Promise<StorageFinOpsSummary> {
    const res = await api.get<StorageFinOpsSummary>('/finops/storage/summary', { params: { societyId } });
    return res.data;
  },

  async recordCompressionAudit(
    societyId: number,
    assetClass: string,
    originalBytes: number,
    compressedBytes: number,
    format: string,
  ): Promise<StorageFinOpsSummary> {
    const res = await api.post<StorageFinOpsSummary>('/finops/storage/compression-audit', {
      societyId,
      assetClass,
      originalBytes,
      compressedBytes,
      format,
    });
    return res.data;
  },
};
