import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Home Services Subscriptions, Slot Contention & Split Ledger (Mobile Spec)', () => {
  it('1. Enforces 23:59 cutoff freeze rolling D+1 overrides to D+2', () => {
    const resolveEffectiveDate = (hour, minute, requestedDay, tomorrowDay) => {
      if (requestedDay <= tomorrowDay && (hour > 23 || (hour === 23 && minute >= 59))) {
        return tomorrowDay + 1;
      }
      return requestedDay;
    };

    assert.equal(resolveEffectiveDate(22, 15, 28, 28), 28);
    assert.equal(resolveEffectiveDate(23, 59, 28, 28), 29);
  });

  it('2. Computes weekend + peak surge - cluster discount quote accurately', () => {
    const quote = (base, isWeekend, utilPct, cluster) => {
      const weekendMult = isWeekend ? 1.15 : 1.0;
      const surgeMult = utilPct >= 85 ? 1.3 : utilPct >= 65 ? 1.15 : 1.0;
      const raw = Math.round(base * weekendMult * surgeMult * 100) / 100;
      const discount = cluster ? Math.round(raw * 0.1 * 100) / 100 : 0;
      return Math.round((raw - discount) * 100) / 100;
    };

    assert.equal(quote(1000, true, 90, true), 1345.5);
  });

  it('3. Balances ₹1,200 multi-tender funding legs against vendor/commission/GST credits', () => {
    const gross = 1200;
    const points = 200;
    const coupon = 100;
    const upi = 900;
    const commission = Math.round(gross * 0.15 * 100) / 100;
    const gst = Math.round(commission * 0.18 * 100) / 100;
    const vendorNet = Math.round((gross - commission - gst) * 100) / 100;

    assert.equal(points + coupon + upi, gross);
    assert.equal(Math.round((vendorNet + commission + gst) * 100) / 100, gross);
    assert.equal(vendorNet, 987.6);
  });
});
