import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Governance Polls, Secret Ballot & AGM Quorum (Mobile Spec)', () => {
  function modPow(base, exp, mod) {
    let result = 1n;
    let b = ((base % mod) + mod) % mod;
    let e = exp;
    while (e > 0n) {
      if (e & 1n) result = (result * b) % mod;
      e >>= 1n;
      b = (b * b) % mod;
    }
    return result;
  }

  function modInverse(a, m) {
    let oldR = ((a % m) + m) % m;
    let r = m;
    let oldS = 1n;
    let s = 0n;
    while (r !== 0n) {
      const q = oldR / r;
      [oldR, r] = [r, oldR - q * r];
      [oldS, s] = [s, oldS - q * s];
    }
    return ((oldS % m) + m) % m;
  }

  it('1. Blinds and unblinds secret election ballot signatures offline', () => {
    const n = 3233n;
    const e = 17n;
    const d = 2753n;
    const msg = 123n;
    const r = 17n;

    const blinded = (msg * modPow(r, e, n)) % n;
    const blindSig = modPow(blinded, d, n);
    const unblindedSig = (blindSig * modInverse(r, n)) % n;

    assert.equal(modPow(unblindedSig, e, n), msg);
  });

  it('2. Blocks overdue (>90 days) unit owners and computes UDS weight cleanly', () => {
    const evaluateEligibility = ({ residentType, udsSqft, maxOverdueDays, votingMode }) => {
      if (residentType !== 'OWNER') return { eligible: false, reason: 'OWNER_REQUIRED' };
      if (maxOverdueDays > 90) return { eligible: false, reason: 'DEFAULTED_OVER_90_DAYS' };
      const weight = votingMode === 'UDS_AREA_WEIGHTED' ? udsSqft : 1;
      return { eligible: true, weight };
    };

    assert.deepEqual(
      evaluateEligibility({ residentType: 'OWNER', udsSqft: 1850.5, maxOverdueDays: 95, votingMode: 'UDS_AREA_WEIGHTED' }),
      { eligible: false, reason: 'DEFAULTED_OVER_90_DAYS' },
    );
    assert.deepEqual(
      evaluateEligibility({ residentType: 'OWNER', udsSqft: 1850.5, maxOverdueDays: 15, votingMode: 'UDS_AREA_WEIGHTED' }),
      { eligible: true, weight: 1850.5 },
    );
  });

  it('3. Maintains single-seat flat quorum on proxy supersede and gates 25% resolution open', () => {
    const seats = new Map();
    const checkIn = (flatId, role) => {
      const prior = seats.get(flatId);
      const proxySuperseded = prior?.role === 'PROXY' && role !== 'PROXY';
      seats.set(flatId, { role, status: 'CHECKED_IN' });
      return { count: seats.size, proxySuperseded };
    };

    checkIn(1, 'PROXY');
    const res = checkIn(1, 'OWNER');
    assert.equal(res.proxySuperseded, true);
    assert.equal(res.count, 1);

    const canOpenResolution = (present, totalEligible, requiredPct = 25) =>
      (present * 100) / totalEligible >= requiredPct;

    assert.equal(canOpenResolution(res.count, 20, 25), false);
    checkIn(2, 'OWNER');
    checkIn(3, 'OWNER');
    checkIn(4, 'OWNER');
    checkIn(5, 'OWNER');
    assert.equal(canOpenResolution(seats.size, 20, 25), true);
  });
});
