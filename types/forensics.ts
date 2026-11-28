export type SensitiveActionType =
  | 'PENALTY_WAIVER'
  | 'VENDOR_BLACKLIST'
  | 'VISITOR_SOFT_DELETED'
  | 'GUARD_SHIFT_OVERRIDE'
  | 'CREDIT_NOTE_BACKDATED';

export type AuditRiskTier = 'STANDARD' | 'HIGH' | 'CRITICAL';

export interface BitemporalLedgerEvent {
  eventId: string;
  societyId: number;
  flatId: number;
  unitCode: string;
  streamVersion: number;
  eventType: string;
  effectiveDate: string;
  recordedAt: string;
  signedAmountPaise: number;
  reasonCode: string;
  eventHash: string;
}

export interface TimeTravelReconstruction {
  societyId: number;
  flatId: number;
  unitCode: string;
  asOfEffectiveDate: string;
  asOfRecordedAt: string;
  asKnownBalancePaise: number;
  restatedBalancePaise: number;
  liveCurrentBalancePaise: number;
  retroactiveVariancePaise: number;
  eventsReplayedFromCheckpoint: number;
  retroactiveAdjustments: BitemporalLedgerEvent[];
}

export interface WormAuditEvent {
  auditId: string;
  seqNo: number;
  actionType: SensitiveActionType;
  riskTier: AuditRiskTier;
  resourceId: string;
  actorName: string;
  checkerName?: string | null;
  tombstoned: boolean;
  recordHash: string;
}

export interface ForensicVerificationReport {
  societyId: number;
  totalLocalEvents: number;
  totalExternalAnchors: number;
  chainValid: boolean;
  signaturesValid: boolean;
  externalAnchorMatch: boolean;
  tailTruncationDetected: boolean;
  firstBrokenSeqNo?: number | null;
  failureReason: string;
}
