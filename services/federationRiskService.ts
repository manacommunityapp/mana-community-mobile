import api from './apiClient';

export interface MobileTransitToken {
  transitId: string;
  federationId: number;
  targetSocietyId: number;
  opaqueFlatLabel: string;
  validUntil: string;
  consumedAt?: string | null;
}

export interface MobileRiskVerdict {
  cityCode: string;
  riskTier: 'NONE' | 'HIGH_RISK';
  topCategory?: string | null;
  corroboratedSocietiesCount: number;
  actionGuidance: string;
}

export function shouldTriggerGuardRiskBanner(verdict: MobileRiskVerdict, threshold = 2): boolean {
  return verdict.riskTier === 'HIGH_RISK' && verdict.corroboratedSocietiesCount >= threshold;
}

export async function fetchInnerGatePrewarmed(societyId: number): Promise<MobileTransitToken[]> {
  const { data } = await api.get<MobileTransitToken[]>(`/api/v1/federation/inner-gate/${societyId}/prewarmed`);
  return data;
}

export async function assessCityRiskAtGate(
  cityCode: string,
  identifier: string,
  corroborationThreshold = 2,
): Promise<MobileRiskVerdict> {
  const { data } = await api.post<MobileRiskVerdict>('/api/v1/risk-network/assess', {
    cityCode,
    identifier,
    corroborationThreshold,
  });
  return data;
}
