export interface MaintenanceGstResult {
  ruleVersionId: string;
  fyCode: string;
  supplyDate: string;
  totalBilledPaise: number;
  maintenanceBasePaise: number;
  pureAgentExcludedPaise: number;
  gstApplicable: boolean;
  reason: string;
  appliedRateBps: number;
  cgstPaise: number;
  sgstPaise: number;
  totalGstPaise: number;
  grandTotalPaise: number;
  snapshotSha256: string;
}

export interface VendorTdsResult {
  ruleVersionId: string;
  tdsSection: string;
  panValidation: {
    pan: string;
    formatValid: boolean;
    entityTypeChar: string;
    entityCategory: string;
    status: string;
    penal206aaTriggered: boolean;
  };
  grossAmountPaise: number;
  priorCumulativeGrossPaise: number;
  newCumulativeGrossPaise: number;
  thresholdCrossed: boolean;
  catchUpApplied: boolean;
  appliedRateBps: number;
  tdsDeductedPaise: number;
  netPayablePaise: number;
  reason: string;
}

export interface AuditChainVerification {
  societyId: number;
  totalEntries: number;
  chainValid: boolean;
  merkleRoot: string;
  brokenAtSeqNo: number | null;
  message: string;
}

export interface TallyOutboxItem {
  voucherId: string;
  tallyGuid: string;
  voucherNumber: string;
  cloudEntryHash: string;
  syncedPayloadHash: string;
  syncStatus: string;
  tallyXml: string;
}

export interface TallySyncConflict {
  conflictId: string;
  societyId: number;
  voucherId: string;
  tallyGuid: string;
  cloudSnapshot: Record<string, unknown>;
  tallySnapshot: Record<string, unknown>;
  resolutionStatus: string;
  createdAt: string;
}

export interface TallySyncSummary {
  societyId: number;
  pendingOutboxCount: number;
  syncedCount: number;
  openConflictsCount: number;
}
