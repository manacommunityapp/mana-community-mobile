import api from './apiClient';
import type {
  AuditChainVerification,
  MaintenanceGstResult,
  TallyOutboxItem,
  TallySyncConflict,
  TallySyncSummary,
  VendorTdsResult,
} from '@/types/accounting';

export const statutoryAccountingService = {
  async calculateMaintenanceGst(
    societyId: number,
    maintPaise: number,
    pureAgentPaise: number,
    gstRegistered: boolean,
  ): Promise<MaintenanceGstResult> {
    const res = await api.post<MaintenanceGstResult>('/accounting/gst/calculate', {
      societyId,
      fyCode: '2026-27',
      supplyDate: new Date().toISOString().slice(0, 10),
      flatNumber: 'A-402',
      voucherNumber: 'MNT/2026-27/MOBILE',
      societyGstRegistered: gstRegistered,
      societyTurnoverPaise: 300_000_000,
      lines: [
        { code: 'MAINT', label: 'Monthly Maintenance', amountPaise: maintPaise, pureAgentPassThrough: false },
        ...(pureAgentPaise > 0
          ? [{ code: 'ELEC', label: 'Electricity Pass-through', amountPaise: pureAgentPaise, pureAgentPassThrough: true }]
          : []),
      ],
      persistSnapshot: false,
    });
    return res.data;
  },

  async calculateVendorTds(
    societyId: number,
    vendorPan: string,
    tdsSection: string,
    grossAmountPaise: number,
    panStatusOverride: 'VALID' | 'INOPERATIVE',
  ): Promise<VendorTdsResult> {
    const res = await api.post<VendorTdsResult>('/accounting/tds/calculate', {
      societyId,
      fyCode: '2026-27',
      creditOrPaymentDate: new Date().toISOString().slice(0, 10),
      voucherNumber: 'PUR/2026-27/MOBILE',
      vendorPan,
      panStatusOverride,
      tdsSection,
      grossAmountPaise,
      persistSnapshot: false,
    });
    return res.data;
  },

  async verifyAuditChain(societyId: number): Promise<AuditChainVerification> {
    const res = await api.get<AuditChainVerification>('/accounting/audit-chain/verify', {
      params: { societyId },
    });
    return res.data;
  },

  async getTallySummary(societyId: number): Promise<TallySyncSummary> {
    const res = await api.get<TallySyncSummary>('/accounting/tally-sync/summary', {
      params: { societyId },
    });
    return res.data;
  },

  async getTallyOutbox(societyId: number): Promise<TallyOutboxItem[]> {
    const res = await api.get<TallyOutboxItem[]>('/accounting/tally-sync/outbox', {
      params: { societyId },
    });
    return res.data;
  },

  async listConflicts(societyId: number): Promise<TallySyncConflict[]> {
    const res = await api.get<TallySyncConflict[]>('/accounting/tally-sync/conflicts', {
      params: { societyId },
    });
    return res.data;
  },

  async resolveConflict(
    conflictId: string,
    societyId: number,
    resolutionAction: 'REVERT_TALLY' | 'ACCEPT_REVERSAL',
  ): Promise<void> {
    await api.post(`/accounting/tally-sync/conflicts/${conflictId}/resolve`, {
      societyId,
      resolutionAction,
    });
  },
};
