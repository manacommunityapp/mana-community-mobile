import api from './apiClient';
import {
  GroupDeal,
  GroupOrder,
  DemandPool,
  DemandRequest,
  CommunitySavings,
  DealFilterState,
  JoinDealPayload,
  CreateDemandPayload,
  VendorOffer,
  VendorOfferScoring,
  BuyingGroup,
  OrderDispute,
  VerifyPickupResponse,
  CommunityAIQueryResponse,
  BuyAgainSuggestion,
  MonthlyBasket,
  FestivalCampaign,
} from '../types/groupBuying';

export function calculateVendorScore(
  offer: Omit<VendorOffer, 'scoring'>,
  demand: { expectedQuantity?: number; expectedQty?: number; preferredPriceMin?: number; preferredPriceMax?: number }
): VendorOfferScoring {
  const price = offer.pricePerUnit || offer.offeredPrice || 500;
  const pMin = demand.preferredPriceMin || 500;
  const pMax = demand.preferredPriceMax || 600;
  const expQty = demand.expectedQuantity || demand.expectedQty || 100;
  const moq = offer.moq || offer.minimumQty || 100;

  const targetAvg = (pMin + pMax) / 2;
  const priceRatio = targetAvg / price;
  const priceScore = Math.min(100, Math.max(0, Math.round(priceRatio * 85)));

  const vendorRatingScore = Math.round(((offer.vendorRating || 4.5) / 5.0) * 100);
  const fulfillmentRateScore = Math.round(offer.fulfillmentRate || 95);
  const onTimeRateScore = Math.round(offer.onTimeRate || 95);
  const lowCancellationScore = Math.round(Math.max(0, 100 - (offer.cancellationRate || 1) * 10));
  const lowDisputeScore = Math.round(Math.max(0, 100 - (offer.disputeRate || 0.5) * 20));
  const qualityScore = Math.round(((offer.qualityScore || 4.5) / 5.0) * 100);
  const moqFeasibility = moq <= expQty ? 100 : Math.max(20, Math.round((expQty / moq) * 100));
  const moqFeasibilityScore = moqFeasibility;

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

  const scoringHighlights: string[] = [];
  if (offer.isVerified || offer.vendorVerified) scoringHighlights.push('Verified Gold Partner');
  if ((offer.fulfillmentRate || 0) >= 98) scoringHighlights.push(`${offer.fulfillmentRate}% Fulfillment Record`);
  if ((offer.onTimeRate || 0) >= 95) scoringHighlights.push(`${offer.onTimeRate}% On-Time Delivery`);
  if ((offer.cancellationRate || 0) < 1) scoringHighlights.push('Zero/Low Cancellation Risk');
  if (moq <= expQty) scoringHighlights.push(`MOQ (${moq}) already met by pooled demand`);

  return {
    priceScore,
    vendorRatingScore,
    fulfillmentRateScore,
    onTimeRateScore,
    lowCancellationScore,
    lowDisputeScore,
    qualityScore,
    moqFeasibilityScore,
    compositeScore,
    isBestValue: false,
    scoringHighlights,
  };
}

export function rankVendorOffers(
  offers: Omit<VendorOffer, 'scoring'>[],
  demand: { expectedQuantity?: number; expectedQty?: number; preferredPriceMin?: number; preferredPriceMax?: number }
): VendorOffer[] {
  const scoredOffers: VendorOffer[] = offers.map(o => {
    const scoring = calculateVendorScore(o, demand);
    return {
      ...o,
      pricePerUnit: o.pricePerUnit || o.offeredPrice || 500,
      offeredPrice: o.offeredPrice || o.pricePerUnit || 500,
      moq: o.moq || o.minimumQty || 100,
      minimumQty: o.minimumQty || o.moq || 100,
      scoring,
    };
  });

  let bestIdx = 0;
  let maxScore = -1;
  scoredOffers.forEach((o, idx) => {
    if (o.scoring && o.scoring.compositeScore > maxScore) {
      maxScore = o.scoring.compositeScore;
      bestIdx = idx;
    }
  });

  if (scoredOffers[bestIdx] && scoredOffers[bestIdx].scoring) {
    scoredOffers[bestIdx].scoring!.isBestValue = true;
    scoredOffers[bestIdx].isBestValue = true;
  }

  return scoredOffers.sort((a, b) => (b.scoring?.compositeScore ?? 0) - (a.scoring?.compositeScore ?? 0));
}

let DEMAND_POOLS: DemandPool[] = [
  {
    id: 'demand-rice-01',
    title: 'Premium Aged Basmati Rice (5kg)',
    productName: 'Premium Aged Basmati Rice (5kg)',
    category: 'GROCERIES',
    description: 'Bulk community procurement for festival and monthly staple needs.',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    interestedResidents: 86,
    expectedQty: 143,
    expectedQuantity: 143,
    targetQuantity: 150,
    targetUpvotes: 50,
    upvotes: 86,
    hasUpvoted: true,
    preferredPriceMin: 500,
    preferredPriceMax: 560,
    preferredBrand: 'India Gate / Daawat',
    preferredBrands: ['India Gate', 'Daawat', 'Fortune'],
    suggestedBy: 'Priya Sharma (Tower A - 402)',
    suggestedAt: '2026-10-02T10:00:00Z',
    status: 'VENDOR_OFFERED',
    vendorOffers: rankVendorOffers(
      [
        {
          id: 'offer-a',
          demandId: 'demand-rice-01',
          vendorId: 'vendor-a',
          vendorName: 'Heritage Grains & Pulses',
          vendorRating: 4.8,
          isVerified: true,
          vendorVerified: true,
          pricePerUnit: 580,
          offeredPrice: 580,
          moq: 100,
          minimumQty: 100,
          estimatedDeliveryDays: 2,
          deliveryDate: '2026-10-10',
          notes: 'India Gate Feast Basmati 5kg pack with batch test certificates.',
          terms: 'India Gate Feast Basmati 5kg pack with batch test certificates.',
          createdAt: '2026-10-03T11:00:00Z',
          status: 'PENDING',
          fulfillmentRate: 99.4,
          onTimeRate: 98.5,
          cancellationRate: 0.2,
          disputeRate: 0.1,
          qualityScore: 4.9,
        },
        {
          id: 'offer-b',
          demandId: 'demand-rice-01',
          vendorId: 'vendor-b',
          vendorName: 'DirectAgro Direct Wholesaler',
          vendorRating: 4.6,
          isVerified: true,
          vendorVerified: true,
          pricePerUnit: 550,
          offeredPrice: 550,
          moq: 150,
          minimumQty: 150,
          estimatedDeliveryDays: 3,
          deliveryDate: '2026-10-11',
          notes: 'Daawat Rozana Super Gold 5kg. Best value offer for community batch.',
          terms: 'Daawat Rozana Super Gold 5kg. Best value offer for community batch.',
          createdAt: '2026-10-03T14:30:00Z',
          status: 'PENDING',
          fulfillmentRate: 99.2,
          onTimeRate: 97.8,
          cancellationRate: 0.6,
          disputeRate: 0.3,
          qualityScore: 4.8,
        },
        {
          id: 'offer-c',
          demandId: 'demand-rice-01',
          vendorId: 'vendor-c',
          vendorName: 'BazaarMart Bulk Hub',
          vendorRating: 3.9,
          isVerified: false,
          vendorVerified: false,
          pricePerUnit: 535,
          offeredPrice: 535,
          moq: 200,
          minimumQty: 200,
          estimatedDeliveryDays: 5,
          deliveryDate: '2026-10-14',
          notes: 'Lowest raw price. High MOQ required (200 units).',
          terms: 'Lowest raw price. High MOQ required (200 units).',
          createdAt: '2026-10-04T09:00:00Z',
          status: 'PENDING',
          fulfillmentRate: 91.0,
          onTimeRate: 88.0,
          cancellationRate: 4.5,
          disputeRate: 2.8,
          qualityScore: 3.9,
        },
      ],
      { expectedQuantity: 143, preferredPriceMin: 500, preferredPriceMax: 560 }
    ),
  },
  {
    id: 'demand-oil-02',
    title: 'Cold Pressed Wood Pressed Mustard Oil (5L)',
    productName: 'Cold Pressed Wood Pressed Mustard Oil (5L)',
    category: 'GROCERIES',
    description: 'Direct-from-farm organic kachi ghani oil.',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    interestedResidents: 42,
    expectedQty: 65,
    expectedQuantity: 65,
    targetQuantity: 80,
    targetUpvotes: 40,
    upvotes: 42,
    hasUpvoted: false,
    preferredPriceMin: 700,
    preferredPriceMax: 800,
    preferredBrand: 'Organic Tattva',
    preferredBrands: ['Organic Tattva', 'FarmPure', 'Two Brothers'],
    suggestedBy: 'Amit Verma (Tower C - 901)',
    suggestedAt: '2026-10-04T12:00:00Z',
    status: 'OPEN',
    vendorOffers: [],
  },
];

let MOCK_DEALS: GroupDeal[] = [
  {
    id: 'deal-mango-01',
    title: 'Fresh Devgad Alphonso Mangoes (Grade A - 1 Dozen)',
    description: 'Naturally ripened, chemical-free Alphonso mangoes directly sourced from GI-tagged orchards in Devgad, Maharashtra.',
    category: 'FRUITS_VEGETABLES',
    subCategory: 'Seasonal Fruits',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    productName: 'Devgad Alphonso Mangoes (1 Dozen)',
    unit: 'Dozen',
    originalPrice: 1200,
    mrp: 1200,
    standardPrice: 1200,
    currentTierPrice: 850,
    currentPrice: 850,
    lowestPrice: 700,
    targetQuantity: 100,
    targetQty: 100,
    currentQuantity: 82,
    committedQty: 82,
    minCommitmentQty: 1,
    maxCommitmentQty: 5,
    joinedCount: 46,
    currentParticipants: 46,
    savingsSoFar: 28700,
    status: 'ACTIVE',
    startDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-08T23:59:59Z',
    deliveryDate: '2026-10-10T11:00:00Z',
    pickupLocation: 'Clubhouse Ground Floor & Tower Lobby B',
    pickupPoint: 'Clubhouse Ground Floor & Tower Lobby B',
    pickupDate: '2026-10-10',
    pickupSlots: ['Morning (9 AM - 12 PM)', 'Evening (4 PM - 7 PM)'],
    vendorName: 'Konkan Fresh Farms & Agro Direct',
    vendor: 'Konkan Fresh Farms & Agro Direct',
    vendorRating: 4.8,
    vendorVerified: true,
    vendorId: 'vendor-konkan-01',
    pricingModel: 'THRESHOLD',
    paymentType: 'ONLINE_ONLY',
    fulfillmentType: 'GATE_PICKUP',
    inventoryRemaining: 18,
    moqLabel: 'Min 25 Dozen for Tier 1',
    nextTierUnitsNeeded: 18,
    daysLeft: 3,
    nextTierPrice: 700,
    dealEndsAt: '2026-10-08T23:59:59Z',
    isTrending: true,
    isFestivalDeal: true,
    isEndingSoon: false,
    tiers: [
      { id: 't1', minQuantity: 25, minQty: 25, discountPercent: 15, pricePerUnit: 1020, price: 1020, description: 'Starter Community Tier', label: '25+ units', status: 'UNLOCKED' },
      { id: 't2', minQuantity: 50, minQty: 50, discountPercent: 29, pricePerUnit: 850, price: 850, description: 'Silver Community Tier (Active)', label: '50+ units', status: 'UNLOCKED' },
      { id: 't3', minQuantity: 100, minQty: 100, discountPercent: 41, pricePerUnit: 700, price: 700, description: 'Mega Gold Tier (Save ₹500/doz)', label: '100+ units', status: 'NEXT' },
    ],
    priceTiers: [
      { id: 't1', minQuantity: 25, minQty: 25, discountPercent: 15, pricePerUnit: 1020, price: 1020, description: 'Starter Community Tier', label: '25+ units', status: 'UNLOCKED' },
      { id: 't2', minQuantity: 50, minQty: 50, discountPercent: 29, pricePerUnit: 850, price: 850, description: 'Silver Community Tier (Active)', label: '50+ units', status: 'UNLOCKED' },
      { id: 't3', minQuantity: 100, minQty: 100, discountPercent: 41, pricePerUnit: 700, price: 700, description: 'Mega Gold Tier (Save ₹500/doz)', label: '100+ units', status: 'NEXT' },
    ],
    highlights: ['GI Certified Devgad Origin', '100% Carbide Free', 'Direct Farm-to-Gate Dispatch'],
    termsAndConditions: ['Quality inspection on delivery', 'Replacement guarantee within 24h'],
  },
];

let MOCK_ORDERS: GroupOrder[] = [
  {
    id: 'ord-mango-8821',
    dealId: 'deal-mango-01',
    dealTitle: 'Fresh Devgad Alphonso Mangoes (Grade A - 1 Dozen)',
    title: 'Fresh Devgad Alphonso Mangoes (Grade A - 1 Dozen)',
    productName: 'Devgad Alphonso Mangoes (1 Dozen)',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    quantity: 2,
    qty: 2,
    unit: 'Dozen',
    committedPrice: 850,
    unitPrice: 850,
    finalPrice: 850,
    totalCommittedAmount: 1700,
    total: 1700,
    finalAmount: 1700,
    savings: 700,
    status: 'CONFIRMED',
    joinedAt: '2026-10-03T14:20:00Z',
    createdAt: '2026-10-03T14:20:00Z',
    pickupLocation: 'Clubhouse Ground Floor',
    pickupPoint: 'Clubhouse Ground Floor',
    pickupOtp: '8492',
    pickupQrCode: 'MANA-ORDER-8821-DEVGAD',
    qrCode: 'MANA-ORDER-8821-DEVGAD',
    pickupDate: '2026-10-10',
    pickupSlot: 'Morning (9 AM - 12 PM)',
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    authorizedCollectors: [
      {
        id: 'col-1',
        name: 'Ramesh (House Helper)',
        relationship: 'Helper',
        authPin: '8492',
        expiresAt: '2026-10-10T18:00:00Z',
      },
    ],
  },
];

let MOCK_GROUPS: BuyingGroup[] = [
  { id: 'bg-1', name: 'Tower A Collective', tower: 'Tower A', block: 'Tower A', isMember: true, description: 'Bulk buying group for Tower A residents', totalSaved: 62450, totalSavings: 62450, leaderName: 'Priya Sharma', leaderFlat: 'A-402', memberCount: 142, activeDealsCount: 12 },
  { id: 'bg-2', name: 'Tower B Bulk Buyers', tower: 'Tower B', block: 'Tower B', isMember: false, description: 'Bulk buying group for Tower B residents', totalSaved: 58200, totalSavings: 58200, leaderName: 'Rahul Mehta', leaderFlat: 'B-604', memberCount: 128, activeDealsCount: 10 },
  { id: 'bg-3', name: 'Tower C Eco Club', tower: 'Tower C', block: 'Tower C', isMember: false, description: 'Organic essentials for Tower C', totalSaved: 42870, totalSavings: 42870, leaderName: 'Amit Verma', leaderFlat: 'C-901', memberCount: 95, activeDealsCount: 8 },
];

let MOCK_BASKETS: MonthlyBasket[] = [
  {
    id: 'mb-1',
    name: 'Essential Monthly Grocery Kit',
    tagline: 'Atta, Rice, Oil, Pulses & Spices for a family of 4',
    month: 'October 2026',
    items: [
      { id: 'i1', name: 'Aashirvaad Atta 10kg', quantity: 1, unit: 'Bag', estimatedPrice: 680, savedAmount: 95, groupPrice: 585 },
      { id: 'i2', name: 'Fortune Sunflower Oil 5L', quantity: 1, unit: 'Jar', estimatedPrice: 750, savedAmount: 110, groupPrice: 640 },
    ],
    totalEstimated: 1430,
    totalSavings: 205,
    isRecurring: true,
    savingsPct: 14.3,
    groupPrice: 1225,
    mrpTotal: 1430,
    savings: 205,
    committedFamilies: 78,
    targetFamilies: 100,
    cutoffDate: '2026-10-07',
    nextDeliveryDate: '2026-10-10',
  },
];

let MOCK_BUY_AGAIN: BuyAgainSuggestion[] = [
  {
    id: 'ba-1',
    productName: 'Fresh Devgad Alphonso Mangoes (1 Dozen)',
    category: 'Fruits & Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    lastPurchasedPrice: 850,
    lastPrice: 850,
    currentPrice: 850,
    currentDealPrice: 850,
    lastBoughtDaysAgo: 14,
    activeGroupBuyAvailable: true,
    groupBuyPrice: 850,
    unit: 'Dozen',
    lastOrderedDate: '2026-10-03',
    dealId: 'deal-mango-01',
    savings: 350,
  },
];

export const groupBuyingService = {
  getDeals: async (filters?: any): Promise<GroupDeal[]> => {
    try {
      const res = await api.get<any[]>('/commerce/products', { params: { channel: 'GROUP_BUYING' } });
      if (res.data && res.data.length > 0) {
        return res.data.map(p => ({
          id: p.sku || String(p.id),
          title: p.title,
          description: p.description || '',
          category: p.category || 'GROCERIES',
          subCategory: p.category,
          imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
          productName: p.title,
          unit: 'Unit',
          originalPrice: p.mrp || p.price * 1.2,
          mrp: p.mrp || p.price * 1.2,
          standardPrice: p.mrp || p.price * 1.2,
          currentTierPrice: p.price,
          currentPrice: p.price,
          lowestPrice: p.price * 0.9,
          targetQuantity: 100,
          targetQty: 100,
          currentQuantity: 50,
          committedQty: 50,
          minCommitmentQty: 1,
          maxCommitmentQty: 10,
          joinedCount: 25,
          currentParticipants: 25,
          savingsSoFar: 5000,
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          deliveryDate: new Date(Date.now() + 9 * 86400000).toISOString(),
          pickupLocation: 'Clubhouse Gate 2 Hub',
          pickupPoint: 'Clubhouse Gate 2 Hub',
          pickupDate: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
          pickupSlots: ['Morning (9 AM - 12 PM)', 'Evening (4 PM - 7 PM)'],
          vendorName: p.vendorName || 'Community Partner',
          vendor: p.vendorName || 'Community Partner',
          vendorRating: 4.8,
          vendorVerified: true,
          vendorId: p.vendorId || 'vendor-1',
          pricingModel: 'THRESHOLD',
          paymentType: 'ONLINE_ONLY',
          fulfillmentType: 'GATE_PICKUP',
          inventoryRemaining: 50,
          moqLabel: 'Min 25 units for Tier 1',
          nextTierUnitsNeeded: 25,
          daysLeft: 7,
          nextTierPrice: Math.round(p.price * 0.95),
          dealEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          isTrending: true,
          isFestivalDeal: false,
          isEndingSoon: false,
          tiers: [
            { id: 't1', minQuantity: 25, minQty: 25, discountPercent: 10, pricePerUnit: p.price, price: p.price, description: 'Base Tier', label: '25+ units', status: 'UNLOCKED' },
            { id: 't2', minQuantity: 50, minQty: 50, discountPercent: 20, pricePerUnit: Math.round(p.price * 0.95), price: Math.round(p.price * 0.95), description: 'Bulk Tier', label: '50+ units', status: 'NEXT' }
          ],
          priceTiers: [
            { id: 't1', minQuantity: 25, minQty: 25, discountPercent: 10, pricePerUnit: p.price, price: p.price, description: 'Base Tier', label: '25+ units', status: 'UNLOCKED' },
            { id: 't2', minQuantity: 50, minQty: 50, discountPercent: 20, pricePerUnit: Math.round(p.price * 0.95), price: Math.round(p.price * 0.95), description: 'Bulk Tier', label: '50+ units', status: 'NEXT' }
          ],
          highlights: ['Direct Farm / Producer Sourcing', 'Verified Community Batch', 'Quality Assured'],
          termsAndConditions: ['Community pickup at designated hub slot']
        }));
      }
    } catch {
      // fallback to mock
    }
    let result = [...MOCK_DEALS];
    if (filters && typeof filters === 'object') {
      if (filters.category && filters.category !== 'ALL') {
        result = result.filter(d => d.category === filters.category);
      }
      if (filters.status && filters.status !== 'ALL') {
        result = result.filter(d => d.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(d => d.title.toLowerCase().includes(q) || d.productName.toLowerCase().includes(q));
      }
    }
    return result;
  },

  getFestivalCategories: async (): Promise<string[]> => {
    return ['All', 'Diwali Sweets & Snacks', 'Puja Essentials', 'Dry Fruits Gift Boxes', 'Ethnic Grocery'];
  },

  getFestivalDeals: async (): Promise<GroupDeal[]> => {
    return MOCK_DEALS;
  },

  getAlmostUnlockedDeals: async (): Promise<GroupDeal[]> => {
    return MOCK_DEALS;
  },

  getDealById: async (dealId: string): Promise<GroupDeal | null> => {
    return MOCK_DEALS.find(d => d.id === dealId) || null;
  },

  joinDeal: async (arg1: any, arg2?: any, arg3?: any): Promise<GroupOrder> => {
    const payload: JoinDealPayload = typeof arg1 === 'string'
      ? { dealId: arg1, quantity: arg2 || 1, paymentMethod: arg3 || 'UPI' }
      : arg1;
    const deal = MOCK_DEALS.find(d => d.id === payload.dealId);
    if (!deal) throw new Error('Deal not found');

    const newOrder: GroupOrder = {
      id: `ord-${Date.now()}`,
      dealId: deal.id,
      dealTitle: deal.title,
      title: deal.title,
      productName: deal.productName,
      imageUrl: deal.imageUrl,
      quantity: payload.quantity,
      qty: payload.quantity,
      unit: deal.unit,
      committedPrice: deal.currentPrice,
      unitPrice: deal.currentPrice,
      totalCommittedAmount: deal.currentPrice * payload.quantity,
      total: deal.currentPrice * payload.quantity,
      savings: (deal.originalPrice - deal.currentPrice) * payload.quantity,
      status: 'CONFIRMED',
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      pickupLocation: deal.pickupLocation,
      pickupPoint: deal.pickupLocation,
      pickupOtp: Math.floor(1000 + Math.random() * 9000).toString(),
      pickupQrCode: `MANA-ORDER-${deal.id}-${Date.now()}`,
      qrCode: `MANA-ORDER-${deal.id}-${Date.now()}`,
      pickupDate: deal.deliveryDate,
      pickupSlot: payload.deliverySlot || 'Morning (9 AM - 12 PM)',
      deliverySlot: payload.deliverySlot,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'PAID',
    };

    deal.currentQuantity += payload.quantity;
    deal.committedQty += payload.quantity;
    deal.joinedCount += 1;
    deal.savingsSoFar += (deal.originalPrice - deal.currentPrice) * payload.quantity;
    MOCK_ORDERS.unshift(newOrder);
    return newOrder;
  },

  checkoutGroupBuy: async (arg1: any, arg2?: any, arg3?: any): Promise<GroupOrder> => {
    return groupBuyingService.joinDeal(arg1, arg2, arg3);
  },

  getUserOrders: async (): Promise<GroupOrder[]> => {
    try {
      const res = await api.get<any[]>('/commerce/orders/my');
      if (res.data && res.data.length > 0) {
        return res.data.filter(o => o.channel === 'GROUP_BUYING').map(o => ({
          id: o.orderNumber,
          dealId: String(o.id),
          dealTitle: o.items?.[0]?.title || 'Group Buy Item',
          title: o.items?.[0]?.title || 'Group Buy Item',
          productName: o.items?.[0]?.title || 'Group Buy Item',
          imageUrl: o.items?.[0]?.imageUrl || o.items?.[0]?.thumbnailUrl || 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
          quantity: o.items?.[0]?.quantity || 1,
          qty: o.items?.[0]?.quantity || 1,
          unit: 'Unit',
          committedPrice: o.subtotalAmount || 850,
          unitPrice: o.items?.[0]?.unitPrice || 850,
          finalPrice: o.totalAmount || 850,
          totalCommittedAmount: o.totalAmount || 850,
          total: o.totalAmount || 850,
          finalAmount: o.totalAmount || 850,
          savings: o.discountAmount || 0,
          status: o.status,
          joinedAt: o.createdAt,
          createdAt: o.createdAt,
          pickupLocation: o.deliveryAddress || 'Clubhouse Gate 2 Hub',
          pickupPoint: o.deliveryAddress || 'Clubhouse Gate 2 Hub',
          pickupOtp: o.handoverOtp || '8421',
          pickupQrCode: o.qrToken || `QR-${o.orderNumber}`,
          qrCode: o.qrToken || `QR-${o.orderNumber}`,
          pickupDate: o.pickupSlot || '2026-10-10',
          pickupSlot: o.pickupSlot || 'Morning (9 AM - 12 PM)',
          paymentMethod: o.paymentMethod || 'UPI',
          paymentStatus: 'PAID',
        }));
      }
    } catch {
      // fallback
    }
    return MOCK_ORDERS;
  },

  getMyOrders: async (): Promise<GroupOrder[]> => {
    return groupBuyingService.getUserOrders();
  },

  getOrderById: async (orderId: string): Promise<GroupOrder | null> => {
    return MOCK_ORDERS.find(o => o.id === orderId) || null;
  },

  verifyPickupPass: async (qrOrOtp: string): Promise<VerifyPickupResponse> => {
    const order = MOCK_ORDERS.find(o => o.pickupOtp === qrOrOtp || o.pickupQrCode === qrOrOtp || o.qrCode === qrOrOtp || o.id === qrOrOtp);
    if (order) {
      order.status = 'DELIVERED';
      order.deliveredAt = new Date().toISOString();
      return { success: true, order, message: 'Pickup verified successfully' };
    }
    return { success: false, message: 'Invalid OTP or QR code' };
  },

  raiseOrderDispute: async (payload: any): Promise<OrderDispute> => {
    return {
      id: `disp-${Date.now()}`,
      orderId: payload.orderId || 'ord-test',
      reason: payload.reason || 'DAMAGED_ITEMS',
      claimAmount: payload.claimAmount || 100,
      description: payload.description || '',
      requestedResolution: payload.requestedResolution || 'REFUND',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };
  },

  submitOrderReview: async (payload: any): Promise<any> => {
    return { success: true, reviewId: `rev-${Date.now()}` };
  },

  getBuyingGroups: async (): Promise<BuyingGroup[]> => {
    return MOCK_GROUPS;
  },

  joinBuyingGroup: async (groupId: string): Promise<BuyingGroup> => {
    const grp = MOCK_GROUPS.find(g => g.id === groupId);
    if (!grp) throw new Error('Buying group not found');
    if (grp.membersCount != null) grp.membersCount += 1;
    if (grp.memberCount != null) grp.memberCount += 1;
    grp.isMember = true;
    return grp;
  },

  getFestivalCampaigns: async (): Promise<FestivalCampaign[]> => {
    return [
      {
        id: 'fest-diwali',
        name: 'Diwali Dhamaka',
        tagline: 'Save up to 40% on Dry Fruits, Sweets & Puja essentials',
        bannerImage: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=500',
        festivalDate: '2026-11-01',
        daysRemaining: 27,
        categories: [
          { id: 'DIWALI', name: 'Diwali Specials', emoji: '🪔', dealsCount: 12 },
          { id: 'SWEETS', name: 'Mithai & Sweets', emoji: '🍬', dealsCount: 8 },
          { id: 'DRY_FRUITS', name: 'Premium Dry Fruits', emoji: '🥜', dealsCount: 15 },
          { id: 'PUJA', name: 'Puja Samagri', emoji: '🌸', dealsCount: 6 },
        ],
      },
    ];
  },
  getMonthlyBaskets: async (): Promise<MonthlyBasket[]> => {
    return MOCK_BASKETS;
  },

  joinBasket: async (basketId: string): Promise<any> => {
    const b = MOCK_BASKETS.find(x => x.id === basketId);
    if (b) b.committedFamilies += 1;
    return { success: true };
  },

  getBuyAgainSuggestions: async (): Promise<BuyAgainSuggestion[]> => {
    return MOCK_BUY_AGAIN;
  },

  askCommunityAI: async (query: string): Promise<CommunityAIQueryResponse> => {
    const q = query.toLowerCase();
    const matchedDeals = MOCK_DEALS.filter(d => d.title.toLowerCase().includes(q) || d.productName.toLowerCase().includes(q));
    const matchedDemands = DEMAND_POOLS.filter(d => d.title.toLowerCase().includes(q) || (d.productName && d.productName.toLowerCase().includes(q)));
    return {
      answer: `I found ${matchedDeals.length} deals and ${matchedDemands.length} community demand requests matching "${query}".`,
      action: matchedDeals.length > 0 ? 'JOIN_DEAL' : (matchedDemands.length > 0 ? 'UPVOTE_DEMAND' : 'CREATE_DEMAND'),
      matchedDeals,
      matchedDemands,
      confidence: 0.95,
    };
  },

  getDemands: async (): Promise<DemandPool[]> => {
    return DEMAND_POOLS;
  },

  getDemandBoard: async (): Promise<DemandPool[]> => {
    return DEMAND_POOLS;
  },

  getDemandById: async (demandId: string): Promise<DemandPool | null> => {
    return DEMAND_POOLS.find(d => d.id === demandId) || null;
  },

  createDemand: async (payload: CreateDemandPayload): Promise<DemandPool> => {
    const title = payload.productName || payload.title || 'Community Request';
    const newDemand: DemandPool = {
      id: `demand-${Date.now()}`,
      title,
      productName: title,
      category: payload.category,
      description: payload.description || '',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
      interestedResidents: 1,
      expectedQty: payload.expectedQuantity || payload.expectedQty || 1,
      expectedQuantity: payload.expectedQuantity || payload.expectedQty || 1,
      targetQuantity: 50,
      targetUpvotes: 25,
      upvotes: 1,
      hasUpvoted: true,
      preferredPriceMin: payload.preferredPriceMin || 100,
      preferredPriceMax: payload.preferredPriceMax || 200,
      preferredBrand: payload.preferredBrand || (payload.preferredBrands ? payload.preferredBrands[0] : undefined),
      preferredBrands: payload.preferredBrands || (payload.preferredBrand ? [payload.preferredBrand] : []),
      suggestedBy: 'You (Tower B - 604)',
      suggestedAt: new Date().toISOString(),
      status: 'OPEN',
      vendorOffers: [],
    };
    DEMAND_POOLS.unshift(newDemand);
    return newDemand;
  },

  upvoteDemand: async (demandId: string): Promise<DemandPool> => {
    const pool = DEMAND_POOLS.find(d => d.id === demandId);
    if (!pool) throw new Error('Demand pool not found');
    if (pool.hasUpvoted) {
      pool.upvotes -= 1;
      pool.interestedResidents -= 1;
      pool.hasUpvoted = false;
    } else {
      pool.upvotes += 1;
      pool.interestedResidents += 1;
      pool.hasUpvoted = true;
    }
    return pool;
  },

  acceptVendorOffer: async (demandId: string, offerId: string): Promise<GroupDeal> => {
    const pool = DEMAND_POOLS.find(d => d.id === demandId);
    if (!pool) throw new Error('Demand pool not found');
    const offer = pool.vendorOffers.find(o => o.id === offerId);
    if (!offer) throw new Error('Vendor offer not found');

    offer.status = 'ACCEPTED';
    pool.status = 'APPROVED';

    const pMax = pool.preferredPriceMax || (offer.pricePerUnit * 1.2);
    const expQty = pool.expectedQuantity || pool.expectedQty || 50;

    const newDeal: GroupDeal = {
      id: `deal-from-demand-${Date.now()}`,
      title: `Bulk ${pool.title || pool.productName} by ${offer.vendorName}`,
      description: pool.description || '',
      category: pool.category,
      imageUrl: pool.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
      productName: pool.productName || pool.title || '',
      unit: 'Pack',
      originalPrice: pMax * 1.2,
      mrp: pMax * 1.2,
      standardPrice: pMax * 1.2,
      currentTierPrice: offer.pricePerUnit || offer.offeredPrice || 500,
      currentPrice: offer.pricePerUnit || offer.offeredPrice || 500,
      lowestPrice: (offer.pricePerUnit || offer.offeredPrice || 500) * 0.9,
      targetQuantity: offer.moq || offer.minimumQty || 100,
      targetQty: offer.moq || offer.minimumQty || 100,
      currentQuantity: expQty,
      committedQty: expQty,
      minCommitmentQty: 1,
      maxCommitmentQty: 10,
      joinedCount: pool.interestedResidents,
      savingsSoFar: (pMax * 1.2 - (offer.pricePerUnit || offer.offeredPrice || 500)) * expQty,
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      pickupLocation: 'Clubhouse Entrance & Lobby Delivery Hub',
      pickupPoint: 'Clubhouse Entrance & Lobby Delivery Hub',
      vendorName: offer.vendorName,
      vendor: offer.vendorName,
      vendorRating: offer.vendorRating,
      vendorVerified: true,
      vendorId: offer.vendorId,
      pricingModel: 'THRESHOLD',
      nextTierUnitsNeeded: 10,
      daysLeft: 5,
      nextTierPrice: Math.round((offer.pricePerUnit || 500) * 0.95),
      dealEndsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      tiers: [
        { id: 'dt1', minQuantity: Math.round((offer.moq || 100) * 0.5), minQty: Math.round((offer.moq || 100) * 0.5), discountPercent: 15, pricePerUnit: offer.pricePerUnit || 500, price: offer.pricePerUnit || 500, description: 'Base Tier', label: 'Base Tier', status: 'UNLOCKED' },
        { id: 'dt2', minQuantity: offer.moq || 100, minQty: offer.moq || 100, discountPercent: 25, pricePerUnit: Math.round((offer.pricePerUnit || 500) * 0.95), price: Math.round((offer.pricePerUnit || 500) * 0.95), description: 'Bulk MOQ Tier', label: 'Bulk MOQ Tier', status: 'NEXT' },
      ],
      priceTiers: [
        { id: 'dt1', minQuantity: Math.round((offer.moq || 100) * 0.5), minQty: Math.round((offer.moq || 100) * 0.5), discountPercent: 15, pricePerUnit: offer.pricePerUnit || 500, price: offer.pricePerUnit || 500, description: 'Base Tier', label: 'Base Tier', status: 'UNLOCKED' },
        { id: 'dt2', minQuantity: offer.moq || 100, minQty: offer.moq || 100, discountPercent: 25, pricePerUnit: Math.round((offer.pricePerUnit || 500) * 0.95), price: Math.round((offer.pricePerUnit || 500) * 0.95), description: 'Bulk MOQ Tier', label: 'Bulk MOQ Tier', status: 'NEXT' },
      ],
      highlights: ['Formed from Community Demand Board', 'Direct Vendor Best Value Selection', 'Guaranteed Quality Assurance'],
      termsAndConditions: ['Community pickup required within 24 hours of delivery'],
    };

    pool.dealId = newDeal.id;
    MOCK_DEALS.unshift(newDeal);
    return newDeal;
  },

  getCommunitySavings: async (): Promise<CommunitySavings> => {
    return {
      totalSavedAllTime: 1840000,
      totalOrdersAllTime: 12480,
      activeParticipants: 412,
      thisMonthSaved: 184520,
      totalSavedThisMonth: 184520,
      totalOrders: 1248,
      activeDeals: 38,
      avgSavingPerOrder: 147,
      totalKgsBought: 2450,
      monthlyBuyingPower: {
        totalSaved: 184520,
        totalOrders: 1248,
        activeDeals: 38,
        totalKgBought: 2450,
        avgSavingPerOrder: 147,
        topSavingCategory: 'Groceries & Farm Produce',
        collectiveDiscountPercent: 23.8,
        heroMilestoneText: 'Your community saved ₹18.4 lakh through collective purchasing this year.',
      },
      topDealsThisMonth: [
        { dealTitle: 'Devgad Alphonso Mangoes (1 Dozen)', savings: 68400, participants: 84 },
        { dealTitle: 'Premium Aged Basmati Rice (5kg)', savings: 45200, participants: 86 },
        { dealTitle: 'A2 Vedic Bilona Cow Ghee (1L)', savings: 36800, participants: 52 },
        { dealTitle: 'Wood Pressed Mustard Oil (5L)', savings: 34120, participants: 65 },
      ],
      towerLeaderboard: [
        { tower: 'Tower A', orders: 412, totalSaved: 62450 },
        { tower: 'Tower B', orders: 386, totalSaved: 58200 },
        { tower: 'Tower C', orders: 298, totalSaved: 42870 },
        { tower: 'Tower D', orders: 152, totalSaved: 21000 },
      ],
    };
  },
};
