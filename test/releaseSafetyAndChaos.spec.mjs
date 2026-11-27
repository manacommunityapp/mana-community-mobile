import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Release Safety, Tenant Canary & Chaos GameDay (Mobile Spec)', () => {
  function deterministicTenantBucket(flagKey, communityId) {
    const str = `${flagKey}:${communityId}`;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 10000;
  }

  it('1. Keeps tenant bucket identical across all guard devices inside the same society', () => {
    const gate1 = deterministicTenantBucket('guard-checkin-v2', 412);
    const gate2 = deterministicTenantBucket('guard-checkin-v2', 412);
    assert.equal(gate1, gate2);
    assert.ok(gate1 >= 0 && gate1 < 10000);
  });

  it('2. Blocks canary expansion during morning (07:30-10:30) and evening (17:30-20:30) gate rush hours', () => {
    const isRushHour = (hour, minute) => {
      const m = hour * 60 + minute;
      return (m >= 450 && m < 630) || (m >= 1050 && m < 1230);
    };
    assert.equal(isRushHour(8, 30), true);
    assert.equal(isRushHour(19, 15), true);
    assert.equal(isRushHour(14, 0), false);
  });

  it('3. Auto-aborts chaos GameDay experiment immediately when SOS probe health fails', () => {
    const verifyGameDay = ({ faultType, degradedOk, sosHealthy }) => {
      if (!sosHealthy) return { status: 'AUTO_ABORTED', reason: 'SOS_INVARIANT_BREACH' };
      return degradedOk ? { status: 'PASSED', faultType } : { status: 'AUTO_ABORTED', reason: 'DEGRADED_GATE_FAIL' };
    };

    assert.deepEqual(
      verifyGameDay({ faultType: 'REDIS_EVICTION', degradedOk: true, sosHealthy: true }),
      { status: 'PASSED', faultType: 'REDIS_EVICTION' },
    );
    assert.deepEqual(
      verifyGameDay({ faultType: 'FCM_THROTTLE', degradedOk: true, sosHealthy: false }),
      { status: 'AUTO_ABORTED', reason: 'SOS_INVARIANT_BREACH' },
    );
  });
});
