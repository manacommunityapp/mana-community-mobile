import api from './apiClient';
import {
  GroupDeal,
  GroupOrder,
  DemandPool,
  CommunitySavings,
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

function mapBackendDealToGroupDeal(deal: any): GroupDeal {
  const tiers = (deal.priceTiers || []).map((t: any) => ({
    id: t.id ? String(t.id) : undefined,
    minQuantity: t.minQty || t.minQuantity || 1,
    minQty: t.minQty || t.minQuantity || 1,
    maxQty: t.maxQty,
    discountPercent: t.discountPercent || 0,
    pricePerUnit: t.price || t.pricePerUnit || 0,
    price: t.price || t.pricePerUnit || 0,
    description: t.label || t.description || '',
    label: t.label || `${t.minQty || 1}+ units`,
    status: t.isCurrentTier ? 'UNLOCKED' : (t.isNextTier ? 'NEXT' : 'LOCKED'),
    isCurrentTier: t.isCurrentTier,
    isNextTier: t.isNextTier,
    unitsToUnlock: t.unitsToUnlock,
    savingsVsMrp: t.savingsVsMrp,
  }));

  return {
    id: String(deal.id),
    title: deal.title,
    description: deal.description || '',
    category: deal.category || 'GROCERIES',
    subCategory: deal.subCategory,
    imageUrl: deal.imageUrl || 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    productName: deal.title,
    unit: 'Unit',
    originalPrice: deal.mrp || deal.standardPrice || 0,
    mrp: deal.mrp || deal.standardPrice || 0,
    standardPrice: deal.standardPrice || deal.mrp || 0,
    currentTierPrice: deal.currentTierPrice || deal.currentPrice || 0,
    currentPrice: deal.currentPrice || deal.currentTierPrice || 0,
    lowestPrice: deal.nextTierPrice || deal.currentPrice || 0,
    targetQuantity: deal.targetQty || 100,
    targetQty: deal.targetQty || 100,
    currentQuantity: deal.committedQty || 0,
    committedQty: deal.committedQty || 0,
    minCommitmentQty: 1,
    maxCommitmentQty: 10,
    joinedCount: deal.currentParticipants || 0,
    currentParticipants: deal.currentParticipants || 0,
    targetParticipants: deal.targetParticipants || 100,
    savingsSoFar: Math.max(0, ((deal.mrp || deal.standardPrice || 0) - (deal.currentTierPrice || deal.currentPrice || 0)) * (deal.committedQty || 0)),
    status: deal.dealStatus || 'ACTIVE',
    dealStatus: deal.dealStatus || 'OPEN',
    startDate: deal.createdAt || new Date().toISOString(),
    endDate: deal.dealEndsAt || new Date().toISOString(),
    deliveryDate: deal.pickupDate || new Date().toISOString(),
    pickupLocation: deal.pickupPoint || 'Clubhouse Desk',
    pickupPoint: deal.pickupPoint || 'Clubhouse Desk',
    pickupDate: deal.pickupDate,
    pickupSlots: deal.pickupSlots || ['Morning (9 AM - 12 PM)', 'Evening (4 PM - 7 PM)'],
    vendorName: deal.vendor || deal.vendorName || 'Community Vendor',
    vendor: deal.vendor || deal.vendorName || 'Community Vendor',
    vendorRating: deal.vendorRating || 4.8,
    vendorVerified: deal.vendorVerified ?? true,
    vendorId: deal.vendorId || 'vendor-1',
    pricingModel: deal.pricingModel || 'THRESHOLD',
    paymentType: deal.paymentType || 'ONLINE_ONLY',
    fulfillmentType: deal.fulfillmentType || 'BOTH',
    inventoryRemaining: deal.inventoryRemaining ?? 50,
    moqLabel: deal.moqLabel || `Min ${deal.targetQty || 50} units`,
    nextTierUnitsNeeded: deal.nextTierUnitsNeeded || 0,
    daysLeft: deal.daysLeft || 5,
    nextTierPrice: deal.nextTierPrice,
    dealEndsAt: deal.dealEndsAt || '',
    isTrending: deal.isTrending ?? false,
    isFestivalDeal: deal.isFestivalDeal ?? false,
    isEndingSoon: deal.isEndingSoon ?? false,
    isAlmostUnlocked: deal.isAlmostUnlocked ?? false,
    tiers,
    priceTiers: tiers,
    highlights: ['Bulk Community Price Drop Protection', 'Direct Sourced & Verified Quality', 'Full Escrow & Doorstep OTP Handover'],
    termsAndConditions: ['Doorstep delivery or Clubhouse Hub pickup', 'Automated refunds for newly unlocked tiers'],
  };
}

function mapBackendOrderToGroupOrder(o: any): GroupOrder {
  return {
    id: o.orderNumber || String(o.id),
    dealId: String(o.dealId || o.id),
    dealTitle: o.dealTitle || 'Group Buy Item',
    title: o.dealTitle || 'Group Buy Item',
    productName: o.dealTitle || 'Group Buy Item',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    quantity: o.quantity || 1,
    qty: o.quantity || 1,
    unit: 'Unit',
    committedPrice: o.unitPrice || 0,
    unitPrice: o.unitPrice || 0,
    finalPrice: o.unitPrice || 0,
    totalCommittedAmount: o.totalAmount || 0,
    total: o.totalAmount || 0,
    finalAmount: o.totalAmount || 0,
    savings: o.savingsAmount || 0,
    status: o.status || 'CONFIRMED',
    joinedAt: o.createdAt || new Date().toISOString(),
    createdAt: o.createdAt || new Date().toISOString(),
    pickupLocation: o.pickupPoint || o.deliveryAddress || 'Clubhouse Desk',
    pickupPoint: o.pickupPoint || 'Clubhouse Desk',
    pickupOtp: o.deliveryOtp || '8421',
    deliveryOtp: o.deliveryOtp,
    pickupQrCode: o.qrToken || `QR-${o.orderNumber || o.id}`,
    qrCode: o.qrToken || `QR-${o.orderNumber || o.id}`,
    qrToken: o.qrToken,
    pickupDate: o.pickupDate ? String(o.pickupDate).split('T')[0] : '2026-10-10',
    pickupSlot: 'Morning (9 AM - 12 PM)',
    deliveryAddress: o.deliveryAddress,
    deliveryPartnerName: o.deliveryPartnerName,
    deliveryPartnerPhone: o.deliveryPartnerPhone,
    trackingNumber: o.trackingNumber,
    paymentMethod: o.paymentMethod || 'UPI',
    paymentStatus: o.paymentStatus || 'PAID',
    refundAmount: o.refundAmount,
    refundReason: o.refundReason,
    tierPriceRefundAmount: o.tierPriceRefundAmount,
    authorizedCollectors: o.collectorName ? [
      {
        id: 'col-1',
        name: o.collectorName,
        relationship: o.collectorRelation || 'Authorized Resident / Helper',
        authPin: o.collectorPin || '1234',
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      }
    ] : [],
  };
}

// ── Seed catalog (used as offline/no-backend fallback) ───────────────────────

const SEED_TIERS = [
  { minQty: 1,  maxQty: 49,  price: 285, pricePerUnit: 285, discountPercent: 5,  label: '1–49 units',  status: 'UNLOCKED'  as const, isCurrentTier: true,  isNextTier: false },
  { minQty: 50, maxQty: 99,  price: 260, pricePerUnit: 260, discountPercent: 13, label: '50–99 units', status: 'NEXT'     as const, isCurrentTier: false, isNextTier: true,  unitsToUnlock: 18 },
  { minQty: 100,             price: 235, pricePerUnit: 235, discountPercent: 22, label: '100+ units',  status: 'LOCKED'   as const, isCurrentTier: false, isNextTier: false },
];

export const SEED_DEALS: GroupDeal[] = [
  {
    id: 'seed-1',
    title: 'Fresh Devgad Alphonso Mangoes',
    description: 'Premium GI-tagged Devgad Alphonso mangoes sourced directly from Konkan orchards.',
    category: 'FRUITS_VEGETABLES',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    productName: 'Alphonso Mangoes (1 Dozen)',
    unit: 'Dozen',
    originalPrice: 1200, mrp: 1200, standardPrice: 1200,
    currentTierPrice: 850, currentPrice: 850, lowestPrice: 700,
    targetQuantity: 100, targetQty: 100,
    currentQuantity: 32, committedQty: 32,
    minCommitmentQty: 1, maxCommitmentQty: 5,
    joinedCount: 32, currentParticipants: 32, targetParticipants: 100,
    savingsSoFar: 11200,
    status: 'ACTIVE', dealStatus: 'OPEN',
    startDate: '2026-10-01T00:00:00Z', endDate: '2026-11-05T23:59:59Z',
    deliveryDate: '2026-11-07T00:00:00Z', pickupDate: '2026-11-07',
    pickupLocation: 'Clubhouse Desk', pickupPoint: 'Clubhouse Desk',
    pickupSlots: ['Morning (9 AM – 12 PM)', 'Evening (4 PM – 7 PM)'],
    vendorName: 'Konkan Farms Direct', vendor: 'Konkan Farms Direct',
    vendorRating: 4.8, vendorVerified: true, vendorId: 'vnd-seed-1',
    pricingModel: 'THRESHOLD',
    tiers: SEED_TIERS, priceTiers: SEED_TIERS,
    nextTierUnitsNeeded: 18, daysLeft: 7, nextTierPrice: 260,
    isTrending: true, isAlmostUnlocked: false,
    dealEndsAt: '2026-11-05T23:59:59Z',
    highlights: ['GI-Tagged Devgad Variety', 'Direct Orchard Sourcing', 'Doorstep OTP Handover'],
    termsAndConditions: ['No cancellations after deal locks', 'Automated refunds for tier upgrades'],
    inventoryRemaining: 68, fulfillmentType: 'BOTH', paymentType: 'ONLINE_ONLY',
    moqLabel: 'Min 100 units',
  },
  {
    id: 'seed-2',
    title: 'Aashirvaad Whole Wheat Atta 10 kg',
    description: 'Community bulk purchase of Aashirvaad Atta — direct from ITC warehouse at tier pricing.',
    category: 'GROCERIES',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    productName: 'Aashirvaad Atta 10 kg Bag',
    unit: 'Bag',
    originalPrice: 680, mrp: 680, standardPrice: 680,
    currentTierPrice: 590, currentPrice: 590, lowestPrice: 545,
    targetQuantity: 200, targetQty: 200,
    currentQuantity: 127, committedQty: 127,
    minCommitmentQty: 1, maxCommitmentQty: 10,
    joinedCount: 89, currentParticipants: 89, targetParticipants: 200,
    savingsSoFar: 11430,
    status: 'ACTIVE', dealStatus: 'OPEN',
    startDate: '2026-10-01T00:00:00Z', endDate: '2026-11-03T23:59:59Z',
    deliveryDate: '2026-11-05T00:00:00Z', pickupDate: '2026-11-05',
    pickupLocation: 'Tower A Lobby', pickupPoint: 'Tower A Lobby',
    pickupSlots: ['Morning (9 AM – 12 PM)', 'Evening (4 PM – 7 PM)'],
    vendorName: 'Metro Cash & Carry', vendor: 'Metro Cash & Carry',
    vendorRating: 4.6, vendorVerified: true, vendorId: 'vnd-seed-2',
    pricingModel: 'THRESHOLD',
    tiers: [
      { minQty: 1,   maxQty: 99,  price: 590, pricePerUnit: 590, discountPercent: 13, label: '1–99 bags',   status: 'UNLOCKED' as const, isCurrentTier: true,  isNextTier: false },
      { minQty: 100, maxQty: 199, price: 565, pricePerUnit: 565, discountPercent: 17, label: '100–199 bags', status: 'NEXT'    as const, isCurrentTier: false, isNextTier: true,  unitsToUnlock: 73 },
      { minQty: 200,              price: 545, pricePerUnit: 545, discountPercent: 20, label: '200+ bags',   status: 'LOCKED'   as const, isCurrentTier: false, isNextTier: false },
    ],
    priceTiers: [
      { minQty: 1,   maxQty: 99,  price: 590, pricePerUnit: 590, discountPercent: 13, label: '1–99 bags',   status: 'UNLOCKED' as const },
      { minQty: 100, maxQty: 199, price: 565, pricePerUnit: 565, discountPercent: 17, label: '100–199 bags', status: 'NEXT'    as const },
      { minQty: 200,              price: 545, pricePerUnit: 545, discountPercent: 20, label: '200+ bags',   status: 'LOCKED'   as const },
    ],
    nextTierUnitsNeeded: 73, daysLeft: 5, nextTierPrice: 565,
    isTrending: false, isAlmostUnlocked: false,
    dealEndsAt: '2026-11-03T23:59:59Z',
    highlights: ['Warehouse-Direct Pricing', 'ITC Authorised Dealer', 'Zero Adulteration Guarantee'],
    termsAndConditions: ['Minimum 1 bag per order', 'Delivery within society premises'],
    inventoryRemaining: 150, fulfillmentType: 'BOTH', paymentType: 'ONLINE_ONLY',
    moqLabel: 'Min 200 bags',
  },
  {
    id: 'seed-3',
    title: 'Diwali Dry Fruits Premium Gift Box',
    description: 'Celebrate Diwali with premium mixed dry fruits — almonds, cashews, pistachios & figs sourced from Afghani and Californian orchards.',
    category: 'GROCERIES',
    imageUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=500',
    productName: 'Premium Dry Fruits Box 1 kg',
    unit: 'Box',
    originalPrice: 1850, mrp: 1850, standardPrice: 1850,
    currentTierPrice: 1250, currentPrice: 1250, lowestPrice: 1100,
    targetQuantity: 150, targetQty: 150,
    currentQuantity: 138, committedQty: 138,
    minCommitmentQty: 1, maxCommitmentQty: 5,
    joinedCount: 138, currentParticipants: 138, targetParticipants: 150,
    savingsSoFar: 82800,
    status: 'ACTIVE', dealStatus: 'OPEN',
    startDate: '2026-10-15T00:00:00Z', endDate: '2026-11-01T23:59:59Z',
    deliveryDate: '2026-11-02T00:00:00Z', pickupDate: '2026-11-02',
    pickupLocation: 'Clubhouse Desk', pickupPoint: 'Clubhouse Desk',
    pickupSlots: ['Morning (9 AM – 12 PM)', 'Evening (4 PM – 7 PM)'],
    vendorName: 'Diwali Dhamaka Co-op', vendor: 'Diwali Dhamaka Co-op',
    vendorRating: 4.9, vendorVerified: true, vendorId: 'vnd-seed-3',
    pricingModel: 'THRESHOLD',
    tiers: [
      { minQty: 1,   maxQty: 49,  price: 1250, pricePerUnit: 1250, discountPercent: 32, label: '1–49 boxes',  status: 'UNLOCKED' as const, isCurrentTier: true,  isNextTier: false },
      { minQty: 50,  maxQty: 149, price: 1150, pricePerUnit: 1150, discountPercent: 38, label: '50–149 boxes', status: 'NEXT'    as const, isCurrentTier: false, isNextTier: true,  unitsToUnlock: 12 },
      { minQty: 150,              price: 1100, pricePerUnit: 1100, discountPercent: 41, label: '150+ boxes',  status: 'LOCKED'   as const, isCurrentTier: false, isNextTier: false },
    ],
    priceTiers: [
      { minQty: 1,   maxQty: 49,  price: 1250, pricePerUnit: 1250, discountPercent: 32, label: '1–49 boxes',  status: 'UNLOCKED' as const },
      { minQty: 50,  maxQty: 149, price: 1150, pricePerUnit: 1150, discountPercent: 38, label: '50–149 boxes', status: 'NEXT'    as const },
      { minQty: 150,              price: 1100, pricePerUnit: 1100, discountPercent: 41, label: '150+ boxes',  status: 'LOCKED'   as const },
    ],
    nextTierUnitsNeeded: 12, daysLeft: 3, nextTierPrice: 1150,
    isTrending: true, isFestivalDeal: true, isAlmostUnlocked: true, isEndingSoon: true,
    dealEndsAt: '2026-11-01T23:59:59Z',
    highlights: ['Afghani & Californian Sourcing', 'BIS-Certified Packaging', 'Zero Preservatives'],
    termsAndConditions: ['Festival deal — no cancellations', 'Pickup compulsory for last 12 units'],
    inventoryRemaining: 12, fulfillmentType: 'PICKUP_ONLY', paymentType: 'ONLINE_ONLY',
    moqLabel: 'Min 150 boxes',
  },
];

export const SEED_DEMANDS: DemandPool[] = [
  {
    id: 'seed-dem-1',
    title: 'Organic A2 Milk — Home Delivery',
    productName: 'Organic A2 Milk (500 ml)',
    category: 'DAIRY_EGGS',
    description: 'Looking for daily subscription of certified A2 cow milk with doorstep delivery by 7 AM.',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    interestedResidents: 34,
    expectedQty: 200,
    expectedQuantity: 200,
    targetQuantity: 50,
    targetUpvotes: 50,
    upvotes: 34,
    hasUpvoted: false,
    preferredPriceMin: 25,
    preferredPriceMax: 35,
    preferredBrand: 'Pride of Cows / Country Delight',
    preferredBrands: ['Pride of Cows', 'Country Delight'],
    suggestedBy: 'Flat 402, Tower B',
    suggestedAt: '2026-10-18T09:00:00Z',
    status: 'OPEN',
    vendorOffers: [],
  },
  {
    id: 'seed-dem-2',
    title: 'Himalayan Pink Salt — Bulk Pack',
    productName: 'Himalayan Pink Salt 5 kg',
    category: 'GROCERIES',
    description: 'Community request for natural unrefined Himalayan pink salt at wholesale rates.',
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80',
    interestedResidents: 22,
    expectedQty: 110,
    expectedQuantity: 110,
    targetQuantity: 30,
    targetUpvotes: 30,
    upvotes: 22,
    hasUpvoted: false,
    preferredPriceMin: 120,
    preferredPriceMax: 180,
    suggestedBy: 'Flat 104, Tower A',
    suggestedAt: '2026-10-20T14:30:00Z',
    status: 'VENDOR_OFFERED',
    vendorOffers: [
      {
        id: 'offer-seed-1',
        demandId: 'seed-dem-2',
        vendorId: 'vnd-seed-2',
        vendorName: 'Metro Cash & Carry',
        vendorRating: 4.6,
        isVerified: true,
        vendorVerified: true,
        pricePerUnit: 145,
        offeredPrice: 145,
        moq: 50,
        minimumQty: 50,
        estimatedDeliveryDays: 3,
        deliveryDate: '2026-11-05',
        notes: 'ISO-certified packaging, no additives',
        terms: 'ISO-certified packaging, no additives',
        createdAt: '2026-10-22T10:00:00Z',
        status: 'PENDING',
        fulfillmentRate: 99.0,
        onTimeRate: 98.0,
        cancellationRate: 0.2,
        disputeRate: 0.1,
        qualityScore: 4.9,
      },
    ],
  },
];

export const SEED_ORDERS: GroupOrder[] = [
  {
    id: 'ORD-SEED-001',
    dealId: 'seed-2',
    dealTitle: 'Aashirvaad Whole Wheat Atta 10 kg',
    title: 'Aashirvaad Whole Wheat Atta 10 kg',
    productName: 'Aashirvaad Atta 10 kg Bag',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    quantity: 2, qty: 2, unit: 'Bag',
    unitPrice: 590, committedPrice: 590, finalPrice: 590,
    total: 1180, totalCommittedAmount: 1180, finalAmount: 1180,
    savings: 180,
    status: 'READY_FOR_PICKUP',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    joinedAt: '2026-10-25T11:30:00Z', createdAt: '2026-10-25T11:30:00Z',
    pickupLocation: 'Tower A Lobby', pickupPoint: 'Tower A Lobby',
    pickupDate: '2026-11-05',
    pickupSlot: 'Morning (9 AM – 12 PM)',
    pickupOtp: '7392',
    pickupQrCode: 'QR-ORD-SEED-001',
    qrCode: 'QR-ORD-SEED-001',
    qrToken: 'QR-ORD-SEED-001',
    authorizedCollectors: [],
  },
  {
    id: 'ORD-SEED-002',
    dealId: 'seed-3',
    dealTitle: 'Diwali Dry Fruits Premium Gift Box',
    title: 'Diwali Dry Fruits Premium Gift Box',
    productName: 'Premium Dry Fruits Box 1 kg',
    imageUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=500',
    quantity: 1, qty: 1, unit: 'Box',
    unitPrice: 1250, committedPrice: 1250, finalPrice: 1250,
    total: 1250, totalCommittedAmount: 1250, finalAmount: 1250,
    savings: 600,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    joinedAt: '2026-10-27T09:15:00Z', createdAt: '2026-10-27T09:15:00Z',
    pickupLocation: 'Clubhouse Desk', pickupPoint: 'Clubhouse Desk',
    pickupDate: '2026-11-02',
    pickupSlot: 'Evening (4 PM – 7 PM)',
    pickupOtp: '4821',
    pickupQrCode: 'QR-ORD-SEED-002',
    qrCode: 'QR-ORD-SEED-002',
    qrToken: 'QR-ORD-SEED-002',
    authorizedCollectors: [],
  },
];

// ── Service ───────────────────────────────────────────────────────────────────

export const groupBuyingService = {
  getDeals: async (filters?: any): Promise<GroupDeal[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/deals');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        let list = res.data.map(mapBackendDealToGroupDeal);
        if (filters && typeof filters === 'object') {
          if (filters.category && filters.category !== 'ALL') {
            list = list.filter(d => d.category === filters.category);
          }
          if (filters.status && filters.status !== 'ALL') {
            list = list.filter(d => d.status === filters.status || d.dealStatus === filters.status);
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(d => d.title.toLowerCase().includes(q) || d.productName.toLowerCase().includes(q));
          }
        }
        return list;
      }
    } catch (err) {
      console.warn('Failed to fetch deals from /group-buying/deals', err);
    }
    let seed = SEED_DEALS;
    if (filters && typeof filters === 'object') {
      if (filters.category && filters.category !== 'ALL') seed = seed.filter(d => d.category === filters.category);
      if (filters.search) { const q = filters.search.toLowerCase(); seed = seed.filter(d => d.title.toLowerCase().includes(q)); }
    }
    return seed;
  },

  getFestivalCategories: async (): Promise<string[]> => {
    return ['All', 'Diwali Sweets & Snacks', 'Puja Essentials', 'Dry Fruits Gift Boxes', 'Ethnic Grocery'];
  },

  getFestivalDeals: async (): Promise<GroupDeal[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/deals/festival');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map(mapBackendDealToGroupDeal);
      }
    } catch (err) {
      console.warn('Failed to fetch festival deals', err);
    }
    return [];
  },

  getAlmostUnlockedDeals: async (): Promise<GroupDeal[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/deals/almost-unlocked');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map(mapBackendDealToGroupDeal);
      }
    } catch (err) {
      console.warn('Failed to fetch almost unlocked deals', err);
    }
    return [];
  },

  getDealById: async (dealId: string): Promise<GroupDeal | null> => {
    try {
      const res = await api.get<any>(`/group-buying/deals/${dealId}`);
      if (res.data) {
        return mapBackendDealToGroupDeal(res.data);
      }
    } catch (err) {
      console.warn(`Failed to fetch deal ${dealId}`, err);
    }
    return SEED_DEALS.find(d => d.id === dealId) ?? null;
  },

  joinDeal: async (arg1: any, arg2?: any, arg3?: any): Promise<GroupOrder> => {
    const payload: JoinDealPayload = typeof arg1 === 'string'
      ? { dealId: arg1, quantity: arg2 || 1, paymentMethod: arg3 || 'UPI' }
      : arg1;
    
    const res = await api.post<any>(`/group-buying/deals/${payload.dealId}/join`, {
      quantity: payload.quantity || 1,
      paymentType: payload.paymentMethod || 'UPI',
      deliveryAddress: payload.deliverySlot || 'Clubhouse',
      specialNotes: payload.deliverySlot,
    });
    return mapBackendOrderToGroupOrder(res.data);
  },

  checkoutGroupBuy: async (arg1: any, arg2?: any, arg3?: any): Promise<GroupOrder> => {
    const payload: JoinDealPayload = typeof arg1 === 'string'
      ? { dealId: arg1, quantity: arg2 || 1, paymentMethod: arg3 || 'UPI' }
      : arg1;

    const res = await api.post<any>(`/group-buying/deals/${payload.dealId}/checkout`, {
      quantity: payload.quantity || 1,
      paymentMethod: payload.paymentMethod || 'UPI',
      deliveryAddressOrPickup: payload.deliverySlot || 'Clubhouse Hub',
      specialNotes: payload.deliverySlot,
    });
    return mapBackendOrderToGroupOrder(res.data);
  },

  payOrder: async (orderNumber: string, payload: { paymentMethod: string; amount: number; transactionId?: string }) => {
    const res = await api.post<any>(`/group-buying/orders/${orderNumber}/pay`, payload);
    return res.data;
  },

  cancelOrder: async (orderNumber: string, reason: string): Promise<GroupOrder> => {
    const res = await api.post<any>(`/group-buying/orders/${orderNumber}/cancel`, { reason });
    return mapBackendOrderToGroupOrder(res.data);
  },

  getUserOrders: async (): Promise<GroupOrder[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/my-orders');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(mapBackendOrderToGroupOrder);
      }
    } catch (err) {
      console.warn('Failed to fetch user orders', err);
    }
    return SEED_ORDERS;
  },

  getMyOrders: async (): Promise<GroupOrder[]> => {
    return groupBuyingService.getUserOrders();
  },

  getOrderById: async (orderId: string): Promise<GroupOrder | null> => {
    const orders = await groupBuyingService.getUserOrders();
    return orders.find(o => o.id === orderId) || null;
  },

  getVendorOrders: async (): Promise<GroupOrder[]> => {
    const res = await api.get<any[]>('/group-buying/vendor/orders');
    return (res.data || []).map(mapBackendOrderToGroupOrder);
  },

  updateFulfillment: async (orderNumber: string, payload: {
    status: string;
    deliveryPartnerName?: string;
    deliveryPartnerPhone?: string;
    trackingNumber?: string;
    estimatedDeliveryTime?: string;
    notes?: string;
  }): Promise<GroupOrder> => {
    const res = await api.patch<any>(`/group-buying/vendor/orders/${orderNumber}/fulfillment`, payload);
    return mapBackendOrderToGroupOrder(res.data);
  },

  verifyDeliveryOtp: async (payload: { orderNumber: string; deliveryOtp: string; residentFlat?: string }): Promise<GroupOrder> => {
    const res = await api.post<any>('/group-buying/vendor/orders/verify-delivery', payload);
    return mapBackendOrderToGroupOrder(res.data);
  },

  getVendorSettlements: async () => {
    const res = await api.get<any[]>('/group-buying/vendor/settlements');
    return res.data;
  },

  generateDealSettlement: async (dealId: number | string) => {
    const res = await api.post<any>(`/group-buying/vendor/settlements/deal/${dealId}/generate`, {});
    return res.data;
  },

  payoutSettlement: async (settlementId: number | string, payoutReference?: string) => {
    const res = await api.post<any>(`/group-buying/vendor/settlements/${settlementId}/payout`, null, {
      params: { payoutReference },
    });
    return res.data;
  },

  verifyPickupPass: async (qrOrOtp: string): Promise<VerifyPickupResponse> => {
    try {
      const res = await api.post<any>('/group-buying/orders/verify-pickup', {
        qrToken: qrOrOtp,
        orderNumber: qrOrOtp,
      });
      return {
        success: res.data?.valid ?? res.data?.success ?? true,
        message: res.data?.message || 'Pickup verified successfully',
        order: res.data?.order ? mapBackendOrderToGroupOrder(res.data.order) : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Invalid OTP or QR token',
      };
    }
  },

  authorizeCollector: async (orderNumber: string, payload: { name: string; relationship?: string; phone?: string }) => {
    const res = await api.post<any>(`/group-buying/orders/${orderNumber}/authorize-collector`, payload);
    return res.data;
  },

  raiseOrderDispute: async (payload: any): Promise<OrderDispute> => {
    const res = await api.post<any>('/group-buying/disputes', payload);
    return {
      id: String(res.data.id),
      orderId: res.data.orderId,
      reason: res.data.reason,
      claimAmount: res.data.claimAmount,
      description: res.data.description,
      requestedResolution: res.data.requestedResolution,
      status: res.data.status,
      createdAt: res.data.createdAt,
    };
  },

  getUserDisputes: async (): Promise<OrderDispute[]> => {
    const res = await api.get<any[]>('/group-buying/disputes');
    return (res.data || []).map((d: any) => ({
      id: String(d.id),
      orderId: d.orderId,
      reason: d.reason,
      claimAmount: d.claimAmount,
      description: d.description,
      requestedResolution: d.requestedResolution,
      status: d.status,
      createdAt: d.createdAt,
    }));
  },

  submitOrderReview: async (payload: any): Promise<any> => {
    const res = await api.post<any>('/group-buying/reviews', payload);
    return res.data;
  },

  getBuyingGroups: async (): Promise<BuyingGroup[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/tower-groups');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((g: any) => ({
          id: String(g.id),
          name: g.name,
          tower: g.tower || g.towerName || g.name,
          block: g.block || g.tower || 'Block A',
          isMember: g.isMember ?? g.isJoined ?? false,
          description: g.description || 'Community Tower Collective',
          totalSaved: g.totalSaved || g.totalSavingsAmount || 0,
          totalSavings: g.totalSaved || g.totalSavingsAmount || 0,
          leaderName: g.leaderName || 'Community Lead',
          leaderFlat: g.leaderFlat || '',
          memberCount: g.memberCount || g.membersCount || 1,
          activeDealsCount: g.activeDealsCount || 0,
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch tower groups', err);
    }
    return [];
  },

  joinBuyingGroup: async (groupId: string): Promise<BuyingGroup> => {
    const groups = await groupBuyingService.getBuyingGroups();
    const grp = groups.find(g => g.id === groupId);
    if (!grp) throw new Error('Buying group not found');
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
    return [
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
  },

  joinBasket: async (_basketId: string): Promise<any> => {
    return { success: true };
  },

  getBuyAgainSuggestions: async (): Promise<BuyAgainSuggestion[]> => {
    return [
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
        dealId: '1',
        savings: 350,
      },
    ];
  },

  askCommunityAI: async (query: string): Promise<CommunityAIQueryResponse> => {
    try {
      const res = await api.post<any>('/group-buying/ai-query', { query });
      return {
        answer: res.data.answer,
        action: res.data.action,
        matchedDeals: (res.data.matchedDeals || []).map(mapBackendDealToGroupDeal),
        matchedDemands: res.data.matchedDemands || [],
        confidence: res.data.confidence || 0.95,
      };
    } catch {
      return {
        answer: `I looked up deals and community demands matching "${query}".`,
        action: 'JOIN_DEAL',
        matchedDeals: [],
        matchedDemands: [],
        confidence: 0.8,
      };
    }
  },

  getDemands: async (): Promise<DemandPool[]> => {
    try {
      const res = await api.get<any[]>('/group-buying/demand');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((d: any) => ({
          id: String(d.id),
          title: d.title,
          productName: d.title,
          category: d.category || 'GROCERIES',
          description: d.description || '',
          imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
          interestedResidents: d.interestedResidents || 1,
          expectedQty: d.expectedQty || 10,
          expectedQuantity: d.expectedQty || 10,
          targetQuantity: 50,
          targetUpvotes: 25,
          upvotes: d.upvotes || 1,
          hasUpvoted: d.hasUpvoted ?? false,
          preferredPriceMin: d.preferredPriceMin || 100,
          preferredPriceMax: d.preferredPriceMax || 500,
          preferredBrand: d.preferredBrand,
          preferredBrands: d.preferredBrand ? [d.preferredBrand] : [],
          suggestedBy: d.suggestedBy || 'Community Resident',
          suggestedAt: d.createdAt || new Date().toISOString(),
          status: d.status || 'OPEN',
          vendorOffers: (d.vendorOffers || []).map((o: any) => ({
            id: String(o.id),
            demandId: String(d.id),
            vendorId: String(o.vendorId || 'vnd-1'),
            vendorName: o.vendorName,
            vendorRating: o.vendorRating || 4.8,
            isVerified: o.vendorVerified ?? true,
            vendorVerified: o.vendorVerified ?? true,
            pricePerUnit: o.offeredPrice,
            offeredPrice: o.offeredPrice,
            moq: o.minimumQty || 50,
            minimumQty: o.minimumQty || 50,
            estimatedDeliveryDays: 3,
            deliveryDate: o.deliveryDate || '2026-10-15',
            notes: o.terms || '',
            terms: o.terms || '',
            createdAt: o.createdAt || new Date().toISOString(),
            status: o.status || 'PENDING',
            fulfillmentRate: 99.0,
            onTimeRate: 98.0,
            cancellationRate: 0.2,
            disputeRate: 0.1,
            qualityScore: 4.9,
          })),
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch demand board', err);
    }
    return SEED_DEMANDS;
  },

  getDemandBoard: async (): Promise<DemandPool[]> => {
    return groupBuyingService.getDemands();
  },

  getDemandById: async (demandId: string): Promise<DemandPool | null> => {
    const demands = await groupBuyingService.getDemands();
    return demands.find(d => d.id === demandId) || null;
  },

  createDemand: async (payload: CreateDemandPayload): Promise<DemandPool> => {
    const res = await api.post<any>('/group-buying/demand', {
      title: payload.productName || payload.title || 'Community Request',
      category: payload.category || 'GROCERIES',
      description: payload.description,
      expectedQty: payload.expectedQuantity || payload.expectedQty || 10,
      preferredPriceMin: payload.preferredPriceMin,
      preferredPriceMax: payload.preferredPriceMax,
      preferredBrand: payload.preferredBrand || (payload.preferredBrands ? payload.preferredBrands[0] : undefined),
    });
    return {
      id: String(res.data.id),
      title: res.data.title,
      productName: res.data.title,
      category: res.data.category,
      description: res.data.description,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
      interestedResidents: res.data.interestedResidents || 1,
      expectedQty: res.data.expectedQty || 10,
      expectedQuantity: res.data.expectedQty || 10,
      targetQuantity: 50,
      targetUpvotes: 25,
      upvotes: res.data.upvotes || 1,
      hasUpvoted: true,
      preferredPriceMin: res.data.preferredPriceMin,
      preferredPriceMax: res.data.preferredPriceMax,
      preferredBrand: res.data.preferredBrand,
      preferredBrands: res.data.preferredBrand ? [res.data.preferredBrand] : [],
      suggestedBy: res.data.suggestedBy || 'You',
      suggestedAt: res.data.createdAt || new Date().toISOString(),
      status: res.data.status || 'OPEN',
      vendorOffers: [],
    };
  },

  upvoteDemand: async (demandId: string): Promise<void> => {
    await api.post(`/group-buying/demand/${demandId}/upvote`, {});
  },

  submitVendorOffer: async (demandId: string | number, payload: {
    offeredPrice: number;
    minimumQty: number;
    maximumQty?: number;
    deliveryDate?: string;
    terms?: string;
  }) => {
    const res = await api.post<any>(`/group-buying/demand/${demandId}/offers`, payload);
    return res.data;
  },

  acceptVendorOffer: async (demandId: string, offerId: string): Promise<GroupDeal> => {
    const res = await api.post<any>(`/group-buying/demand/${demandId}/offers/${offerId}/accept`, {});
    return mapBackendDealToGroupDeal(res.data);
  },

  getCommunitySavings: async (): Promise<CommunitySavings> => {
    try {
      const res = await api.get<any>('/group-buying/community-savings');
      if (res.data) {
        return {
          totalSavedAllTime: res.data.totalSavedAllTime || res.data.totalSavedThisMonth * 8,
          totalOrdersAllTime: res.data.totalOrdersAllTime || res.data.totalOrders * 5,
          activeParticipants: res.data.activeParticipants || 150,
          thisMonthSaved: res.data.totalSavedThisMonth || 148500,
          totalSavedThisMonth: res.data.totalSavedThisMonth || 148500,
          totalOrders: res.data.totalOrders || 312,
          activeDeals: res.data.activeDeals || 8,
          avgSavingPerOrder: res.data.avgSavingPerOrder || 147,
          totalKgsBought: res.data.totalKgsBought || 2450,
          monthlyBuyingPower: {
            totalSaved: res.data.totalSavedThisMonth || 148500,
            totalOrders: res.data.totalOrders || 312,
            activeDeals: res.data.activeDeals || 8,
            totalKgBought: res.data.totalKgsBought || 2450,
            avgSavingPerOrder: res.data.avgSavingPerOrder || 147,
            topSavingCategory: 'Groceries & Farm Produce',
            collectiveDiscountPercent: 23.8,
            heroMilestoneText: `Your community saved ₹${((res.data.totalSavedAllTime || 1840000) / 100000).toFixed(1)} lakh through collective purchasing this year.`,
          },
          topDealsThisMonth: (res.data.topCategories || []).map((c: any) => ({
            dealTitle: c.category,
            savings: c.saved,
            participants: 40,
          })),
          towerLeaderboard: [
            { tower: 'Tower A', orders: 412, totalSaved: 62450 },
            { tower: 'Tower B', orders: 386, totalSaved: 58200 },
            { tower: 'Tower C', orders: 298, totalSaved: 42870 },
            { tower: 'Tower D', orders: 152, totalSaved: 21000 },
          ],
        };
      }
    } catch (err) {
      console.warn('Failed to fetch community savings', err);
    }
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
      topDealsThisMonth: [],
      towerLeaderboard: [],
    };
  },
};
