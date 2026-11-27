import api from './apiClient';

export interface PartnerWebhookKeyRecord {
  id: number;
  partnerId: string;
  keyId: string;
  secretHex: string;
  status: 'ACTIVE' | 'ROTATING_GRACE' | 'REVOKED';
  graceUntil?: string | null;
  revokedReason?: string | null;
  createdAt: string;
}

export interface DeprecatedLaggardRecord {
  id: number;
  endpoint: string;
  apiVersion: string;
  controllerSerial: string;
  communityId?: number | null;
  firmwareVersion?: string | null;
  callCount: number;
  lastSeenAt: string;
}

export interface DeprecationNotice {
  deprecated: boolean;
  sunsetDate: string | null;
  successorUrl: string | null;
  apiVersion: string | null;
}

export function buildCanonicalWebhookString(
  method: string,
  path: string,
  timestampSec: number,
  nonce: string,
  rawBody: string,
): string {
  const normMethod = (method || 'POST').trim().toUpperCase();
  const normPath = path || '/';
  return `${normMethod}\n${normPath}\n${timestampSec}\n${nonce}\n${rawBody ?? ''}`;
}

export function parseDeprecationHeaders(headers: Record<string, string | undefined>): DeprecationNotice {
  const get = (name: string): string | null => {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? (headers[key] ?? null) : null;
  };
  const linkVal = get('Link');
  const match = linkVal?.match(/<([^>]+)>\s*;\s*rel=["']?successor-version["']?/i);

  return {
    deprecated: get('Deprecation') === 'true',
    sunsetDate: get('Sunset'),
    successorUrl: match ? match[1] : null,
    apiVersion: get('X-API-Version'),
  };
}

export async function rotatePartnerKey(partnerId: string, graceHours = 168): Promise<PartnerWebhookKeyRecord> {
  const { data } = await api.post<PartnerWebhookKeyRecord>('/api/v1/partners/keys/rotate', {
    partnerId,
    graceHours,
  });
  return data;
}

export async function revokePartnerKey(
  keyId: string,
  reason = 'COMPROMISED_FIRMWARE_QUARANTINE',
): Promise<PartnerWebhookKeyRecord> {
  const { data } = await api.post<PartnerWebhookKeyRecord>(
    `/api/v1/partners/keys/${encodeURIComponent(keyId)}/revoke`,
    { reason },
  );
  return data;
}

export async function getDeprecatedLaggards(): Promise<DeprecatedLaggardRecord[]> {
  const { data } = await api.get<DeprecatedLaggardRecord[]>('/api/v1/partners/deprecation/laggards');
  return data;
}

export async function setV1SunsetEnabled(enabled: boolean): Promise<{ v1SunsetEnabled: boolean }> {
  const { data } = await api.put<{ v1SunsetEnabled: boolean }>('/api/v1/partners/deprecation/v1-sunset', {
    enabled,
  });
  return data;
}
