export type SettlementMode = 'FLAT_TAB' | 'PREPAID_WALLET' | 'WALLET_WITH_TAB_OVERFLOW';
export type PosAuthMethod = 'PUSH_CHALLENGE' | 'PIN' | 'OFFLINE_QR';
export type FacilityDayCategory = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface FlatTabAccount {
  accountId: string;
  societyId: number;
  flatId: number;
  unitCode: string;
  creditLimitPaise: number;
  unbilledTabPaise: number;
  activeHoldsPaise: number;
  availableCreditPaise: number;
  offlineFloorCapPaise: number;
  billingPreference: SettlementMode;
  overdueFrozen: boolean;
  pinFailedAttempts: number;
  pinLockedUntil: string | null;
}

export interface PosTabChallenge {
  challengeId: string;
  societyId: number;
  flatId: number;
  unitCode: string;
  terminalId: string;
  outletName: string;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  itemsSummary: string;
  authMethod: PosAuthMethod;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED';
  approvedBy: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PosOrder {
  orderId: string;
  societyId: number;
  flatId: number;
  unitCode: string;
  terminalId: string;
  outletName: string;
  clientTxUuid: string;
  itemsSummary: string;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  settlementMode: SettlementMode;
  authMethod: PosAuthMethod;
  status: string;
  provisionalOffline: boolean;
  offlineOverrun: boolean;
  hashChainDigest: string;
  batchId: string | null;
  orderedAt: string;
}

export interface PosAuthorizationResponse {
  outcome: 'CAPTURED' | 'CHALLENGE_PENDING' | 'DECLINED' | 'IDEMPOTENT_REPLAY';
  challenge: PosTabChallenge | null;
  order: PosOrder | null;
  account: FlatTabAccount;
}

export interface GuestSlotBreakdown {
  guestIndex: number;
  pricingTier: string;
  unitPricePaise: number;
  gstPaise: number;
  totalPaise: number;
}

export interface GuestPassQuote {
  societyId: number;
  facilityCode: string;
  flatId: number;
  billingMonth: string;
  visitDate: string;
  dayCategory: FacilityDayCategory;
  freeLimit: number;
  freeConsumed: number;
  freeReserved: number;
  freeRemainingBefore: number;
  freeSlotsAllocated: number;
  paidSlotsRequired: number;
  paidUnitPricePaise: number;
  totalPayablePaise: number;
  breakdown: GuestSlotBreakdown[];
}

export interface GuestAccessPass {
  passId: string;
  societyId: number;
  facilityCode: string;
  flatId: number;
  unitCode: string;
  billingMonth: string;
  visitDate: string;
  guestName: string;
  guestPhone: string | null;
  pricingTier: string;
  unitPricePaise: number;
  gstPaise: number;
  totalPaise: number;
  jti: string;
  qrToken: string;
  status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'CANCELLED';
  entryCount: number;
  maxEntries: number;
  validFrom: string;
  validUntil: string;
  consumedAt: string | null;
}

export interface IssueGuestPassesResponse {
  quote: GuestPassQuote;
  passes: GuestAccessPass[];
}

export interface TurnstileValidateResponse {
  accessGranted: boolean;
  reasonCode: string;
  message: string;
  passId: string | null;
  jti: string | null;
  unitCode: string | null;
  guestName: string | null;
  pricingTier: string | null;
  poolOccupancy: number;
  poolCapacity: number;
}
