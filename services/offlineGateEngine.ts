import api from './apiClient';
import { durableStorageAdapter } from './storageAdapter';
import { requestQueue, QueueIdentity } from './requestQueue';

const ROSTER_KEY = '@mana/gate_signed_roster_v1';
const NONCE_KEY = '@mana/gate_consumed_nonces_v1';
const SEQ_KEY = '@mana/gate_local_seq_v1';
const DEVICE_KEY = '@mana/gate_device_id_v1';

export type GateEntityType = 'VISITOR_PASS' | 'SCHOOL_BUS_ENTRY' | 'DIGITAL_PASS';

export interface SignedPreAuthEntry {
  entityType: GateEntityType;
  entityId: number;
  passCode: string;
  subjectName: string;
  flatOrStop?: string;
  vehicleOrBusRef?: string;
  status: string;
  validFrom?: string;
  validUntil?: string;
  singleUse: boolean;
}

export interface SignedGateRosterBundle {
  communityId: number;
  deviceId: string;
  gateName: string;
  signingSecret: string;
  rosterVersion: number;
  serverEpochMs: number;
  expiresAtEpochMs: number;
  bundleSignature: string;
  entries: SignedPreAuthEntry[];
  revokedPassCodes: string[];
  /** Local wall/monotonic anchor recorded at sync time */
  localSyncedAtMs?: number;
}

export interface GateMutationAck {
  clientMutationId: string;
  serverChangeId?: number;
  entityId?: number;
  status: 'APPLIED' | 'CONFLICT_SERVER_WINS' | 'CONFLICT_ANOMALY_LOGGED' | 'REJECTED_REPLAY' | 'REJECTED';
  message: string;
  conflictReason?: string;
  offlineOverride?: boolean;
  anomalyLogged?: boolean;
}

export interface BatchSyncResponse {
  deviceId: string;
  totalProcessed: number;
  appliedCount: number;
  conflictCount: number;
  replayRejectedCount: number;
  anomalyCount: number;
  newCheckpointChangeId: number;
  newCheckpointSeq?: number;
  serverEpochMs?: number;
  acks: GateMutationAck[];
}

export interface GateAnomaly {
  id: number;
  deviceId: string;
  localSeq?: number;
  clientMutationId: string;
  entityType: GateEntityType;
  entityId?: number;
  passCode?: string;
  passNonce?: string;
  gateName?: string;
  occurredAt: string;
  reconciledAt: string;
  syncStatus: string;
  offlineOverride: boolean;
  conflictReason?: string;
  resolved: boolean;
  resolutionNote?: string;
}

// Pure-JS HMAC-SHA256 so offline tablet verification & envelope signing run deterministically
// in Hermes/React Native and Jest/Node without extra native module requirements.
function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const len = bytes.length;
  const bitLen = len * 8;
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(bytes);
}

export function hmacSha256Hex(secret: string, message: string): string {
  const blockSize = 64;
  let key = utf8Encode(secret);
  if (key.length > blockSize) key = sha256Bytes(key);
  const kPad = new Uint8Array(blockSize);
  kPad.set(key);
  const oPad = new Uint8Array(blockSize);
  const iPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oPad[i] = kPad[i] ^ 0x5c;
    iPad[i] = kPad[i] ^ 0x36;
  }
  const msgBytes = utf8Encode(message);
  const inner = new Uint8Array(blockSize + msgBytes.length);
  inner.set(iPad);
  inner.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(inner);
  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(oPad);
  outer.set(innerHash, blockSize);
  return Array.from(sha256Bytes(outer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const offlineGateEngine = {
  async getOrCreateDeviceId(): Promise<string> {
    const existing = await durableStorageAdapter.getItem(DEVICE_KEY);
    if (existing) return existing;
    const generated = `gate-tablet-${Math.random().toString(36).slice(2, 10)}`;
    await durableStorageAdapter.setItem(DEVICE_KEY, generated);
    return generated;
  },

  async registerAndRefreshRoster(gateName = 'Main Gate'): Promise<SignedGateRosterBundle> {
    const deviceId = await this.getOrCreateDeviceId();
    const res = await api.post<SignedGateRosterBundle>('/v1/sync/gate/register', { deviceId, gateName });
    const bundle: SignedGateRosterBundle = { ...res.data, localSyncedAtMs: Date.now() };
    await durableStorageAdapter.setItem(ROSTER_KEY, JSON.stringify(bundle));
    return bundle;
  },

  async getCachedRoster(): Promise<SignedGateRosterBundle | null> {
    const raw = await durableStorageAdapter.getItem(ROSTER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SignedGateRosterBundle;
    } catch {
      return null;
    }
  },

  verifyBundleSignature(bundle: SignedGateRosterBundle): boolean {
    const canonical = `${bundle.communityId}|${bundle.deviceId}|${bundle.rosterVersion}|${bundle.serverEpochMs}|${bundle.entries.length}|${bundle.revokedPassCodes.length}`;
    return hmacSha256Hex(bundle.signingSecret, canonical) === bundle.bundleSignature;
  },

  adjustedNowMs(bundle: SignedGateRosterBundle): number {
    const elapsedSinceSync = Math.max(0, Date.now() - (bundle.localSyncedAtMs ?? Date.now()));
    return bundle.serverEpochMs + elapsedSinceSync;
  },

  async isNonceConsumed(passNonce: string): Promise<boolean> {
    const raw = await durableStorageAdapter.getItem(NONCE_KEY);
    if (!raw) return false;
    try {
      const set = JSON.parse(raw) as string[];
      return Array.isArray(set) && set.includes(passNonce);
    } catch {
      return false;
    }
  },

  async markNonceConsumed(passNonce: string): Promise<void> {
    const raw = await durableStorageAdapter.getItem(NONCE_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(passNonce)) {
      list.push(passNonce);
      // Keep bounded rolling window of recent nonces locally
      const trimmed = list.length > 1000 ? list.slice(list.length - 1000) : list;
      await durableStorageAdapter.setItem(NONCE_KEY, JSON.stringify(trimmed));
    }
  },

  async nextLocalSeq(): Promise<number> {
    const raw = await durableStorageAdapter.getItem(SEQ_KEY);
    const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await durableStorageAdapter.setItem(SEQ_KEY, String(next));
    return next;
  },

  /**
   * Verifies a pre-authorized pass offline against the signed roster, blocks revoked/expired
   * entries and duplicate nonces/screenshots, signs the mutation with the device secret,
   * and enqueues it durably for batch reconciliation on reconnect.
   */
  async approveEntryOffline(params: {
    identity: QueueIdentity;
    passCode: string;
    passNonce: string;
    gateName: string;
    direction?: 'PICKUP' | 'DROP' | 'CHECK_IN' | 'CHECK_OUT';
  }): Promise<{ approved: boolean; reason?: string; localSeq?: number; entry?: SignedPreAuthEntry }> {
    const bundle = await this.getCachedRoster();
    if (!bundle) {
      return { approved: false, reason: 'No offline pre-authorized roster cached on this tablet.' };
    }
    if (!this.verifyBundleSignature(bundle)) {
      return { approved: false, reason: 'Roster signature verification failed.' };
    }
    const nowAdjusted = this.adjustedNowMs(bundle);
    if (nowAdjusted > bundle.expiresAtEpochMs) {
      return { approved: false, reason: 'Offline rush roster window has expired. Reconnect to refresh.' };
    }
    if (bundle.revokedPassCodes.includes(params.passCode)) {
      return { approved: false, reason: 'Pass has been revoked or cancelled.' };
    }
    const entry = bundle.entries.find((e) => e.passCode === params.passCode);
    if (!entry) {
      return { approved: false, reason: 'Pass is not in the pre-authorized community roster.' };
    }
    if (await this.isNonceConsumed(params.passNonce)) {
      return { approved: false, reason: 'Replay blocked: pass nonce already consumed offline on this tablet.' };
    }

    const localSeq = await this.nextLocalSeq();
    const mutationId = `gate-${bundle.deviceId}-${localSeq}-${Date.now().toString(36)}`;
    const canonical = `${bundle.deviceId}|${mutationId}|${localSeq}|${entry.entityType}|${entry.passCode}|${params.passNonce}`;
    const deviceSignature = hmacSha256Hex(bundle.signingSecret, canonical);
    const occurredAt = new Date(nowAdjusted).toISOString().slice(0, 19);

    await this.markNonceConsumed(params.passNonce);
    await requestQueue.enqueue(
      {
        type:
          entry.entityType === 'SCHOOL_BUS_ENTRY'
            ? 'GATE_SCHOOL_BUS_ENTRY'
            : entry.entityType === 'DIGITAL_PASS'
            ? 'GATE_DIGITAL_PASS_SCAN'
            : 'GATE_VISITOR_CHECK_IN',
        entityId: entry.entityId,
        passCode: entry.passCode,
        gate: params.gateName,
        direction: params.direction ?? 'PICKUP',
        passNonce: params.passNonce,
        localSeq,
        deviceId: bundle.deviceId,
        deviceSignature,
        occurredAt,
      },
      params.identity,
      mutationId,
    );

    return { approved: true, localSeq, entry };
  },

  async fetchUnresolvedAnomalies(): Promise<GateAnomaly[]> {
    const res = await api.get<GateAnomaly[]>('/v1/sync/gate/anomalies');
    return res.data ?? [];
  },

  async resolveAnomaly(auditId: number, note: string): Promise<GateAnomaly> {
    const res = await api.post<GateAnomaly>(`/v1/sync/gate/anomalies/${auditId}/resolve`, { note });
    return res.data;
  },
};
