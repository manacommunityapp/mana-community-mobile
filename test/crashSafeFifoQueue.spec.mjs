import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Mobile Crash-Safe FIFO Queue & Dead-Letter Conflict Spec', () => {
  function createWalSimulator() {
    let seq = 0;
    const store = [];

    return {
      enqueue(op) {
        const entry = {
          id: `req_${seq + 1}`,
          seqId: ++seq,
          operation: op,
          status: 'PENDING',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };
        store.push(entry);
        return entry;
      },
      simulateCrashMidFlight(id) {
        const item = store.find((e) => e.id === id);
        if (item) item.status = 'IN_FLIGHT';
      },
      rehydrateInFlight() {
        let count = 0;
        for (const item of store) {
          if (item.status === 'IN_FLIGHT') {
            item.status = 'PENDING';
            count++;
          }
        }
        return count;
      },
      processFifo(executor) {
        this.rehydrateInFlight();
        const ordered = store.filter((e) => e.status === 'PENDING').sort((a, b) => a.seqId - b.seqId);
        let halted = false;
        let succeeded = 0;
        let conflicts = 0;

        for (const item of ordered) {
          item.status = 'IN_FLIGHT';
          const outcome = executor(item);
          if (outcome === 'APPLIED') {
            const idx = store.findIndex((e) => e.id === item.id);
            if (idx >= 0) store.splice(idx, 1);
            succeeded++;
          } else if (outcome === 'CONFLICT') {
            item.status = 'CONFLICT';
            conflicts++;
          } else {
            item.status = 'PENDING';
            item.retryCount++;
            halted = true;
            break;
          }
        }

        return { succeeded, conflicts, halted, remaining: [...store] };
      },
    };
  }

  it('1. Enforces monotonic seqId ordering independent of device clock', () => {
    const wal = createWalSimulator();
    const e1 = wal.enqueue({ type: 'VISITOR_CHECK_IN', passCode: 'MANA-101', gate: 'Gate 1' });
    const e2 = wal.enqueue({ type: 'EXPRESS_CLEARANCE', passCode: 'EXP-4521', gate: 'Gate 1' });
    const e3 = wal.enqueue({ type: 'VISITOR_CHECK_OUT', passCode: 'MANA-101', gate: 'Gate 1' });

    assert.equal(e1.seqId, 1);
    assert.equal(e2.seqId, 2);
    assert.equal(e3.seqId, 3);

    const seen = [];
    const res = wal.processFifo((item) => {
      seen.push(`${item.seqId}:${item.operation.type}`);
      return 'APPLIED';
    });

    assert.deepEqual(seen, [
      '1:VISITOR_CHECK_IN',
      '2:EXPRESS_CLEARANCE',
      '3:VISITOR_CHECK_OUT',
    ]);
    assert.equal(res.succeeded, 3);
    assert.equal(res.remaining.length, 0);
  });

  it('2. Rehydrates stuck IN_FLIGHT entries on boot and halts on transient failure', () => {
    const wal = createWalSimulator();
    const e1 = wal.enqueue({ type: 'VISITOR_CHECK_IN', passCode: 'MANA-555', gate: 'Main' });
    const e2 = wal.enqueue({ type: 'EXPRESS_CLEARANCE', passCode: 'EXP-8899', gate: 'Main' });

    // Crash occurs mid-dispatch on e1
    wal.simulateCrashMidFlight(e1.id);
    assert.equal(wal.rehydrateInFlight(), 1);

    const dispatched = [];
    const res = wal.processFifo((item) => {
      dispatched.push(item.seqId);
      return 'RETRYABLE_ERROR';
    });

    // Strict FIFO guarantees e2 is NOT executed while e1 fails transiently
    assert.deepEqual(dispatched, [e1.seqId]);
    assert.equal(res.halted, true);
    assert.equal(res.remaining.length, 2);
    assert.equal(e1.retryCount, 1);
    assert.equal(e2.retryCount, 0);
  });

  it('3. Quarantines 409 conflict into Dead-Letter Queue so trailing traffic drains', () => {
    const wal = createWalSimulator();
    wal.enqueue({ type: 'VISITOR_CHECK_IN', passCode: 'REVOKED-01', gate: 'Gate 2' });
    wal.enqueue({ type: 'EXPRESS_CLEARANCE', passCode: 'EXP-3344', gate: 'Gate 2' });

    const res = wal.processFifo((item) =>
      item.operation.passCode === 'REVOKED-01' ? 'CONFLICT' : 'APPLIED'
    );

    assert.equal(res.conflicts, 1);
    assert.equal(res.succeeded, 1);
    assert.equal(res.halted, false);
    assert.equal(res.remaining.length, 1);
    assert.equal(res.remaining[0].status, 'CONFLICT');
  });
});
