export interface CampaignTargeting {
  cities?: string[];
  flatTypes?: string[];
  segments?: string[];
  societyIds?: string[];
}

export type AdCreativeType = 'BANNER' | 'INTERSTITIAL' | 'VIDEO' | 'NATIVE';

export interface AdCreative {
  creativeId: string;
  campaignId: string;
  type: AdCreativeType;
  assetUrl: string;
  ctaUrl: string;
  ctaText?: string;
  weight: number;
  widthPx?: number;
  heightPx?: number;
  brandName?: string;
  brandLogoUrl?: string;
  headline?: string;
  bodyText?: string;
}

export interface AdRequest {
  userId: string;
  societyId: string;
  city: string;
  flatType: string;
  placementId: string;
  appContext?: Record<string, unknown>;
}

export interface AdResponse {
  impressionId: string;
  campaignId: string;
  creative: AdCreative;
  impressionTrackUrl: string;
  clickTrackUrl: string;
  freqCapRemaining: number;
  budgetPacingDelayMs?: number;
}

export interface ImpressionEvent {
  impressionId: string;
  campaignId: string;
  userId: string;
  societyId: string;
  placementId: string;
  firedAt: string;
}
