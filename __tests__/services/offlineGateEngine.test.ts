import { hmacSha256Hex, offlineGateEngine, type SignedGateRosterBundle } from '@/services/offlineGateEngine';
import { requestQueue } from '@/services/requestQueue';

const mockStore = new Map<string, string>();

jest.mock('@/services/storageAdapter', () => ({
  durableStorageAdapter: {
    getItem: jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      mockStore.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      mockStore.delete(k);
      return Promise.resolve();
    }),
    isMmkvActive: () => false,
  },
}));

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

describe('offlineGateEngine', () => {
  const secret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  function buildBundle(overrides: Partial<SignedGateRosterBundle> = {}): SignedGateRosterBundle {
    const base: SignedGateRosterBundle = {
      communityId: 1,
      deviceId: 'gate-tablet-1',
      gateName: 'Main Gate',
      signingSecret: secret,
      rosterVersion: 3,
      serverEpochMs: 1_800_000_000_000,
      expiresAtEpochMs: 1_800_000_000_000 + 4 * 3600 * 1000,
      bundleSignature: '',
      localSyncedAtMs: Date.now(),
      entries: [
        {
          entityType: 'SCHOOL_BUS_ENTRY',
          entityId: 42,
          passCode: 'SB-42-12',
          subjectName: 'Aarav',
          flatOrStop: 'Block B',
          vehicleOrBusRef: 'BUS-12',
          status: 'ACTIVE',
          singleUse: false,
        },
      ],
      revokedPassCodes: ['VP-REVOKED'],
      ...overrides,
    };
    const canonical = `${base.communityId}|${base.deviceId}|${base.rosterVersion}|${base.serverEpochMs}|${base.entries.length}|${base.revokedPassCodes.length}`;
    base.bundleSignature = hmacSha256Hex(secret, canonical);
    return base;
  }

  beforeEach(() => {
    mockStore.clear();
  });

  it('approves pre-authorized offline entry once, signs envelope, and blocks replay of same nonce', async () => {
    const bundle = buildBundle();
    mockStore.set('@mana/gate_signed_roster_v1', JSON.stringify(bundle));

    const first = await offlineGateEngine.approveEntryOffline({
      identity: { userId: 55, communityId: 1 },
      passCode: 'SB-42-12',
      passNonce: 'SB-42-12-step-100',
      gateName: 'Main Gate',
      direction: 'PICKUP',
    });

    expect(first.approved).toBe(true);
    expect(first.localSeq).toBe(1);

    const queued = await requestQueue.getAll();
    expect(queued).toHaveLength(1);
    expect(queued[0].operation.type).toBe('GATE_SCHOOL_BUS_ENTRY');

    // Second attempt with identical nonce (screenshot/replay during outage) must be blocked locally
    const replay = await offlineGateEngine.approveEntryOffline({
      identity: { userId: 55, communityId: 1 },
      passCode: 'SB-42-12',
      passNonce: 'SB-42-12-step-100',
      gateName: 'Main Gate',
      direction: 'PICKUP',
    });
    expect(replay.approved).toBe(false);
    expect(replay.reason).toContain('Replay blocked');
  });

  it('rejects revoked passes and tampered roster signatures', async () => {
    const bundle = buildBundle();
    mockStore.set('@mana/gate_signed_roster_v1', JSON.stringify(bundle));

    const revoked = await offlineGateEngine.approveEntryOffline({
      identity: { userId: 55, communityId: 1 },
      passCode: 'VP-REVOKED',
      passNonce: 'nonce-r1',
      gateName: 'Main Gate',
    });
    expect(revoked.approved).toBe(false);
    expect(revoked.reason).toContain('revoked');

    const tampered = { ...bundle, rosterVersion: 999 };
    mockStore.set('@mana/gate_signed_roster_v1', JSON.stringify(tampered));
    const failedSig = await offlineGateEngine.approveEntryOffline({
      identity: { userId: 55, communityId: 1 },
      passCode: 'SB-42-12',
      passNonce: 'nonce-r2',
      gateName: 'Main Gate',
    });
    expect(failedSig.approved).toBe(false);
    expect(failedSig.reason).toContain('signature');
  });
});
