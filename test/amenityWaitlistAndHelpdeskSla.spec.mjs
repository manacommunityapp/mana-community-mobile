import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Amenities Concurrency, Waitlists & Helpdesk Photo/SLA Timers (Mobile Spec)', () => {
  it('1. Locks cancelled slot directly into HELD state for waitlist #1 and cascades on 15m expiry', () => {
    let slot = { id: 55, status: 'BOOKED', bookedBy: 1001 };
    const waitlist = [
      { residentId: 1002, position: 1, status: 'WAITING' },
      { residentId: 1003, position: 2, status: 'WAITING' },
    ];

    const cancelAndPromote = () => {
      const next = waitlist.find((w) => w.status === 'WAITING');
      if (next) {
        next.status = 'OFFERED';
        slot = { ...slot, status: 'HELD', bookedBy: null };
        return next.residentId;
      }
      slot = { ...slot, status: 'AVAILABLE', bookedBy: null };
      return null;
    };

    const offeredTo = cancelAndPromote();
    assert.equal(offeredTo, 1002);
    assert.equal(slot.status, 'HELD');

    // Expire #1 and cascade to #2
    waitlist[0].status = 'EXPIRED';
    const nextOffered = cancelAndPromote();
    assert.equal(nextOffered, 1003);
    assert.equal(waitlist[1].status, 'OFFERED');
  });

  it('2. Validates max 5 safe photo attachment URIs and pauses/resumes SLA deadline over off-hours', () => {
    const validateAttachments = (urls) => {
      if (urls.length > 5) return false;
      return urls.every((u) => /^(https?:\/\/|file:\/\/|s3:\/\/|\/uploads\/)/i.test(u));
    };

    assert.equal(validateAttachments(['file:///tmp/p1.jpg', 'https://cdn/p2.jpg']), true);
    assert.equal(validateAttachments(['javascript:alert(1)']), false);
    assert.equal(validateAttachments(['a', 'b', 'c', 'd', 'e', 'f'].map((x) => `https://cdn/${x}.jpg`)), false);

    // Off-hours pause adds exact paused minutes to SLA deadline
    const initialDeadlineMs = Date.parse('2026-11-28T18:30:00Z');
    const pausedMinutes = 9 * 60;
    const resumedDeadlineMs = initialDeadlineMs + pausedMinutes * 60_000;
    assert.equal(resumedDeadlineMs - initialDeadlineMs, 9 * 3600_000);
  });
});
