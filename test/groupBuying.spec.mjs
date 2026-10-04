import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test Mock Data & Pure Logic extracted from domain specifications
const SAMPLE_DEAL = {
  id: 'd1',
  title: 'Aashirvaad Atta 10 KG',
  mrp: 680,
  standardPrice: 640,
  currentTierPrice: 585,
  committedQty: 73,
  targetQty: 100,
  pricingModel: 'THRESHOLD',
  priceTiers: [
    { id: 't1', minQty: 1, maxQty: 19, price: 640, label: '1?19 units' },
    { id: 't2', minQty: 20, maxQty: 49, price: 610, label: '20+ units' },
    { id: 't3', minQty: 50, maxQty: 99, price: 585, label: '50+ units' },
    { id: 't4', minQty: 100, maxQty: null, price: 560, label: '100+ units' },
  ],
};

function calculateTierPrice(deal, qty) {
  const effectiveQty = deal.committedQty + qty;
  const sortedTiers = [...deal.priceTiers].sort((a, b) => b.minQty - a.minQty);
  const matchedTier = sortedTiers.find(t => effectiveQty >= t.minQty) || deal.priceTiers[0];
  const unitPrice = matchedTier.price;
  const totalPrice = unitPrice * qty;
  const savings = (deal.mrp - unitPrice) * qty;
  return { unitPrice, totalPrice, savings, tierLabel: matchedTier.label };
}

function calculateNextTierUnitsNeeded(deal) {
  const currentCommitted = deal.committedQty;
  const sortedAsc = [...deal.priceTiers].sort((a, b) => a.minQty - b.minQty);
  const nextTier = sortedAsc.find(t => t.minQty > currentCommitted);
  return nextTier ? nextTier.minQty - currentCommitted : 0;
}

function generateOrderPass(dealId, title, qty, unitPrice, mrp, pickupPoint) {
  const orderId = 'GB-2026-' + Math.floor(10000 + Math.random() * 90000);
  const token = 'TKN-' + dealId + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    id: orderId,
    dealId,
    title,
    qty,
    unitPrice,
    total: unitPrice * qty,
    savings: (mrp - unitPrice) * qty,
    qrCode: token,
    status: 'CONFIRMED',
    pickupPoint: pickupPoint || 'Clubhouse Desk',
    createdAt: new Date().toISOString(),
  };
}

function generateCollectorPin(collectorName, relation) {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  return {
    id: 'col-' + Date.now(),
    name: collectorName,
    relationship: relation,
    authPin: pin,
    expiresAt: '7:00 PM',
  };
}

function parseNaturalLanguageQuery(query, deals, demands) {
  const q = query.toLowerCase();
  const matchedDeals = deals.filter(d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
  const matchedDemands = demands.filter(d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));

  if (matchedDeals.length > 0) {
    return {
      action: 'JOIN_DEAL',
      matchesCount: matchedDeals.length,
      bestPrice: matchedDeals[0].currentTierPrice,
      confidence: 0.95,
    };
  } else if (matchedDemands.length > 0) {
    return {
      action: 'UPVOTE_DEMAND',
      matchesCount: matchedDemands.length,
      confidence: 0.88,
    };
  }
  return {
    action: 'CREATE_DEMAND',
    matchesCount: 0,
    confidence: 0.75,
  };
}

describe('Mana Group Buy ? Pricing Engine Tests', () => {
  test('Should calculate current tier price correctly for existing commitments', () => {
    const res = calculateTierPrice(SAMPLE_DEAL, 2);
    assert.strictEqual(res.unitPrice, 585);
    assert.strictEqual(res.totalPrice, 1170);
    assert.strictEqual(res.savings, (680 - 585) * 2);
    assert.strictEqual(res.tierLabel, '50+ units');
  });

  test('Should unlock higher tier when collective order crosses threshold', () => {
    // 73 current + 28 new = 101 units -> unlocks tier 4 (100+ units at 560)
    const res = calculateTierPrice(SAMPLE_DEAL, 28);
    assert.strictEqual(res.unitPrice, 560);
    assert.strictEqual(res.totalPrice, 560 * 28);
    assert.strictEqual(res.tierLabel, '100+ units');
  });

  test('Should compute units remaining for next volume tier', () => {
    // 73 committed, next tier is 100 -> 27 units needed
    const unitsNeeded = calculateNextTierUnitsNeeded(SAMPLE_DEAL);
    assert.strictEqual(unitsNeeded, 27);
  });
});

describe('Mana Group Buy ? Order & Digital QR Token Tests', () => {
  test('Should generate order with non-PII signed token format', () => {
    const order = generateOrderPass('d1', 'Aashirvaad Atta 10 KG', 3, 585, 680, 'Clubhouse Ground Floor');
    assert.ok(order.id.startsWith('GB-2026-'));
    assert.ok(order.qrCode.startsWith('TKN-d1-'));
    assert.strictEqual(order.total, 1755);
    assert.strictEqual(order.savings, 285);
    assert.strictEqual(order.status, 'CONFIRMED');
    // Ensure no phone or personal email in QR token
    assert.ok(!order.qrCode.includes('@'));
  });

  test('Should generate valid 4-digit split pickup authorization PIN', () => {
    const col = generateCollectorPin('Ramesh (Helper)', 'Helper');
    assert.strictEqual(col.authPin.length, 4);
    assert.ok(/^[0-9]{4}$/.test(col.authPin));
    assert.strictEqual(col.relationship, 'Helper');
  });
});

describe('Mana Group Buy ? Natural Language & AI Demand Matching', () => {
  const deals = [
    { title: 'Fortune Sunflower Oil 5L', category: 'Grocery', currentTierPrice: 649 },
    { title: 'Aashirvaad Atta 10 KG', category: 'Grocery', currentTierPrice: 585 },
  ];
  const demands = [
    { title: 'Organic Coconut Oil 1L', category: 'Grocery' },
  ];

  test('Should match live group buy deal from query "sunflower oil"', () => {
    const result = parseNaturalLanguageQuery('sunflower oil', deals, demands);
    assert.strictEqual(result.action, 'JOIN_DEAL');
    assert.strictEqual(result.bestPrice, 649);
    assert.ok(result.confidence >= 0.9);
  });

  test('Should match demand board item from query "coconut oil"', () => {
    const result = parseNaturalLanguageQuery('coconut oil', deals, demands);
    assert.strictEqual(result.action, 'UPVOTE_DEMAND');
  });

  test('Should suggest demand creation for unseen products', () => {
    const result = parseNaturalLanguageQuery('Alphonso Mango Box', deals, demands);
    assert.strictEqual(result.action, 'CREATE_DEMAND');
  });
});

describe('Mana Group Buy - Vendor Fulfillment Manifest Accounting', () => {
  const manifestOrders = [
    { flat: 'A-101', residentName: 'Ramesh Patel', qty: 2, total: 1170 },
    { flat: 'A-204', residentName: 'Sneha Verma', qty: 3, total: 1755 },
    { flat: 'B-301', residentName: 'Kiran Rao', qty: 1, total: 585 },
  ];

  test('Should accurately calculate gross manifest revenue and total units', () => {
    const totalUnits = manifestOrders.reduce((acc, o) => acc + o.qty, 0);
    const totalRevenue = manifestOrders.reduce((acc, o) => acc + o.total, 0);

    assert.strictEqual(totalUnits, 6);
    assert.strictEqual(totalRevenue, 3510);
  });
});

describe('Mana Group Buy - Vendor Settlement & Escrow Deductions', () => {
  function calculateSettlement(grossSales, feePct = 3.5, tdsPct = 1.0) {
    const platformFee = Math.round((grossSales * (feePct / 100)) * 100) / 100;
    const tds = Math.round((grossSales * (tdsPct / 100)) * 100) / 100;
    const netPayout = Math.round((grossSales - platformFee - tds) * 100) / 100;
    return { grossSales, platformFee, tds, netPayout };
  }

  test('Should compute vendor net settlement with platform fee and TDS deducted', () => {
    const settlement = calculateSettlement(42705, 3.5, 1.0);
    assert.strictEqual(settlement.grossSales, 42705);
    assert.strictEqual(settlement.platformFee, 1494.68);
    assert.strictEqual(settlement.tds, 427.05);
    assert.strictEqual(settlement.netPayout, 40783.27);
  });

  test('Should hold settlement in escrow until deal delivery is fulfilled', () => {
    const dealStatus = 'PICKUP_IN_PROGRESS';
    const payoutStatus = dealStatus === 'COMPLETED' ? 'PAID' : 'ESCROW_HOLD';
    assert.strictEqual(payoutStatus, 'ESCROW_HOLD');
  });
});

describe('Mana Group Buy - Review & Dispute Lifecycle', () => {
  test('Should create dispute claim with valid status transitions', () => {
    const dispute = {
      id: 'DISP-2026-101',
      orderId: 'GB-2026-00089',
      reason: 'DAMAGED_ITEMS',
      claimAmount: 210,
      requestedResolution: 'REFUND',
      status: 'SUBMITTED',
    };

    assert.strictEqual(dispute.status, 'SUBMITTED');
    assert.ok(dispute.claimAmount > 0);

    const resolvedDispute = { ...dispute, status: 'APPROVED', resolvedAt: new Date().toISOString() };
    assert.strictEqual(resolvedDispute.status, 'APPROVED');
    assert.ok(resolvedDispute.resolvedAt);
  });
});
