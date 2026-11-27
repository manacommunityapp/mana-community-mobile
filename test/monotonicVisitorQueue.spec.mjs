import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Concurrency Drills: Guard Polling Race, Atomic CAS & Keyset ERP Cursor (Mobile Spec)', () => {
  function mergeMonotonic(prev, incoming) {
    const next = new Map(prev);
    for (const item of incoming) {
      const existing = next.get(item.id);
      if (!existing || item.version > existing.version) {
        next.set(item.id, item);
      }
    }
    return next;
  }

  it('1. Rejects stale out-of-order HTTP poll PENDING overwrite when WebSocket already settled version 5 APPROVED', () => {
    const state0 = new Map([
      ['v-42', { id: 'v-42', status: 'PENDING', version: 4 }],
    ]);
    const afterWs = mergeMonotonic(state0, [{ id: 'v-42', status: 'APPROVED', version: 5 }]);
    assert.equal(afterWs.get('v-42')?.status, 'APPROVED');

    // Slow poll returns stale version 4 -> MUST NOT revert to PENDING
    const afterLatePoll = mergeMonotonic(afterWs, [{ id: 'v-42', status: 'PENDING', version: 4 }]);
    assert.equal(afterLatePoll.get('v-42')?.status, 'APPROVED');
    assert.equal(afterLatePoll.get('v-42')?.version, 5);
  });

  it('2. Aborts superseded in-flight fetch via AbortController and invalidates epoch on WS push', () => {
    let epoch = 0;
    let activeController = null;

    const beginPoll = () => {
      activeController?.abort();
      activeController = new AbortController();
      return { signal: activeController.signal, epoch: ++epoch };
    };

    const p1 = beginPoll();
    assert.equal(p1.signal.aborted, false);
    const p2 = beginPoll();
    assert.equal(p1.signal.aborted, true);
    assert.equal(p2.signal.aborted, false);

    // WebSocket arrives before p2 HTTP completes
    epoch += 1;
    assert.notEqual(p2.epoch, epoch);
  });

  it('3. Models atomic CAS approval transition blocking double-decision split-brain', () => {
    let row = { id: 100, status: 'PENDING', version: 1 };
    const decideCas = (nextStatus) => {
      if (row.status !== 'PENDING') return { applied: false, current: row.status };
      row = { ...row, status: nextStatus, version: row.version + 1 };
      return { applied: true, current: row.status };
    };

    assert.deepEqual(decideCas('APPROVED'), { applied: true, current: 'APPROVED' });
    assert.deepEqual(decideCas('DENIED'), { applied: false, current: 'APPROVED' });
    assert.equal(row.version, 2);
  });
});
