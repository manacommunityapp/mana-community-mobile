export interface VoucherTokenPayload {
  v: 1;
  vid: string;
  uid: string;
  cid: string;
  sid: string;
  iat: number;
  exp: number;
  nonce: string;
}

export interface SignedVoucherToken {
  payload: VoucherTokenPayload;
  hmacSuffix: string;
  totpSecret: string;
}

export type VoucherStatus = 'UNCLAIMED' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

export interface SampleVoucher {
  id: string;
  campaignId: string;
  campaignName: string;
  brandName: string;
  brandLogoUrl?: string;
  productName: string;
  productImageUrl?: string;
  description?: string;
  validFrom: string;
  validUntil: string;
  claimDeadline?: string;
  societyId: string;
  kioskLocation?: string;
  kioskOpenFrom?: string;
  kioskOpenUntil?: string;
  status: VoucherStatus;
  claimedAt?: string;
  redeemedAt?: string;
  signedToken?: SignedVoucherToken;
}

export type KioskVerificationStatus =
  | 'ACCEPTED'
  | 'REJECTED_SIGNATURE'
  | 'REJECTED_EXPIRED'
  | 'REJECTED_OTP_MISMATCH'
  | 'REJECTED_ALREADY_REDEEMED'
  | 'REJECTED_CAMPAIGN_ENDED'
  | 'CONFLICT_MULTI_KIOSK';

export interface KioskScanResult {
  status: KioskVerificationStatus;
  vid?: string;
  uid?: string;
  residentName?: string;
  unitNumber?: string;
  productName?: string;
  campaignName?: string;
  redeemedAt?: string;
  kioskId?: string;
  conflictKioskId?: string;
  message: string;
}

export interface LocalRedemptionRecord {
  vid: string;
  uid: string;
  redeemedAt: number;
  kioskId: string;
  synced: boolean;
  conflicted: boolean;
}

export interface RedemptionSyncPayload {
  kioskId: string;
  records: LocalRedemptionRecord[];
  syncedAt: string;
}

export interface RedemptionSyncResult {
  accepted: string[];
  conflicts: Array<{ vid: string; firstKioskId: string; firstRedeemedAt: string }>;
  errors: string[];
}
