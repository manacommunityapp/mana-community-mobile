import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Low-Literacy Express Gate, Config Accounting & Blameless Guardrails (Mobile Spec)', () => {
  it('1. Allows 1-tap courier/OTP entry without typing while requiring photo for manual override', () => {
    const canSubmit = (mode, photoUrl) => (mode === 'GUARD_OVERRIDE_PHOTO' ? Boolean(photoUrl?.trim()) : true);

    assert.equal(canSubmit('COURIER_ICON', ''), true);
    assert.equal(canSubmit('GUARD_OVERRIDE_PHOTO', ''), false);
    assert.equal(canSubmit('GUARD_OVERRIDE_PHOTO', 'file://gate/photo-21.jpg'), true);
  });

  it('2. Keeps dry-run declarative accounting rule preview isolated from committed billing amount', () => {
    const applyRule = ({ basePaise, rateBps, dryRunOnly }) => {
      const preview = Math.max(0, basePaise - Math.floor((basePaise * rateBps) / 10000));
      return {
        previewAdjustedPaise: preview,
        effectiveCommittedPaise: dryRunOnly ? basePaise : preview,
      };
    };

    const previewOnly = applyRule({ basePaise: 200000, rateBps: 500, dryRunOnly: true });
    assert.deepEqual(previewOnly, { previewAdjustedPaise: 190000, effectiveCommittedPaise: 200000 });

    const committed = applyRule({ basePaise: 200000, rateBps: 500, dryRunOnly: false });
    assert.deepEqual(committed, { previewAdjustedPaise: 190000, effectiveCommittedPaise: 190000 });
  });

  it('3. Blocks postmortem closure when systemic guardrails remain UNVERIFIED', () => {
    const canClosePostmortem = (guardrails) =>
      guardrails.length > 0 && guardrails.every((g) => g.status === 'VERIFIED');

    assert.equal(canClosePostmortem([{ type: 'BULKHEAD_POOL', status: 'PENDING' }]), false);
    assert.equal(
      canClosePostmortem([
        { type: 'BULKHEAD_POOL', status: 'VERIFIED' },
        { type: 'RUSH_HOUR_FREEZE', status: 'VERIFIED' },
      ]),
      true,
    );
  });
});
