import api from './apiClient';

export type ExpressEntryMode = 'COURIER_ICON' | 'OTP_6_DIGIT' | 'QR_PASS' | 'GUARD_OVERRIDE_PHOTO';

export interface ExpressCheckinPayload {
  communityId: number;
  gateId: string;
  guardId: number;
  clientSeqId: number;
  entryMode: ExpressEntryMode;
  brandCode?: string;
  flatNo: string;
  photoUrl?: string;
}

export interface ExpressCheckinResult {
  idempotentReplay: boolean;
  audioCue: string;
  checkin: {
    id: number;
    gateId: string;
    clientSeqId: number;
    requiresMcReview: boolean;
  };
}

export function canSubmitGuardExpressTap(entryMode: ExpressEntryMode, photoUrl?: string): boolean {
  if (entryMode === 'GUARD_OVERRIDE_PHOTO') {
    return Boolean(photoUrl && photoUrl.trim().length > 0);
  }
  return true;
}

export async function submitExpressCheckin(payload: ExpressCheckinPayload): Promise<ExpressCheckinResult> {
  const { data } = await api.post<ExpressCheckinResult>('/api/v1/ops/guard-express/checkin', payload);
  return data;
}

export async function evaluateTenantAccountingRule(
  communityId: number,
  ruleKey: string,
  basePaise: number,
): Promise<{
  originalPaise: number;
  previewAdjustedPaise: number;
  effectiveCommittedPaise: number;
  dryRunOnly: boolean;
  ruleApplied: boolean;
}> {
  const { data } = await api.post('/api/v1/ops/accounting-rules/evaluate', {
    communityId,
    ruleKey,
    basePaise,
  });
  return data;
}
