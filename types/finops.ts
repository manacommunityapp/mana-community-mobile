export interface EscalationStep {
  channel: 'FCM_PUSH' | 'WHATSAPP_UTILITY' | 'DLT_SMS' | 'PSTN_IVR' | string;
  costPaise: number;
  triggerAtMs: number;
  timeoutMs: number;
}

export interface DeliveryRoutePlan {
  alertId: string;
  societyId: number;
  residentId: string;
  slaMs: number;
  initialChannel: string;
  currentChannel: string;
  currentCostPaise: number;
  baselineIvrCostPaise: number;
  projectedSavingsPaise: number;
  status: string;
  routingReason: string;
  explorationProbe: boolean;
  escalationPath: EscalationStep[];
}

export interface DeliveryEvent {
  alertId: string;
  societyId: number;
  residentId: string;
  initialChannel: string;
  currentChannel: string;
  winningChannel?: string;
  resolvedLatencyMs?: number;
  slaMet?: boolean;
  totalCostPaise: number;
  savingsPaise: number;
  status: string;
}

export interface TelecomFinOpsSummary {
  societyId: number;
  totalAlerts: number;
  resolvedCount: number;
  slaCompliancePct: number;
  avgLatencyMs: number;
  actualSpendPaise: number;
  baselineIvrSpendPaise: number;
  totalSavedPaise: number;
}

export interface StorageTierPolicy {
  assetClass: string;
  targetFormat: string;
  hotTier: string;
  hotDays: number;
  warmTier: string;
  warmDays: number;
  archiveTier: string;
  retentionDays: number;
  minBillableKb: number;
  notes: string;
}

export interface StorageFinOpsSummary {
  societyId: number;
  totalObjectsTracked: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  compressionSavingsPct: number;
  estimatedMonthlyS3SavedPaise: number;
  policies: StorageTierPolicy[];
}
