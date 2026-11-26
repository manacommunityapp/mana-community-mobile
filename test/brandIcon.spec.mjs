import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Brand Icon Resolution Test Suite (Mobile FontAwesome6 & UPI)', () => {
  function matchBrand(text) {
    if (!text) return null;
    const s = text.toLowerCase();
    if (s.includes('amazon') || s.includes('amzn')) return 'amazon';
    if (s.includes('whatsapp') || s.includes('wa.me')) return 'whatsapp';
    if (s.includes('upi') || s.includes('bhim') || s.includes('phonepe') || s.includes('paytm')) return 'upi';
    if (s.includes('google pay') || s.includes('gpay')) return 'googlepay';
    if (s.includes('apple pay')) return 'applepay';
    if (s.includes('fedex')) return 'fedex';
    if (s.includes('ups')) return 'ups';
    if (s.includes('dhl')) return 'dhl';
    return null;
  }

  it('1. Recognizes Amazon courier deliveries', () => {
    assert.equal(matchBrand('Amazon Courier Delivery'), 'amazon');
    assert.equal(matchBrand('AMZN Package Delivery'), 'amazon');
  });

  it('2. Recognizes WhatsApp share targets', () => {
    assert.equal(matchBrand('Share via WhatsApp'), 'whatsapp');
    assert.equal(matchBrand('wa.me link'), 'whatsapp');
  });

  it('3. Recognizes UPI payment modes', () => {
    assert.equal(matchBrand('Pay via UPI QR'), 'upi');
    assert.equal(matchBrand('PhonePe / GPay / Paytm'), 'upi');
  });

  it('4. Recognizes Global Couriers (FedEx, UPS, DHL)', () => {
    assert.equal(matchBrand('FedEx Express Parcel'), 'fedex');
    assert.equal(matchBrand('UPS International'), 'ups');
    assert.equal(matchBrand('DHL Express Cargo'), 'dhl');
  });

  it('5. Returns null for regular visitors without brand associations', () => {
    assert.equal(matchBrand('Ramesh Kumar - Family Friend'), null);
    assert.equal(matchBrand('Plumbing Maintenance Visit'), null);
  });
});
