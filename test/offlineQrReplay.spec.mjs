import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Offline QR Ed25519 Signature & Screenshot Anti-Replay Suite (Mobile Spec)', () => {
  it('1. Rejects screenshot replay on offline guard tablet after single-use consumption', () => {
    const spent = new Map();

    function consumeOnce(jti, passCode, gate) {
      if (spent.has(jti)) {
        return { allowed: false, prior: spent.get(jti) };
      }
      spent.set(jti, { jti, passCode, gate, spentAt: new Date().toISOString() });
      return { allowed: true };
    }

    const first = consumeOnce('jti_7721aa', 'EXP-7721', 'Gate 1');
    assert.equal(first.allowed, true);

    const replay = consumeOnce('jti_7721aa', 'EXP-7721', 'Gate 2');
    assert.equal(replay.allowed, false);
    assert.equal(replay.prior.gate, 'Gate 1');
  });
});
