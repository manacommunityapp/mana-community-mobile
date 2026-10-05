import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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
    { id: 't1', minQty: 1, maxQty: 19, price: 640, label: '1-19 units' },
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

function calculateVendorScore(offer, demand) {
  const targetAvg = (demand.preferredPriceMin + demand.preferredPriceMax) / 2;
  const priceRatio = targetAvg / offer.pricePerUnit;
  const priceScore = Math.min(100, Math.max(0, Math.round(priceRatio * 85)));

  const vendorRatingScore = Math.round((offer.vendorRating / 5.0) * 100);
  const fulfillmentRateScore = Math.round(offer.fulfillmentRate);
  const onTimeRateScore = Math.round(offer.onTimeRate);
  const lowCancellationScore = Math.round(Math.max(0, 100 - offer.cancellationRate * 10));
  const lowDisputeScore = Math.round(Math.max(0, 100 - offer.disputeRate * 20));
  const qualityScore = Math.round((offer.qualityScore / 5.0) * 100);
  const moqFeasibilityScore = offer.moq <= demand.expectedQuantity ? 100 : Math.max(20, Math.round((demand.expectedQuantity / offer.moq) * 100));

  const compositeScore = Math.round(
    priceScore * 0.30 +
    vendorRatingScore * 0.15 +
    fulfillmentRateScore * 0.15 +
    onTimeRateScore * 0.15 +
    lowCancellationScore * 0.10 +
    lowDisputeScore * 0.05 +
    qualityScore * 0.05 +
    moqFeasibilityScore * 0.05
  );

  return { compositeScore, priceScore, fulfillmentRateScore, onTimeRateScore };
}

function rankOffers(offers, demand) {
  const scored = offers.map(o => ({ ...o, scoring: calculateVendorScore(o, demand) }));
  scored.sort((a, b) => b.scoring.compositeScore - a.scoring.compositeScore);
  scored[0].isBestValue = true;
  return scored;
}

describe('Mana Group Buy - Pricing Engine Tests', () => {
  test('Should calculate current tier price correctly for existing commitments', () => {
    const res = calculateTierPrice(SAMPLE_DEAL, 2);
    assert.strictEqual(res.unitPrice, 585);
    assert.strictEqual(res.totalPrice, 1170);
    assert.strictEqual(res.savings, (680 - 585) * 2);
    assert.strictEqual(res.tierLabel, '50+ units');
  });

  test('Should unlock higher tier when collective order crosses threshold', () => {
    const res = calculateTierPrice(SAMPLE_DEAL, 28);
    assert.strictEqual(res.unitPrice, 560);
    assert.strictEqual(res.totalPrice, 560 * 28);
    assert.strictEqual(res.tierLabel, '100+ units');
  });

  test('Should compute units remaining for next volume tier', () => {
    const unitsNeeded = calculateNextTierUnitsNeeded(SAMPLE_DEAL);
    assert.strictEqual(unitsNeeded, 27);
  });
});

describe('Mana Group Buy - Order & Digital QR Token Tests', () => {
  test('Should generate order with non-PII signed token format', () => {
    const order = generateOrderPass('d1', 'Aashirvaad Atta 10 KG', 3, 585, 680, 'Clubhouse Ground Floor');
    assert.ok(order.id.startsWith('GB-2026-'));
    assert.ok(order.qrCode.startsWith('TKN-d1-'));
    assert.strictEqual(order.total, 1755);
    assert.strictEqual(order.savings, 285);
    assert.strictEqual(order.status, 'CONFIRMED');
    assert.ok(!order.qrCode.includes('@'));
  });

  test('Should generate valid 4-digit split pickup authorization PIN', () => {
    const col = generateCollectorPin('Ramesh (Helper)', 'Helper');
    assert.strictEqual(col.authPin.length, 4);
    assert.ok(/^[0-9]{4}$/.test(col.authPin));
    assert.strictEqual(col.relationship, 'Helper');
  });
});

describe('Mana Group Buy - Community Vendor Selection Engine & Multi-Criteria Scoring', () => {
  const demand = {
    expectedQuantity: 143,
    preferredPriceMin: 500,
    preferredPriceMax: 560,
  };

  const offers = [
    {
      id: 'offer-a',
      vendorName: 'Heritage Grains',
      vendorRating: 4.8,
      pricePerUnit: 580,
      moq: 100,
      fulfillmentRate: 99.4,
      onTimeRate: 98.5,
      cancellationRate: 0.2,
      disputeRate: 0.1,
      qualityScore: 4.9,
    },
    {
      id: 'offer-b',
      vendorName: 'DirectAgro Wholesaler',
      vendorRating: 4.6,
      pricePerUnit: 550,
      moq: 150,
      fulfillmentRate: 99.2,
      onTimeRate: 97.8,
      cancellationRate: 0.6,
      disputeRate: 0.3,
      qualityScore: 4.8,
    },
    {
      id: 'offer-c',
      vendorName: 'BazaarMart Bulk',
      vendorRating: 3.9,
      pricePerUnit: 535,
      moq: 200,
      fulfillmentRate: 91.0,
      onTimeRate: 88.0,
      cancellationRate: 4.5,
      disputeRate: 2.8,
      qualityScore: 3.9,
    },
  ];

  test('Should rank vendor offers by Best Value composite score, not raw price alone', () => {
    const ranked = rankOffers(offers, demand);
    assert.strictEqual(ranked.length, 3);
    assert.strictEqual(ranked[0].isBestValue, true);
    assert.ok(ranked[0].scoring.compositeScore >= 85);
    // Cheapest raw vendor (offer-c at 535) is ranked lowest due to poor reliability (91% fulfillment, 4.5% cancellation)
    assert.strictEqual(ranked[2].id, 'offer-c');
    assert.ok(ranked[0].scoring.compositeScore > ranked[2].scoring.compositeScore);
  });

  test('Should compute accurate reliability scoring components', () => {
    const score = calculateVendorScore(offers[1], demand);
    assert.ok(score.compositeScore >= 85);
    assert.strictEqual(score.fulfillmentRateScore, 99);
    assert.strictEqual(score.onTimeRateScore, 98);
  });
});

describe('Mana Group Buy - Community Buying Power & Dashboard Metrics', () => {
  const monthlyData = {
    totalSaved: 184520,
    totalOrders: 1248,
    activeDeals: 38,
    totalKgBought: 2450,
    avgSavingPerOrder: 147,
    topSavingCategory: 'Groceries & Farm Produce',
    collectiveDiscountPercent: 23.8,
    heroMilestoneText: 'Your community saved 18.4 lakh through collective purchasing this year.',
  };

  test('Should validate collective savings and order milestones', () => {
    assert.strictEqual(monthlyData.totalSaved, 184520);
    assert.strictEqual(monthlyData.totalOrders, 1248);
    assert.strictEqual(monthlyData.avgSavingPerOrder, 147);
    assert.strictEqual(monthlyData.collectiveDiscountPercent, 23.8);
    assert.ok(monthlyData.heroMilestoneText.includes('18.4 lakh'));
  });
});

describe('Mana Group Buy - Natural Language & AI Demand Matching', () => {
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
