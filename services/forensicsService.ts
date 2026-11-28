import api from './apiClient';
import type {
  ForensicVerificationReport,
  TimeTravelReconstruction,
  WormAuditEvent,
} from '@/types/forensics';

export function formatRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  return `${sign}₹${(Math.abs(paise) / 100).toFixed(2)}`;
}

export const forensicsService = {
  async seedB902Scenario(societyId: number): Promise<TimeTravelReconstruction> {
    const res = await api.post<TimeTravelReconstruction>('/forensics/ledger/seed-b902', undefined, {
      params: { societyId },
    });
    return res.data;
  },

  async reconstructMarch31(societyId: number): Promise<TimeTravelReconstruction> {
    const res = await api.post<TimeTravelReconstruction>('/forensics/ledger/time-travel', {
      societyId,
      flatId: 902,
      asOfEffectiveDate: '2026-03-31',
      asOfRecordedAt: '2026-03-31T18:29:59Z',
    });
    return res.data;
  },

  async listAuditEvents(societyId: number): Promise<WormAuditEvent[]> {
    const res = await api.get<WormAuditEvent[]>('/forensics/audit/events', {
      params: { societyId },
    });
    return res.data;
  },

  async verifyIntegrity(societyId: number): Promise<ForensicVerificationReport> {
    const res = await api.get<ForensicVerificationReport>('/forensics/audit/verify', {
      params: { societyId },
    });
    return res.data;
  },

  async anchorMerkleBatch(societyId: number): Promise<void> {
    await api.post('/forensics/audit/anchors', undefined, { params: { societyId } });
  },
};
