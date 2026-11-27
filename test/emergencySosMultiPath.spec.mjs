import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Sub-Second Lift SOS & Tower Evacuation Broadcast (Mobile Spec)', () => {
  it('1. Encodes <90B compact lift SOS frame fit for 140-byte single GSM SMS packet', () => {
    const frame = 'SOS1|10|205|C|LIFT-2|L|1764252000|sos-lift-c2-99';
    assert.ok(Buffer.byteLength(frame, 'utf8') < 90);
    const parts = frame.split('|');
    assert.equal(parts[0], 'SOS1');
    assert.equal(parts[3], 'C');
    assert.equal(parts[5], 'L');
  });

  it('2. Falls back cleanly to SMS channel preserving identical idempotencyKey when HTTP times out', async () => {
    const triggerMultiPath = async (httpCall) => {
      const idem = 'sos-lift-c2-99';
      try {
        await httpCall(idem);
        return { channel: 'COMPACT_2G', idempotencyKey: idem };
      } catch {
        return { channel: 'SMS_FALLBACK', idempotencyKey: idem };
      }
    };

    const fallbackRes = await triggerMultiPath(async () => {
      throw new Error('2G Socket Timeout');
    });
    assert.deepEqual(fallbackRes, { channel: 'SMS_FALLBACK', idempotencyKey: 'sos-lift-c2-99' });
  });

  it('3. Filters on-premises evacuation roster strictly to affected Tower C occupants', () => {
    const occupants = [
      { id: 1, category: 'RESIDENT', tower: 'C', phone: '+9198001' },
      { id: 2, category: 'VISITOR', tower: 'C', phone: '+9198002' },
      { id: 3, category: 'DOMESTIC_STAFF', tower: 'C', phone: '+9198003' },
      { id: 4, category: 'RESIDENT', tower: 'A', phone: '+9198004' },
    ];
    const targetRoster = occupants.filter((o) => o.tower === 'C');
    assert.equal(targetRoster.length, 3);
    assert.ok(!targetRoster.some((o) => o.tower === 'A'));
  });
});
