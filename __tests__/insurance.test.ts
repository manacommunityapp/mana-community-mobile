/**
 * Insurance Hub — unit tests for constants/insurance.ts
 *
 * Pure logic tests only. No React Native imports, no network calls.
 * The Expo EXPO_PUBLIC_* env substitution module is mocked below.
 */

// Mock expo's virtual env module before any imports that trigger it
jest.mock('expo/virtual/env', () => ({}), { virtual: true });

import {
  maskPolicyNumber,
  newIdempotencyKey,
  isExpired,
  daysUntil,
  renewalBucket,
  isSafeHandoffUrl,
  sortCatalogue,
  buildComparison,
  validateQuoteFields,
  normaliseRegNo,
  categoryLabel,
  categoryFromParam,
} from '../constants/insurance';
import type { CatalogueItem } from '../types/insurance';

// ────────────────────────── maskPolicyNumber ──────────────────────────
describe('maskPolicyNumber', () => {
  test('returns dash for undefined', () => { expect(maskPolicyNumber(undefined)).toBe('—'); });
  test('returns dash for null', () => { expect(maskPolicyNumber(null)).toBe('—'); });
  test('returns dash for empty string', () => { expect(maskPolicyNumber('')).toBe('—'); });
  test('masks short alphanumeric to XXXX', () => { expect(maskPolicyNumber('ABC')).toBe('XXXX'); });
  test('keeps last 4 characters', () => { expect(maskPolicyNumber('AB1234567890')).toBe('XXXXXX7890'); });
  test('strips hyphens and spaces before masking', () => { expect(maskPolicyNumber('AB-12-34-56')).toBe('XXXXXX3456'); });
});

// ────────────────────────── newIdempotencyKey ──────────────────────────
describe('newIdempotencyKey', () => {
  test('starts with q-', () => { expect(newIdempotencyKey()).toMatch(/^q-/); });
  test('two calls with different seeds produce different keys', () => {
    expect(newIdempotencyKey(1, () => 0.1)).not.toBe(newIdempotencyKey(2, () => 0.9));
  });
});

// ────────────────────────── isExpired ──────────────────────────
describe('isExpired', () => {
  const now = new Date('2025-06-01T12:00:00Z');
  test('past ISO date is expired', () => { expect(isExpired('2025-05-31T23:59:00Z', now)).toBe(true); });
  test('future ISO date is not expired', () => { expect(isExpired('2025-06-02T00:01:00Z', now)).toBe(false); });
  test('invalid ISO string returns true (treat as expired)', () => { expect(isExpired('not-a-date', now)).toBe(true); });
});

// ────────────────────────── daysUntil ──────────────────────────
describe('daysUntil', () => {
  const now = new Date('2025-06-01');
  test('null for undefined', () => { expect(daysUntil(undefined, now)).toBeNull(); });
  test('null for null', () => { expect(daysUntil(null, now)).toBeNull(); });
  test('null for invalid date', () => { expect(daysUntil('bad', now)).toBeNull(); });
  test('0 for today', () => { expect(daysUntil('2025-06-01', now)).toBe(0); });
  test('positive days for future date', () => { expect(daysUntil('2025-06-06', now)).toBe(5); });
  test('negative days for past date', () => { expect(daysUntil('2025-05-25', now)).toBeLessThan(0); });
});

// ────────────────────────── renewalBucket ──────────────────────────
describe('renewalBucket', () => {
  const now = new Date('2025-06-01');
  test('OVERDUE for past expiry', () => { expect(renewalBucket({ expiryDate: '2025-05-01' }, now)).toBe('OVERDUE'); });
  test('DUE_30 within 30 days', () => { expect(renewalBucket({ expiryDate: '2025-06-20' }, now)).toBe('DUE_30'); });
  test('DUE_60 within 60 days', () => { expect(renewalBucket({ expiryDate: '2025-07-20' }, now)).toBe('DUE_60'); });
  test('LATER for far future', () => { expect(renewalBucket({ expiryDate: '2026-01-01' }, now)).toBe('LATER'); });
  test('UNKNOWN for null expiry', () => { expect(renewalBucket({ expiryDate: null }, now)).toBe('UNKNOWN'); });
  test('UNKNOWN for undefined expiry', () => { expect(renewalBucket({ expiryDate: undefined }, now)).toBe('UNKNOWN'); });
});

// ────────────────────────── isSafeHandoffUrl ──────────────────────────
describe('isSafeHandoffUrl', () => {
  const host = 'partner.example.com';
  test('valid https url passes', () => { expect(isSafeHandoffUrl('https://partner.example.com/quote?id=1', host)).toBe(true); });
  test('http rejected', () => { expect(isSafeHandoffUrl('http://partner.example.com/q', host)).toBe(false); });
  test('credentials in url rejected', () => { expect(isSafeHandoffUrl('https://user:pass@partner.example.com/q', host)).toBe(false); });
  test('wrong host rejected', () => { expect(isSafeHandoffUrl('https://evil.com/q', host)).toBe(false); });
  test('url over 2000 chars rejected', () => { expect(isSafeHandoffUrl('https://partner.example.com/' + 'a'.repeat(2000), host)).toBe(false); });
  test('empty string rejected', () => { expect(isSafeHandoffUrl('', host)).toBe(false); });
  test('control character rejected', () => { expect(isSafeHandoffUrl('https://partner.example.com/\u0001', host)).toBe(false); });
});

// ────────────────────────── sortCatalogue ──────────────────────────
describe('sortCatalogue', () => {
  const items: CatalogueItem[] = [
    { productVersionId: 1, productId: 1, category: 'HEALTH', name: 'Zeta Plan', versionNo: 1, insurerName: 'Bravo Insurance', partnerType: 'INSURER', dataSource: 'SANDBOX' },
    { productVersionId: 2, productId: 2, category: 'HEALTH', name: 'Alpha Plan', versionNo: 1, insurerName: 'Alpha Insurance', partnerType: 'INSURER', dataSource: 'SANDBOX' },
  ];
  test('sorts by NAME ascending', () => {
    const r = sortCatalogue(items, 'NAME');
    expect(r[0].name).toBe('Alpha Plan');
  });
  test('sorts by INSURER ascending', () => {
    const r = sortCatalogue(items, 'INSURER');
    expect(r[0].insurerName).toBe('Alpha Insurance');
  });
  test('does not mutate the original array', () => {
    const original0 = items[0];
    sortCatalogue(items, 'NAME');
    expect(items[0]).toBe(original0);
  });
});

// ────────────────────────── buildComparison ──────────────────────────
describe('buildComparison', () => {
  const a: CatalogueItem = { productVersionId: 1, productId: 1, category: 'HEALTH', name: 'Plan A', versionNo: 1, insurerName: 'ABC Corp', partnerType: 'INSURER', dataSource: 'SANDBOX' };
  const b: CatalogueItem = { productVersionId: 2, productId: 2, category: 'HEALTH', name: 'Plan B', versionNo: 1, insurerName: 'XYZ Corp', partnerType: 'INSURER', dataSource: 'SANDBOX' };

  test('Insurer row is flagged as differing when insurers differ', () => {
    const rows = buildComparison([a, b]);
    const insurerRow = rows.find((r) => r.label === 'Insurer');
    expect(insurerRow?.differs).toBe(true);
  });
  test('every row has a value for each product', () => {
    const rows = buildComparison([a, b]);
    expect(rows[0].values.length).toBe(2);
  });
  test('no premium, CSR, "best" or "cheapest" rows', () => {
    const rows = buildComparison([a, b]);
    const labels = rows.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => /premium|csr|settlement|cheapest|best/.test(l))).toBe(false);
  });
  test('empty list returns rows with 0 values each', () => {
    const rows = buildComparison([]);
    expect(rows[0].values.length).toBe(0);
  });
});

// ────────────────────────── validateQuoteFields ──────────────────────────
describe('validateQuoteFields', () => {
  const today = new Date('2025-06-01');

  describe('HEALTH', () => {
    test('valid ages + pincode passes', () => {
      expect(Object.keys(validateQuoteFields('HEALTH', { memberAges: [30, 28], pincode: '560001' }, today))).toHaveLength(0);
    });
    test('empty ages array fails', () => {
      expect(validateQuoteFields('HEALTH', { memberAges: [], pincode: '560001' }, today)).toHaveProperty('memberAges');
    });
    test('too many members fails', () => {
      expect(validateQuoteFields('HEALTH', { memberAges: Array(13).fill(30), pincode: '560001' }, today)).toHaveProperty('memberAges');
    });
    test('invalid pincode fails', () => {
      expect(validateQuoteFields('HEALTH', { memberAges: [30], pincode: '99' }, today)).toHaveProperty('pincode');
    });
    test('pincode starting with 0 fails', () => {
      expect(validateQuoteFields('HEALTH', { memberAges: [30], pincode: '012345' }, today)).toHaveProperty('pincode');
    });
  });

  describe('PARENTS', () => {
    test('minor age in parents cover fails', () => {
      expect(validateQuoteFields('PARENTS', { memberAges: [17, 45], pincode: '560001' }, today)).toHaveProperty('memberAges');
    });
  });

  describe('LIFE_TERM', () => {
    test('valid inputs pass', () => {
      expect(Object.keys(validateQuoteFields('LIFE_TERM', { age: 30, annualIncome: 500000, smoker: false }, today))).toHaveLength(0);
    });
    test('age 17 fails', () => {
      expect(validateQuoteFields('LIFE_TERM', { age: 17, annualIncome: 500000, smoker: false }, today)).toHaveProperty('age');
    });
    test('age 66 fails', () => {
      expect(validateQuoteFields('LIFE_TERM', { age: 66, annualIncome: 500000, smoker: false }, today)).toHaveProperty('age');
    });
    test('zero income fails', () => {
      expect(validateQuoteFields('LIFE_TERM', { age: 30, annualIncome: 0, smoker: false }, today)).toHaveProperty('annualIncome');
    });
    test('missing smoker field fails', () => {
      expect(validateQuoteFields('LIFE_TERM', { age: 30, annualIncome: 500000 }, today)).toHaveProperty('smoker');
    });
  });

  describe('MOTOR_CAR', () => {
    test('valid reg + pincode passes', () => {
      expect(Object.keys(validateQuoteFields('MOTOR_CAR', { registrationNumber: 'KA01AB1234', pincode: '560001' }, today))).toHaveLength(0);
    });
    test('invalid reg fails', () => {
      expect(validateQuoteFields('MOTOR_CAR', { registrationNumber: 'BADNUM', pincode: '560001' }, today)).toHaveProperty('registrationNumber');
    });
  });

  describe('HOME', () => {
    test('valid inputs pass', () => {
      expect(Object.keys(validateQuoteFields('HOME', { pincode: '560001', propertyType: 'APARTMENT', sumInsuredWanted: 5000000 }, today))).toHaveLength(0);
    });
    test('negative sum insured fails', () => {
      expect(validateQuoteFields('HOME', { pincode: '560001', propertyType: 'APARTMENT', sumInsuredWanted: -1 }, today)).toHaveProperty('sumInsuredWanted');
    });
  });

  describe('TRAVEL', () => {
    test('valid inputs pass', () => {
      expect(Object.keys(validateQuoteFields('TRAVEL', { destination: 'UK', startDate: '2025-07-01', endDate: '2025-07-10', travellers: 2 }, today))).toHaveLength(0);
    });
    test('past start date fails', () => {
      expect(validateQuoteFields('TRAVEL', { destination: 'UK', startDate: '2025-05-01', endDate: '2025-05-10', travellers: 2 }, today)).toHaveProperty('startDate');
    });
    test('end before start fails', () => {
      expect(validateQuoteFields('TRAVEL', { destination: 'UK', startDate: '2025-07-10', endDate: '2025-07-05', travellers: 2 }, today)).toHaveProperty('endDate');
    });
    test('trip over 365 days fails', () => {
      expect(validateQuoteFields('TRAVEL', { destination: 'UK', startDate: '2025-07-01', endDate: '2026-07-10', travellers: 2 }, today)).toHaveProperty('endDate');
    });
  });

  describe('OTHER / unknown', () => {
    test('OTHER always returns a category error', () => {
      expect(validateQuoteFields('OTHER', {}, today)).toHaveProperty('category');
    });
  });
});

// ────────────────────────── normaliseRegNo ──────────────────────────
describe('normaliseRegNo', () => {
  test('strips spaces, hyphens and uppercases', () => {
    expect(normaliseRegNo('ka 01-ab-1234')).toBe('KA01AB1234');
  });
  test('already clean input unchanged', () => {
    expect(normaliseRegNo('MH02CD5678')).toBe('MH02CD5678');
  });
});

// ────────────────────────── categoryLabel / categoryFromParam ──────────────────────────
describe('category helpers', () => {
  test('categoryLabel returns human-readable label for HEALTH', () => {
    expect(categoryLabel('HEALTH')).toBe('Health insurance');
  });
  test('categoryFromParam resolves lowercase key', () => {
    expect(categoryFromParam('health')).toBe('HEALTH');
  });
  test('categoryFromParam resolves uppercase key', () => {
    expect(categoryFromParam('MOTOR_CAR')).toBe('MOTOR_CAR');
  });
  test('categoryFromParam returns undefined for unknown', () => {
    expect(categoryFromParam('NOT_A_THING')).toBeUndefined();
  });
  test('categoryFromParam returns undefined for empty string', () => {
    expect(categoryFromParam('')).toBeUndefined();
  });
});