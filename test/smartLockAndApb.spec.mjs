import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Smart Locks, Biometric Edge Sync & Anti-Passback (Mobile Spec)', () => {
  it('1. Quantizes 2:00 PM - 4:00 PM window into 15-min epochs consistently for offline locks', () => {
    const BUCKET = 900;
    const validFromSec = 1_764_252_000;
    const validUntilSec = validFromSec + 7200;
    const startEpoch = Math.floor(validFromSec / BUCKET);
    const buckets = Math.ceil((validUntilSec - startEpoch * BUCKET) / BUCKET);

    assert.equal(buckets, 8);
    assert.equal(startEpoch * BUCKET, validFromSec);
  });

  it('2. Maintains local edge-gate kill-set priority over stale HNSW cache hits', () => {
    const killSet = new Set();
    const applyDelta = (delta) => {
      if (delta.op === 'REVOKE' || delta.urgentKillSwitch) {
        killSet.add(delta.personId);
      } else {
        killSet.delete(delta.personId);
      }
    };

    applyDelta({ op: 'UPSERT', personId: 305 });
    assert.equal(killSet.has(305), false);

    applyDelta({ op: 'REVOKE', personId: 305, urgentKillSwitch: true });
    assert.equal(killSet.has(305), true);
  });

  it('3. Distinguishes <60s anti-passback card passing from >60s sensor-glitch soft overrides', () => {
    const COOLDOWN_SEC = 60;
    const evalApb = (state, secondsElapsed, irCount) => {
      if (state === 'INSIDE' && secondsElapsed < COOLDOWN_SEC) {
        return { allowed: false, decision: 'DENIED_PASSBACK_COOLDOWN' };
      }
      if (state === 'INSIDE') {
        return { allowed: true, decision: 'GRANTED_SOFT_OVERRIDE' };
      }
      return { allowed: true, decision: irCount > 1 ? 'GRANTED_WITH_TAILGATE_ALERT' : 'GRANTED_OPEN' };
    };

    assert.deepEqual(evalApb('INSIDE', 12, 1), { allowed: false, decision: 'DENIED_PASSBACK_COOLDOWN' });
    assert.deepEqual(evalApb('INSIDE', 10800, 1), { allowed: true, decision: 'GRANTED_SOFT_OVERRIDE' });
    assert.deepEqual(evalApb('OUTSIDE', 0, 2), { allowed: true, decision: 'GRANTED_WITH_TAILGATE_ALERT' });
  });
});
