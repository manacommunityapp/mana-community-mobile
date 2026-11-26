import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Express Delivery Partner API Suite (Mobile Spec)', () => {
  function evaluateExpressApproval(pref, partner) {
    if (!pref) return true; // Fail-open for quick commerce
    const p = (partner || '').toUpperCase();
    if (p === 'SWIGGY') return Boolean(pref.autoApproveSwiggy);
    if (p === 'ZOMATO') return Boolean(pref.autoApproveZomato);
    if (p === 'BLINKIT') return Boolean(pref.autoApproveBlinkit);
    if (p === 'ZEPTO') return Boolean(pref.autoApproveZepto);
    if (p === 'AMAZON') return Boolean(pref.autoApproveAmazon);
    return Boolean(pref.autoApproveOther);
  }

  function parseExpressToken(input) {
    if (!input) return null;
    const clean = input.trim().toUpperCase();
    if (clean.startsWith('EXP:')) {
      const parts = clean.split(':');
      return { communityId: parts[1], partner: parts[2], orderId: parts[3], code: parts[4] };
    }
    if (clean.startsWith('EXP-')) {
      return { code: clean };
    }
    if (/^\d{4}$/.test(clean)) {
      return { code: `EXP-${clean}` };
    }
    return null;
  }

  it('1. Pre-approves Blinkit, Swiggy, and Amazon orders by default', () => {
    const defaultPref = {
      autoApproveSwiggy: true,
      autoApproveZomato: true,
      autoApproveBlinkit: true,
      autoApproveZepto: true,
      autoApproveAmazon: true,
      autoApproveOther: true,
    };

    assert.equal(evaluateExpressApproval(defaultPref, 'BLINKIT'), true);
    assert.equal(evaluateExpressApproval(defaultPref, 'SWIGGY'), true);
    assert.equal(evaluateExpressApproval(defaultPref, 'AMAZON'), true);
  });

  it('2. Respects resident opt-out for specific platforms', () => {
    const customPref = {
      autoApproveSwiggy: true,
      autoApproveZomato: false, // User requires manual call for Zomato
      autoApproveBlinkit: true,
      autoApproveZepto: true,
      autoApproveAmazon: false,
      autoApproveOther: false,
    };

    assert.equal(evaluateExpressApproval(customPref, 'ZOMATO'), false);
    assert.equal(evaluateExpressApproval(customPref, 'BLINKIT'), true);
    assert.equal(evaluateExpressApproval(customPref, 'AMAZON'), false);
  });

  it('3. Parses Express Entry QR barcodes and 4-digit numeric tokens accurately', () => {
    const barcode = 'EXP:1:BLINKIT:BLNK-101:EXP-8842';
    const parsedBarcode = parseExpressToken(barcode);
    assert.equal(parsedBarcode.partner, 'BLINKIT');
    assert.equal(parsedBarcode.orderId, 'BLNK-101');
    assert.equal(parsedBarcode.code, 'EXP-8842');

    const shortNum = '8842';
    const parsedNum = parseExpressToken(shortNum);
    assert.equal(parsedNum.code, 'EXP-8842');
  });
});
