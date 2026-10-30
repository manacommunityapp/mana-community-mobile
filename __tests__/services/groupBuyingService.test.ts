import {
  groupBuyingService,
  calculateVendorScore,
  rankVendorOffers,
  SEED_DEALS,
  SEED_DEMANDS,
  SEED_ORDERS,
} from '@/services/groupBuyingService';

// ── Mock apiClient ────────────────────────────────────────────────────────────

const mockGet  = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: {
    get:   (...args: any[]) => mockGet(...args),
    post:  (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOffer(overrides: Record<string, any> = {}) {
  return {
    vendorId: 'vnd-1',
    vendorName: 'Test Vendor',
    pricePerUnit: 500,
    offeredPrice: 500,
    moq: 100,
    minimumQty: 100,
    vendorRating: 4.5,
    fulfillmentRate: 95,
    onTimeRate: 95,
    cancellationRate: 1,
    disputeRate: 0.5,
    qualityScore: 4.5,
    ...overrides,
  };
}

// ── calculateVendorScore ──────────────────────────────────────────────────────

describe('calculateVendorScore', () => {
  const demand = { expectedQuantity: 100, preferredPriceMin: 450, preferredPriceMax: 550 };

  it('returns all required scoring fields', () => {
    const score = calculateVendorScore(makeOffer(), demand);
    expect(score).toHaveProperty('priceScore');
    expect(score).toHaveProperty('vendorRatingScore');
    expect(score).toHaveProperty('fulfillmentRateScore');
    expect(score).toHaveProperty('onTimeRateScore');
    expect(score).toHaveProperty('compositeScore');
    expect(score).toHaveProperty('isBestValue');
    expect(score).toHaveProperty('scoringHighlights');
  });

  it('compositeScore is in [0, 100]', () => {
    const score = calculateVendorScore(makeOffer(), demand);
    expect(score.compositeScore).toBeGreaterThanOrEqual(0);
    expect(score.compositeScore).toBeLessThanOrEqual(100);
  });

  it('priceScore is higher when offer price is well below target average', () => {
    const cheap = calculateVendorScore(makeOffer({ pricePerUnit: 400 }), demand);
    const expensive = calculateVendorScore(makeOffer({ pricePerUnit: 700 }), demand);
    expect(cheap.priceScore).toBeGreaterThan(expensive.priceScore);
  });

  it('adds "Verified Gold Partner" highlight for verified vendors', () => {
    const score = calculateVendorScore(makeOffer({ isVerified: true }), demand);
    expect(score.scoringHighlights).toContain('Verified Gold Partner');
  });

  it('moqFeasibilityScore is 100 when moq <= expectedQuantity', () => {
    const score = calculateVendorScore(makeOffer({ moq: 50 }), { expectedQuantity: 100 });
    expect(score.moqFeasibilityScore).toBe(100);
  });

  it('moqFeasibilityScore < 100 when moq > expectedQuantity', () => {
    const score = calculateVendorScore(makeOffer({ moq: 200 }), { expectedQuantity: 100 });
    expect(score.moqFeasibilityScore).toBeLessThan(100);
  });
});

// ── rankVendorOffers ──────────────────────────────────────────────────────────

describe('rankVendorOffers', () => {
  const demand = { expectedQuantity: 100, preferredPriceMin: 400, preferredPriceMax: 500 };

  it('returns ranked array sorted descending by compositeScore', () => {
    const ranked = rankVendorOffers([
      makeOffer({ vendorId: 'v1', pricePerUnit: 420, fulfillmentRate: 99 }),
      makeOffer({ vendorId: 'v2', pricePerUnit: 600, fulfillmentRate: 80 }),
    ], demand);
    expect(ranked.length).toBe(2);
    const [first, second] = ranked;
    expect(first.scoring!.compositeScore).toBeGreaterThanOrEqual(second.scoring!.compositeScore);
  });

  it('marks exactly one offer as isBestValue', () => {
    const ranked = rankVendorOffers([
      makeOffer({ vendorId: 'v1' }),
      makeOffer({ vendorId: 'v2' }),
      makeOffer({ vendorId: 'v3' }),
    ], demand);
    const bestCount = ranked.filter(o => o.isBestValue || o.scoring?.isBestValue).length;
    expect(bestCount).toBe(1);
  });

  it('single-offer array marks that offer as isBestValue', () => {
    const ranked = rankVendorOffers([makeOffer()], demand);
    expect(ranked[0].scoring?.isBestValue).toBe(true);
  });
});

// ── getDeals (seed fallback) ──────────────────────────────────────────────────

describe('groupBuyingService.getDeals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns SEED_DEALS when API throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const deals = await groupBuyingService.getDeals();
    expect(deals).toEqual(SEED_DEALS);
    expect(deals.length).toBeGreaterThan(0);
  });

  it('returns SEED_DEALS when API returns empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const deals = await groupBuyingService.getDeals();
    expect(deals).toEqual(SEED_DEALS);
  });

  it('maps live backend deals when API returns data', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 42, title: 'Live Deal', priceTiers: [], committedQty: 10, currentParticipants: 5 }],
    });
    const deals = await groupBuyingService.getDeals();
    expect(deals.length).toBe(1);
    expect(deals[0].id).toBe('42');
    expect(deals[0].title).toBe('Live Deal');
  });

  it('filters seed deals by category', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const deals = await groupBuyingService.getDeals({ category: 'FRUITS_VEGETABLES' });
    expect(deals.every(d => d.category === 'FRUITS_VEGETABLES')).toBe(true);
  });
});

// ── getDealById ───────────────────────────────────────────────────────────────

describe('groupBuyingService.getDealById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns seeded deal by id when API fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const deal = await groupBuyingService.getDealById('seed-1');
    expect(deal).not.toBeNull();
    expect(deal!.id).toBe('seed-1');
  });

  it('returns null for unknown id when API fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const deal = await groupBuyingService.getDealById('nonexistent-id');
    expect(deal).toBeNull();
  });

  it('returns mapped live deal when API succeeds', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 99, title: 'Backend Deal', priceTiers: [], committedQty: 0, currentParticipants: 0 },
    });
    const deal = await groupBuyingService.getDealById('99');
    expect(deal?.id).toBe('99');
    expect(deal?.title).toBe('Backend Deal');
  });
});

// ── getUserOrders (seed fallback) ─────────────────────────────────────────────

describe('groupBuyingService.getUserOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns SEED_ORDERS when API throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const orders = await groupBuyingService.getUserOrders();
    expect(orders).toEqual(SEED_ORDERS);
    expect(orders.length).toBeGreaterThan(0);
  });

  it('returns SEED_ORDERS when API returns empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const orders = await groupBuyingService.getUserOrders();
    expect(orders).toEqual(SEED_ORDERS);
  });

  it('has a READY_FOR_PICKUP order in seed data (enables pickup scanner tests)', () => {
    const pickup = SEED_ORDERS.find(o => o.status === 'READY_FOR_PICKUP');
    expect(pickup).toBeDefined();
    expect(pickup?.pickupOtp).toBeDefined();
    expect(pickup?.pickupQrCode).toBeDefined();
  });

  it('maps live backend orders when API returns data', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 77, orderNumber: 'ORD-77', dealTitle: 'Live Order', quantity: 3, unitPrice: 400, totalAmount: 1200, status: 'CONFIRMED' }],
    });
    const orders = await groupBuyingService.getUserOrders();
    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('ORD-77');
  });
});

// ── getDemands (seed fallback) ────────────────────────────────────────────────

describe('groupBuyingService.getDemands', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns SEED_DEMANDS when API throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const demands = await groupBuyingService.getDemands();
    expect(demands).toEqual(SEED_DEMANDS);
  });

  it('returns SEED_DEMANDS when API returns empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const demands = await groupBuyingService.getDemands();
    expect(demands).toEqual(SEED_DEMANDS);
  });
});

// ── joinDeal ──────────────────────────────────────────────────────────────────

describe('groupBuyingService.joinDeal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls POST /group-buying/deals/:id/join with correct payload', async () => {
    const fakeOrder = { id: 1, orderNumber: 'ORD-1', dealId: 'seed-1', quantity: 2, unitPrice: 850, totalAmount: 1700, status: 'CONFIRMED' };
    mockPost.mockResolvedValueOnce({ data: fakeOrder });

    const order = await groupBuyingService.joinDeal('seed-1', 2, 'UPI');

    expect(mockPost).toHaveBeenCalledWith(
      '/group-buying/deals/seed-1/join',
      expect.objectContaining({ quantity: 2 }),
    );
    expect(order.id).toBe('ORD-1');
    expect(order.quantity).toBe(2);
  });

  it('supports object payload form', async () => {
    mockPost.mockResolvedValueOnce({ data: { orderNumber: 'ORD-2', dealId: 'seed-2', quantity: 1, unitPrice: 590, totalAmount: 590, status: 'CONFIRMED' } });
    const order = await groupBuyingService.joinDeal({ dealId: 'seed-2', quantity: 1, paymentMethod: 'UPI' });
    expect(mockPost).toHaveBeenCalledWith('/group-buying/deals/seed-2/join', expect.any(Object));
    expect(order.unitPrice).toBe(590);
  });
});

// ── createDemand ──────────────────────────────────────────────────────────────

describe('groupBuyingService.createDemand', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls POST /group-buying/demand and returns mapped demand', async () => {
    const payload = {
      title: 'Organic Turmeric 1 kg',
      category: 'GROCERIES',
      expectedQuantity: 50,
      preferredPriceMin: 80,
      preferredPriceMax: 120,
    };
    const backendResponse = {
      id: 55,
      title: 'Organic Turmeric',
      category: 'GROCERIES',
      description: '',
      expectedQty: 50,
      upvotes: 1,
      interestedResidents: 1,
      status: 'OPEN',
      createdAt: '2026-10-30T12:00:00Z',
    };
    mockPost.mockResolvedValueOnce({ data: backendResponse });

    const demand = await groupBuyingService.createDemand(payload);

    expect(mockPost).toHaveBeenCalledWith('/group-buying/demand', expect.objectContaining({ title: 'Organic Turmeric 1 kg' }));
    expect(demand.id).toBe('55');
    expect(demand.category).toBe('GROCERIES');
    expect(demand.status).toBe('OPEN');
    expect(demand.hasUpvoted).toBe(true);
  });
});

// ── verifyPickupPass ──────────────────────────────────────────────────────────

describe('groupBuyingService.verifyPickupPass', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success=true on valid QR token', async () => {
    mockPost.mockResolvedValueOnce({ data: { valid: true, message: 'Pickup verified' } });
    const result = await groupBuyingService.verifyPickupPass('QR-ORD-SEED-001');
    expect(result.success).toBe(true);
    expect(result.message).toBe('Pickup verified');
  });

  it('returns success=false when API rejects with error message', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { message: 'Invalid QR code' } } });
    const result = await groupBuyingService.verifyPickupPass('INVALID-QR');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid QR code');
  });

  it('returns success=false with fallback message on network error', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    const result = await groupBuyingService.verifyPickupPass('SOME-TOKEN');
    expect(result.success).toBe(false);
    expect(typeof result.message).toBe('string');
  });
});

// ── SEED data invariants ──────────────────────────────────────────────────────

describe('SEED_DEALS invariants', () => {
  it('every deal has at least one tier', () => {
    SEED_DEALS.forEach(deal => {
      expect(deal.tiers.length).toBeGreaterThan(0);
    });
  });

  it('every deal tier has a positive price', () => {
    SEED_DEALS.forEach(deal => {
      deal.tiers.forEach(tier => {
        expect(tier.price).toBeGreaterThan(0);
      });
    });
  });

  it('currentTierPrice < mrp for all seed deals', () => {
    SEED_DEALS.forEach(deal => {
      expect(deal.currentTierPrice).toBeLessThan(deal.mrp);
    });
  });

  it('tiers are in ascending minQty order', () => {
    SEED_DEALS.forEach(deal => {
      for (let i = 1; i < deal.tiers.length; i++) {
        expect(deal.tiers[i].minQty).toBeGreaterThan(deal.tiers[i - 1].minQty);
      }
    });
  });

  it('tiers are in descending price order (higher qty = lower price)', () => {
    SEED_DEALS.forEach(deal => {
      for (let i = 1; i < deal.tiers.length; i++) {
        expect(deal.tiers[i].price).toBeLessThanOrEqual(deal.tiers[i - 1].price);
      }
    });
  });
});
