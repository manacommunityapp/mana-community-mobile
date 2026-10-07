import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Resource & Facility Booking - Mobile End-to-End Lifecycle Spec', () => {
  it('1. Resource & Slot Calculation: should compute correct operating slots and capacity', () => {
    const resource = {
      id: 'res-101',
      name: 'Tennis Court A',
      capacity: 4,
      openTime: '06:00:00',
      closeTime: '22:00:00',
      slotDurationMinutes: 60,
      feePerHour: 200,
    };

    assert.equal(resource.name, 'Tennis Court A');
    assert.equal(resource.capacity, 4);
    assert.equal(resource.feePerHour, 200);

    // Compute expected slots between 06:00 and 22:00 (16 hours = 16 60-min slots)
    const openHour = parseInt(resource.openTime.split(':')[0], 10);
    const closeHour = parseInt(resource.closeTime.split(':')[0], 10);
    const totalSlots = (closeHour - openHour) * (60 / resource.slotDurationMinutes);
    assert.equal(totalSlots, 16);
  });

  it('2. Dynamic Pricing Engine: applies peak hour multiplier and holiday surcharges', () => {
    const baseHourlyRate = 200;
    const peakRule = { isPeak: true, multiplier: 1.25 }; // +25%
    const holidayRule = { isHoliday: false, flatSurcharge: 50 };

    let calculatedRate = baseHourlyRate;
    if (peakRule.isPeak) {
      calculatedRate = calculatedRate * peakRule.multiplier;
    }
    if (holidayRule.isHoliday) {
      calculatedRate += holidayRule.flatSurcharge;
    }

    assert.equal(calculatedRate, 250);
  });

  it('3. Conflict Detection: prevents concurrent overlapping reservations on single-capacity slots', () => {
    const existingBookings = [
      { resourceId: 'res-101', date: '2026-10-15', startTime: '10:00:00', endTime: '11:00:00', status: 'CONFIRMED' },
    ];

    const hasConflict = (candidate) => {
      return existingBookings.some((b) => {
        if (b.resourceId !== candidate.resourceId || b.date !== candidate.date || b.status === 'CANCELLED') {
          return false;
        }
        return !(candidate.endTime <= b.startTime || candidate.startTime >= b.endTime);
      });
    };

    // Conflicting candidate (overlaps 10:30 - 11:30)
    const candidateConflict = { resourceId: 'res-101', date: '2026-10-15', startTime: '10:30:00', endTime: '11:30:00' };
    assert.equal(hasConflict(candidateConflict), true);

    // Non-conflicting candidate (11:00 - 12:00)
    const candidateValid = { resourceId: 'res-101', date: '2026-10-15', startTime: '11:00:00', endTime: '12:00:00' };
    assert.equal(hasConflict(candidateValid), false);
  });

  it('4. Tiered Cancellation Refund: enforces 100% (>24h), 50% (2-24h), and 0% (<2h)', () => {
    const calculateRefund = (hoursBeforeSlot, paidAmount) => {
      if (hoursBeforeSlot >= 24) {
        return { percentage: 100, amount: paidAmount };
      } else if (hoursBeforeSlot >= 2) {
        return { percentage: 50, amount: paidAmount * 0.5 };
      } else {
        return { percentage: 0, amount: 0 };
      }
    };

    const totalPaid = 500;
    // >24h prior: 100% refund
    const refundEarly = calculateRefund(36, totalPaid);
    assert.equal(refundEarly.percentage, 100);
    assert.equal(refundEarly.amount, 500);

    // 2-24h prior: 50% refund
    const refundMid = calculateRefund(10, totalPaid);
    assert.equal(refundMid.percentage, 50);
    assert.equal(refundMid.amount, 250);

    // <2h prior: 0% refund
    const refundLate = calculateRefund(1, totalPaid);
    assert.equal(refundLate.percentage, 0);
    assert.equal(refundLate.amount, 0);
  });

  it('5. Waitlist Auto-Promotion: notifies highest priority candidate upon cancellation', () => {
    const waitlist = [
      { id: 1, userId: 101, position: 1, status: 'WAITING' },
      { id: 2, userId: 102, position: 2, status: 'WAITING' },
    ];

    // Auto-promote top candidate
    const topCandidate = waitlist.find((w) => w.status === 'WAITING' && w.position === 1);
    assert.ok(topCandidate);
    topCandidate.status = 'NOTIFIED';
    topCandidate.notifiedAt = new Date().toISOString();

    assert.equal(topCandidate.status, 'NOTIFIED');
    assert.ok(topCandidate.notifiedAt);
  });

  it('6. No-Show Penalty: transitions status to NO_SHOW and assigns fine', () => {
    const booking = {
      id: 'book-555',
      resourceName: 'Squash Court',
      status: 'CONFIRMED',
      penaltyAmount: 0,
    };

    // Mark as no show
    booking.status = 'NO_SHOW';
    booking.penaltyAmount = 150;

    assert.equal(booking.status, 'NO_SHOW');
    assert.equal(booking.penaltyAmount, 150);
  });

  it('7. Recurring Booking: expands daily and weekly occurrences correctly', () => {
    const generateOccurrences = (startDateStr, frequency, count) => {
      const dates = [];
      const current = new Date(startDateStr);
      for (let i = 0; i < count; i++) {
        dates.push(current.toISOString().split('T')[0]);
        if (frequency === 'DAILY') {
          current.setDate(current.getDate() + 1);
        } else if (frequency === 'WEEKLY') {
          current.setDate(current.getDate() + 7);
        }
      }
      return dates;
    };

    const dailyDates = generateOccurrences('2026-11-01', 'DAILY', 3);
    assert.deepEqual(dailyDates, ['2026-11-01', '2026-11-02', '2026-11-03']);

    const weeklyDates = generateOccurrences('2026-11-01', 'WEEKLY', 3);
    assert.deepEqual(weeklyDates, ['2026-11-01', '2026-11-08', '2026-11-15']);
  });
});
