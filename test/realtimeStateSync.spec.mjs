import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

function computeJitteredBackoff(attempt, rng = Math.random) {
  const idx = Math.min(Math.max(0, attempt), BACKOFF_MS.length - 1);
  const ceiling = BACKOFF_MS[idx];
  return Math.floor(ceiling * 0.5 + rng() * ceiling * 0.5);
}

describe('Real-Time State Sync & Network Handover Suite (Mobile Spec)', () => {
  it('1. Computes full-jitter exponential backoff between 50%-100% and caps at 60s', () => {
    assert.equal(computeJitteredBackoff(0, () => 0), 500);
    assert.ok(computeJitteredBackoff(0, () => 0.999) <= 1000);
    assert.equal(computeJitteredBackoff(2, () => 0), 2000);
    assert.ok(computeJitteredBackoff(2, () => 0.999) <= 4000);
    // Saturates at 60,000ms cap
    assert.equal(computeJitteredBackoff(15, () => 0), 30000);
    assert.ok(computeJitteredBackoff(15, () => 0.999) <= 60000);
  });

  it('2. Detects Wi-Fi <-> Cellular handover and triggers forced zombie socket teardown', () => {
    let forcedReconnects = 0;
    let prevType = 'wifi';
    let trackedSubscriptions = 2;

    function handleNetInfoChange(nextState) {
      const nextType = nextState.type;
      const reachable = Boolean(nextState.isConnected) && nextState.isInternetReachable !== false;
      if (!reachable) {
        prevType = nextType;
        return 'DISCONNECTED';
      }
      const interfaceChanged = prevType !== 'unknown' && prevType !== nextType;
      prevType = nextType;
      if (interfaceChanged && trackedSubscriptions > 0) {
        forcedReconnects++;
        return 'FORCE_RECONNECT';
      }
      return 'STEADY';
    }

    assert.equal(handleNetInfoChange({ type: 'wifi', isConnected: true, isInternetReachable: true }), 'STEADY');
    assert.equal(handleNetInfoChange({ type: 'cellular', isConnected: true, isInternetReachable: true }), 'FORCE_RECONNECT');
    assert.equal(forcedReconnects, 1);
    assert.equal(handleNetInfoChange({ type: 'none', isConnected: false, isInternetReachable: false }), 'DISCONNECTED');
    assert.equal(handleNetInfoChange({ type: 'cellular', isConnected: true, isInternetReachable: true }), 'FORCE_RECONNECT');
    assert.equal(forcedReconnects, 2);
  });

  it('3. Reconciles offline mutation queue and missed server deltas cleanly', () => {
    const localQueue = [
      { clientMutationId: 'mut_101', entityType: 'VISITOR_PASS', status: 'CHECKED_IN' },
      { clientMutationId: 'mut_102', entityType: 'EXPRESS_DELIVERY', status: 'CHECKED_IN' },
    ];

    const serverPushAcks = [
      { clientMutationId: 'mut_101', status: 'APPLIED', serverChangeId: 1001 },
      { clientMutationId: 'mut_102', status: 'CONFLICT_SERVER_WINS', serverChangeId: 1002 },
    ];

    // Phase 2: remove acknowledged mutations from offline buffer
    const ackIds = new Set(serverPushAcks.map((a) => a.clientMutationId));
    const remaining = localQueue.filter((item) => !ackIds.has(item.clientMutationId));
    assert.equal(remaining.length, 0);

    // Phase 3: apply missed server deltas sequentially & advance checkpoint
    const currentPasses = new Map([[77, { id: 77, status: 'EXPECTED' }]]);
    const deltas = [
      { changeId: 1003, entityId: 77, payload: { status: 'APPROVED' } },
      { changeId: 1004, entityId: 88, payload: { status: 'EXPECTED' } },
    ];

    let checkpoint = 1000;
    for (const d of deltas) {
      currentPasses.set(d.entityId, { id: d.entityId, ...d.payload });
      checkpoint = Math.max(checkpoint, d.changeId);
    }

    assert.equal(currentPasses.get(77).status, 'APPROVED');
    assert.equal(currentPasses.get(88).status, 'EXPECTED');
    assert.equal(checkpoint, 1004);
  });
});
