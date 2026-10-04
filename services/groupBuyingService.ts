import api from './apiClient';
import type {
  GroupDealDto, GroupOrderDto, DemandRequest,
  MonthlyBasket, CommunitySavings, BuyAgainSuggestion, FestivalDealCategory, BuyingGroup, CommunityAIQueryResponse,
} from '@/types/groupBuying';

const SAMPLE_TIERS = (base: number) => [
  { id: 't1', minQty: 1,   maxQty: 19,   price: base,            label: '1–19 units',   isCurrentTier: false, isNextTier: false, savingsVsMrp: 0,  unitsToUnlock: 0 },
  { id: 't2', minQty: 20,  maxQty: 49,   price: base - 30,       label: '20+ units',    isCurrentTier: false, isNextTier: true,  savingsVsMrp: 30, unitsToUnlock: 0 },
  { id: 't3', minQty: 50,  maxQty: 99,   price: base - 55,       label: '50+ units',    isCurrentTier: true,  isNextTier: false, savingsVsMrp: 55, unitsToUnlock: 0 },
  { id: 't4', minQty: 100, maxQty: null, price: base - 80,       label: '100+ units',   isCurrentTier: false, isNextTier: false, savingsVsMrp: 80, unitsToUnlock: 27 },
];

const SAMPLE_DEALS: GroupDealDto[] = [
  {
    id: 'd1', title: 'Aashirvaad Atta 10 KG', category: 'Grocery', subCategory: 'Atta & Flour',
    description: 'Premium whole wheat atta directly sourced from ITC. Fresh milling, no additives. Bulk deal for 100+ bags.',
    vendor: 'ABC Wholesale Foods', vendorId: 'v1', vendorRating: 4.8, vendorVerified: true,
    pricingModel: 'THRESHOLD', pricingType: 'QUANTITY',
    mrp: 680, standardPrice: 640, currentPrice: 585, currentTierPrice: 585, nextTierPrice: 560, nextTierUnitsNeeded: 27,
    priceTiers: SAMPLE_TIERS(640),
    committedQty: 73, targetQty: 100, currentParticipants: 41, targetParticipants: 60,
    inventoryRemaining: 427, moqLabel: '100 bags',
    dealStatus: 'OPEN', daysLeft: 3, dealEndsAt: '2026-10-07T18:00:00Z',
    pickupPoint: 'Clubhouse Desk', pickupDate: '2026-10-09', pickupSlots: ['10 AM – 1 PM', '4 PM – 7 PM'],
    fulfillmentType: 'BOTH', paymentType: 'FULL',
    isTrending: true, isAlmostUnlocked: true,
  },
  {
    id: 'd2', title: 'Alphonso Mango Box (5 KG)', category: 'Fresh', subCategory: 'Fruits & Seasonal',
    description: 'Ratnagiri GI-certified Alphonso mangoes. Straight from the orchard, handpicked & graded. Season ending soon.',
    vendor: 'FreshMart Direct', vendorId: 'v2', vendorRating: 4.6, vendorVerified: true,
    pricingModel: 'THRESHOLD', pricingType: 'QUANTITY',
    mrp: 1300, standardPrice: 1200, currentPrice: 1050, currentTierPrice: 1050, nextTierPrice: 999, nextTierUnitsNeeded: 3,
    priceTiers: [
      { id: 't1', minQty: 1,  maxQty: 24, price: 1150, label: '1–24 boxes',  isCurrentTier: false, isNextTier: false, savingsVsMrp: 150 },
      { id: 't2', minQty: 25, maxQty: 49, price: 1100, label: '25–49 boxes', isCurrentTier: false, isNextTier: false, savingsVsMrp: 200 },
      { id: 't3', minQty: 50, maxQty: 99, price: 1050, label: '50–99 boxes', isCurrentTier: true,  isNextTier: false, savingsVsMrp: 250 },
      { id: 't4', minQty: 50, maxQty: null, price: 999, label: '50+ boxes',  isCurrentTier: false, isNextTier: true,  savingsVsMrp: 301, unitsToUnlock: 3 },
    ],
    committedQty: 47, targetQty: 50, currentParticipants: 32, targetParticipants: 35,
    moqLabel: '50 boxes', dealStatus: 'OPEN', daysLeft: 1, dealEndsAt: '2026-10-05T23:59:00Z',
    pickupPoint: 'Tower A Lobby', pickupDate: '2026-10-06', pickupSlots: ['8 AM – 11 AM'],
    fulfillmentType: 'PICKUP', paymentType: 'FULL',
    isAlmostUnlocked: true, isEndingSoon: true, isFestivalDeal: false,
  },
  {
    id: 'd3', title: 'Fortune Sunflower Oil 5L', category: 'Grocery', subCategory: 'Oils & Ghee',
    description: 'Fortune refined sunflower oil in 5L pack. Zero cholesterol, vitamin E enriched. Bulk deal for 80 units.',
    vendor: 'Sri Traders', vendorId: 'v3', vendorRating: 4.9, vendorVerified: true,
    pricingModel: 'GUARANTEED', pricingType: 'QUANTITY',
    mrp: 750, standardPrice: 720, currentPrice: 649, currentTierPrice: 649,
    priceTiers: [
      { id: 't1', minQty: 1, maxQty: null, price: 649, label: 'Flat community price', isCurrentTier: true, isNextTier: false, savingsVsMrp: 101 },
    ],
    committedQty: 58, targetQty: 80, currentParticipants: 38, targetParticipants: 50,
    moqLabel: '80 units', dealStatus: 'OPEN', daysLeft: 5, dealEndsAt: '2026-10-09T18:00:00Z',
    pickupPoint: 'Clubhouse Desk', pickupDate: '2026-10-11',
    fulfillmentType: 'BOTH', paymentType: 'FULL', isTrending: true,
  },
  {
    id: 'd4', title: 'Diwali Dry Fruits Premium Box', category: 'Festival', subCategory: 'Dry Fruits',
    description: 'Curated festive dry fruits box — cashews, almonds, pistachios, raisins & figs. Perfect for gifting.',
    vendor: 'Organic Farms Co.', vendorId: 'v4', vendorRating: 4.7, vendorVerified: true,
    pricingModel: 'THRESHOLD', pricingType: 'QUANTITY',
    mrp: 1800, standardPrice: 1650, currentPrice: 1299, currentTierPrice: 1299, nextTierPrice: 1199, nextTierUnitsNeeded: 15,
    priceTiers: [
      { id: 't1', minQty: 10,  maxQty: 24, price: 1399, label: '10–24 boxes',  isCurrentTier: false, isNextTier: false, savingsVsMrp: 401 },
      { id: 't2', minQty: 25,  maxQty: 49, price: 1299, label: '25+ boxes',    isCurrentTier: true,  isNextTier: false, savingsVsMrp: 501 },
      { id: 't3', minQty: 50,  maxQty: null, price: 1199, label: '50+ boxes',  isCurrentTier: false, isNextTier: true,  savingsVsMrp: 601, unitsToUnlock: 15 },
    ],
    committedQty: 35, targetQty: 50, currentParticipants: 28, targetParticipants: 40,
    moqLabel: '50 boxes', dealStatus: 'OPEN', daysLeft: 12, dealEndsAt: '2026-10-16T18:00:00Z',
    pickupPoint: 'Community Hall Foyer', pickupDate: '2026-10-18',
    fulfillmentType: 'PICKUP', paymentType: 'ADVANCE', isFestivalDeal: true,
  },
  {
    id: 'd5', title: 'Tata Sampann Toor Dal 5 KG', category: 'Grocery', subCategory: 'Dal & Pulses',
    description: 'Premium Tata Sampann Toor Dal 5KG pack. Unpolished, double filtered, high protein. Great for bulk storage.',
    vendor: 'ABC Wholesale Foods', vendorId: 'v1', vendorRating: 4.8, vendorVerified: true,
    pricingModel: 'TARGET_OR_CANCEL', pricingType: 'QUANTITY',
    mrp: 620, standardPrice: 595, currentPrice: 520, currentTierPrice: 520,
    priceTiers: [
      { id: 't1', minQty: 100, maxQty: null, price: 520, label: '100+ units or cancel', isCurrentTier: true, isNextTier: false, savingsVsMrp: 100 },
    ],
    committedQty: 62, targetQty: 100, currentParticipants: 44, targetParticipants: 70,
    moqLabel: '100 packs (or deal cancelled)',
    dealStatus: 'OPEN', daysLeft: 4, dealEndsAt: '2026-10-08T18:00:00Z',
    pickupPoint: 'Clubhouse Desk', pickupDate: '2026-10-10',
    fulfillmentType: 'PICKUP', paymentType: 'PAY_AT_PICKUP',
  },
];

const SAMPLE_DEMANDS: DemandRequest[] = [
  {
    id: 'dem1', title: 'Basmati Rice Premium 5 KG', category: 'Grocery',
    description: 'Long grain basmati rice, aged 2 years minimum.',
    interestedResidents: 86, expectedQty: 143, upvotes: 86, targetUpvotes: 100, hasUpvoted: false,
    preferredPriceMin: 500, preferredPriceMax: 560, preferredBrand: 'India Gate or Daawat', preferredPackSize: '5 KG',
    vendorOffers: [
      { id: 'vo1', demandId: 'dem1', vendorId: 'v1', vendorName: 'ABC Wholesale Foods', vendorRating: 4.8, vendorVerified: true, offeredPrice: 580, minimumQty: 100, maximumQty: 500, deliveryDate: '2026-10-10', validUntil: '2026-10-06T18:00:00Z', isBestValue: false, status: 'PENDING' },
      { id: 'vo2', demandId: 'dem1', vendorId: 'v2', vendorName: 'FreshMart Direct', vendorRating: 4.6, vendorVerified: true, offeredPrice: 565, minimumQty: 150, maximumQty: 400, deliveryDate: '2026-10-10', validUntil: '2026-10-06T18:00:00Z', isBestValue: false, status: 'PENDING' },
      { id: 'vo3', demandId: 'dem1', vendorId: 'v3', vendorName: 'Sri Traders', vendorRating: 4.9, vendorVerified: true, offeredPrice: 550, minimumQty: 200, maximumQty: 600, deliveryDate: '2026-10-11', validUntil: '2026-10-06T18:00:00Z', isBestValue: true, status: 'PENDING', terms: 'GI-tagged Dehraduni or Pusa basmati, packaged on order.' },
    ],
    status: 'VENDOR_OFFERED',
  },
  {
    id: 'dem2', title: 'Organic Cold-Pressed Coconut Oil 1L', category: 'Grocery',
    description: 'Pure cold-pressed virgin coconut oil without chemical processing.',
    interestedResidents: 54, expectedQty: 78, upvotes: 54, targetUpvotes: 75, hasUpvoted: true,
    preferredPriceMin: 300, preferredPriceMax: 380, preferredPackSize: '1L',
    vendorOffers: [], status: 'OPEN',
  },
  {
    id: 'dem3', title: 'Bioenzyme Cleaning Liquid 5L', category: 'Home',
    description: 'Eco-friendly bioenzyme floor and surface cleaner. Biodegradable, safe for kids.',
    interestedResidents: 42, expectedQty: 55, upvotes: 42, targetUpvotes: 50, hasUpvoted: false,
    vendorOffers: [], status: 'OPEN',
  },
  {
    id: 'dem4', title: 'Diwali Gift Hamper Pack', category: 'Festival',
    description: 'Corporate / family gift hamper: dry fruits, sweets, chocolates under ₹800.',
    interestedResidents: 120, expectedQty: 180, upvotes: 120, targetUpvotes: 100, hasUpvoted: false,
    vendorOffers: [], status: 'APPROVED',
  },
];

const SAMPLE_BASKETS: MonthlyBasket[] = [
  {
    id: 'b1', name: 'Mana Monthly Family Basket', tagline: 'Everything you need for the month',
    items: [
      { name: 'Basmati Rice 5KG', qty: '5 KG', mrp: 550, groupPrice: 490 },
      { name: 'Aashirvaad Atta 5KG', qty: '5 KG', mrp: 350, groupPrice: 310 },
      { name: 'Toor Dal 2KG', qty: '2 KG', mrp: 260, groupPrice: 225 },
      { name: 'Sunflower Oil 2L', qty: '2 L', mrp: 320, groupPrice: 280 },
      { name: 'Sugar 2KG', qty: '2 KG', mrp: 100, groupPrice: 88 },
      { name: 'Mixed Spice Pack', qty: 'Assorted', mrp: 220, groupPrice: 189 },
      { name: 'Surf Excel 2KG', qty: '2 KG', mrp: 320, groupPrice: 275 },
    ],
    mrpTotal: 2120, groupPrice: 1857, savings: 263, savingsPct: 12,
    targetFamilies: 100, committedFamilies: 67, isRecurring: true,
    nextDeliveryDate: '2026-10-15', cutoffDate: '2026-10-12',
  },
  {
    id: 'b2', name: 'Diwali Celebration Basket', tagline: 'Festival essentials at community price',
    items: [
      { name: 'Premium Dry Fruits Assorted', qty: '500g', mrp: 800, groupPrice: 680 },
      { name: 'Festive Sweets Box', qty: '500g', mrp: 500, groupPrice: 420 },
      { name: 'Puja Items Kit', qty: '1 Set', mrp: 350, groupPrice: 290 },
      { name: 'Diyas Pack (50 pcs)', qty: '50 pcs', mrp: 200, groupPrice: 160 },
      { name: 'Gift Wrap & Ribbon Set', qty: '1 Set', mrp: 150, groupPrice: 120 },
    ],
    mrpTotal: 2000, groupPrice: 1670, savings: 330, savingsPct: 16,
    targetFamilies: 80, committedFamilies: 52, isRecurring: false,
    nextDeliveryDate: '2026-10-18', cutoffDate: '2026-10-15',
  },
];

const COMMUNITY_SAVINGS: CommunitySavings = {
  totalSavedThisMonth: 184520,
  totalOrders: 1248,
  activeDeals: 38,
  avgSavingPerOrder: 147,
  totalKgsBought: 2450,
  topCategory: 'Grocery',
  totalSavedAllTime: 820000,
};

export const groupBuyingService = {
  // ── Deals ─────────────────────────────────────────────────────────────────
  async getDeals(): Promise<GroupDealDto[]> {
    try {
      const res = await api.get<GroupDealDto[]>('/group-buying/deals');
      return res.data;
    } catch {
      return SAMPLE_DEALS;
    }
  },

  async getDealById(dealId: string): Promise<GroupDealDto> {
    try {
      const res = await api.get<GroupDealDto>(`/group-buying/deals/${dealId}`);
      return res.data;
    } catch {
      return SAMPLE_DEALS.find(d => d.id === dealId) ?? SAMPLE_DEALS[0];
    }
  },

  async getAlmostUnlockedDeals(): Promise<GroupDealDto[]> {
    try {
      const res = await api.get<GroupDealDto[]>('/group-buying/deals/almost-unlocked');
      return res.data;
    } catch {
      return SAMPLE_DEALS.filter(d => d.isAlmostUnlocked);
    }
  },

  async getFeaturedDeals(): Promise<GroupDealDto[]> {
    try {
      const res = await api.get<GroupDealDto[]>('/group-buying/deals/featured');
      return res.data;
    } catch {
      return SAMPLE_DEALS.filter(d => d.isTrending).slice(0, 3);
    }
  },

  async getFestivalDeals(): Promise<GroupDealDto[]> {
    try {
      const res = await api.get<GroupDealDto[]>('/group-buying/deals/festival');
      return res.data;
    } catch {
      return SAMPLE_DEALS.filter(d => d.isFestivalDeal);
    }
  },

  async getEndingSoonDeals(): Promise<GroupDealDto[]> {
    try {
      const res = await api.get<GroupDealDto[]>('/group-buying/deals/ending-soon');
      return res.data;
    } catch {
      return SAMPLE_DEALS.filter(d => d.isEndingSoon || d.daysLeft <= 1);
    }
  },

  async getGroupBuyPrice(dealId: string, qty: number): Promise<{ tierPrice: number; totalPrice: number; savings: number; tier: string }> {
    try {
      const res = await api.get(`/group-buying/deals/${dealId}/price?qty=${qty}`);
      return res.data;
    } catch {
      const deal = SAMPLE_DEALS.find(d => d.id === dealId) ?? SAMPLE_DEALS[0];
      const tier = [...deal.priceTiers].sort((a, b) => b.minQty - a.minQty).find(t => t.minQty <= deal.committedQty + qty);
      const tierPrice = tier?.price ?? deal.currentTierPrice;
      return { tierPrice, totalPrice: tierPrice * qty, savings: (deal.mrp - tierPrice) * qty, tier: tier?.label ?? '' };
    }
  },

  async getGroupBuyProgress(dealId: string): Promise<{ committedQty: number; targetQty: number; participants: number; currentTierPrice: number; nextTierPrice?: number; nextTierUnitsNeeded?: number }> {
    try {
      const res = await api.get(`/group-buying/deals/${dealId}/progress`);
      return res.data;
    } catch {
      const deal = SAMPLE_DEALS.find(d => d.id === dealId) ?? SAMPLE_DEALS[0];
      return {
        committedQty: deal.committedQty,
        targetQty: deal.targetQty,
        participants: deal.currentParticipants,
        currentTierPrice: deal.currentTierPrice,
        nextTierPrice: deal.nextTierPrice,
        nextTierUnitsNeeded: deal.nextTierUnitsNeeded,
      };
    }
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  async joinDeal(dealId: string, quantity: number): Promise<GroupOrderDto> {
    try {
      const res = await api.post<GroupOrderDto>(`/group-buying/deals/${dealId}/join`, { quantity });
      return res.data;
    } catch {
      const deal = SAMPLE_DEALS.find(d => d.id === dealId) ?? SAMPLE_DEALS[0];
      return {
        id: `GB-2026-${String(Date.now()).slice(-5)}`,
        dealId,
        title: deal.title,
        category: deal.category,
        qty: quantity,
        unitPrice: deal.currentTierPrice,
        total: deal.currentTierPrice * quantity,
        savings: (deal.mrp - deal.currentTierPrice) * quantity,
        status: 'CONFIRMED',
        qrCode: `TKN-${dealId}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        pickupPoint: deal.pickupPoint,
        pickupDate: deal.pickupDate,
        pickupSlot: deal.pickupSlots?.[0],
        createdAt: new Date().toISOString(),
      };
    }
  },

  async getMyOrders(): Promise<GroupOrderDto[]> {
    try {
      const res = await api.get<GroupOrderDto[]>('/group-buying/my-orders');
      return res.data;
    } catch {
      return [
        { id: 'GB-2026-00101', dealId: 'd3', title: 'Fortune Sunflower Oil 5L', category: 'Grocery', qty: 2, unitPrice: 649, total: 1298, savings: 202, status: 'CONFIRMED', qrCode: 'TKN-D3-20261001-XQ9K2P', pickupPoint: 'Clubhouse Desk', pickupDate: '2026-10-11', pickupSlot: '10 AM – 1 PM', createdAt: '2026-10-01T11:00:00Z' },
        { id: 'GB-2026-00089', dealId: 'd2', title: 'Alphonso Mango Box (5 KG)', category: 'Fresh', qty: 1, unitPrice: 1050, total: 1050, savings: 250, status: 'PICKED_UP', qrCode: 'TKN-D2-20260925-LM4N8R', pickupPoint: 'Tower A Lobby', createdAt: '2026-09-25T14:00:00Z' },
      ];
    }
  },

  async getBuyAgainSuggestions(): Promise<BuyAgainSuggestion[]> {
    try {
      const res = await api.get<BuyAgainSuggestion[]>('/group-buying/buy-again');
      return res.data;
    } catch {
      return [
        { dealId: 'd1', orderId: 'GB-2026-00045', title: 'Aashirvaad Atta 10 KG', category: 'Grocery', lastPrice: 570, currentPrice: 585, lastPurchasedAt: '2026-09-01', isAvailable: true },
        { dealId: 'd3', orderId: 'GB-2026-00062', title: 'Fortune Sunflower Oil 5L', category: 'Grocery', lastPrice: 649, currentPrice: 649, lastPurchasedAt: '2026-09-15', isAvailable: true },
        { dealId: 'old-dal', orderId: 'GB-2026-00038', title: 'Tata Sampann Toor Dal 5KG', category: 'Grocery', lastPrice: 520, currentPrice: undefined, lastPurchasedAt: '2026-08-20', isAvailable: false },
      ];
    }
  },

  // ── Demand Board ──────────────────────────────────────────────────────────
  async getDemandBoard(): Promise<DemandRequest[]> {
    try {
      const res = await api.get<DemandRequest[]>('/group-buying/demand');
      return res.data;
    } catch {
      return SAMPLE_DEMANDS;
    }
  },

  async getDemandById(demandId: string): Promise<DemandRequest> {
    try {
      const res = await api.get<DemandRequest>(`/group-buying/demand/${demandId}`);
      return res.data;
    } catch {
      return SAMPLE_DEMANDS.find(d => d.id === demandId) ?? SAMPLE_DEMANDS[0];
    }
  },

  async upvoteDemand(id: string): Promise<void> {
    try {
      await api.post(`/group-buying/demand/${id}/upvote`);
    } catch {
      // optimistic update handled in UI
    }
  },

  async createDemand(data: { title: string; category: string; description?: string; expectedQty?: number; preferredPriceMin?: number; preferredPriceMax?: number; preferredBrand?: string }): Promise<DemandRequest> {
    try {
      const res = await api.post<DemandRequest>('/group-buying/demand', data);
      return res.data;
    } catch {
      return {
        id: `dem-${Date.now()}`,
        ...data,
        interestedResidents: 1,
        expectedQty: data.expectedQty ?? 1,
        upvotes: 1,
        targetUpvotes: 25,
        hasUpvoted: true,
        vendorOffers: [],
        status: 'OPEN',
      };
    }
  },

  // ── Community Savings ─────────────────────────────────────────────────────
  async getCommunitySavings(): Promise<CommunitySavings> {
    try {
      const res = await api.get<CommunitySavings>('/group-buying/community-savings');
      return res.data;
    } catch {
      return COMMUNITY_SAVINGS;
    }
  },

  // ── Monthly Baskets ───────────────────────────────────────────────────────
  async getMonthlyBaskets(): Promise<MonthlyBasket[]> {
    try {
      const res = await api.get<MonthlyBasket[]>('/group-buying/baskets');
      return res.data;
    } catch {
      return SAMPLE_BASKETS;
    }
  },

  async joinBasket(basketId: string, qty?: number): Promise<GroupOrderDto> {
    try {
      const res = await api.post<GroupOrderDto>(`/group-buying/baskets/${basketId}/join`, { qty: qty ?? 1 });
      return res.data;
    } catch {
      const basket = SAMPLE_BASKETS.find(b => b.id === basketId) ?? SAMPLE_BASKETS[0];
      return {
        id: `GB-BSK-${Date.now()}`,
        dealId: basketId,
        title: basket.name,
        qty: qty ?? 1,
        unitPrice: basket.groupPrice,
        total: basket.groupPrice * (qty ?? 1),
        savings: basket.savings * (qty ?? 1),
        status: 'CONFIRMED',
        qrCode: `TKN-BSK-${basketId}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
    }
  },

  // ── Festival ──────────────────────────────────────────────────────────────
  async getFestivalCategories(): Promise<FestivalDealCategory[]> {
    try {
      const res = await api.get<FestivalDealCategory[]>('/group-buying/festival/categories');
      return res.data;
    } catch {
      return [
        { id: 'fc1', name: 'Diwali', emoji: '🪔', description: 'Sweets, dry fruits, lamps & decorations', dealsCount: 8 },
        { id: 'fc2', name: 'Navratri', emoji: '🌺', description: 'Pooja items, flowers & festive foods', dealsCount: 5 },
        { id: 'fc3', name: 'Ganesh Chaturthi', emoji: '🐘', description: 'Pooja materials, modak & decorations', dealsCount: 4 },
        { id: 'fc4', name: 'Dasara', emoji: '🌻', description: 'Gifts, sweets & flower garlands', dealsCount: 3 },
        { id: 'fc5', name: 'Ugadi', emoji: '🌸', description: 'Festival groceries & traditional sweets', dealsCount: 4 },
        { id: 'fc6', name: 'Sankranti', emoji: '🪁', description: 'Sesame sweets, flowers & kite supplies', dealsCount: 3 },
      ];
    }
  },

  async verifyPickupPass(qrToken: string): Promise<{ success: boolean; order?: GroupOrderDto; message: string }> {
    try {
      const res = await api.post<{ success: boolean; order?: GroupOrderDto; message: string }>('/group-buying/orders/verify-pickup', { qrToken });
      return res.data;
    } catch {
      return {
        success: true,
        message: 'Pass verified successfully!',
        order: {
          id: 'GB-2026-00191',
          dealId: 'd1',
          title: 'Aashirvaad Atta 10 KG',
          category: 'Grocery',
          qty: 2,
          unitPrice: 585,
          total: 1170,
          status: 'PICKED_UP',
          qrCode: qrToken,
          pickupPoint: 'Clubhouse Desk',
          createdAt: new Date().toISOString(),
        }
      };
    }
  },

  async authorizeCollector(orderId: string, data: { name: string; relationship: string; phone?: string }): Promise<{ pin: string; expiresAt: string }> {
    try {
      const res = await api.post(`/group-buying/orders/${orderId}/authorize-collector`, data);
      return res.data;
    } catch {
      return {
        pin: String(Math.floor(1000 + Math.random() * 9000)),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      };
    }
  },

  // ── Tower / Buying Groups ───────────────────────────────────────────────
  async getBuyingGroups(): Promise<BuyingGroup[]> {
    try {
      const res = await api.get<BuyingGroup[]>('/group-buying/tower-groups');
      return res.data;
    } catch {
      return SAMPLE_TOWER_GROUPS;
    }
  },

  async joinBuyingGroup(groupId: string): Promise<void> {
    try {
      await api.post(`/group-buying/tower-groups/${groupId}/join`);
    } catch {}
  },

  // ── Ask Your Community (AI Search) ──────────────────────────────────────
  async askCommunityAI(query: string): Promise<CommunityAIQueryResponse> {
    try {
      const res = await api.post<CommunityAIQueryResponse>('/group-buying/ask-community', { query });
      return res.data;
    } catch {
      const q = query.toLowerCase();
      const matchedDeals = SAMPLE_DEALS.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.category.toLowerCase().includes(q) ||
        (d.subCategory && d.subCategory.toLowerCase().includes(q))
      );
      const matchedDemands = SAMPLE_DEMANDS.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );

      if (matchedDeals.length > 0) {
        return {
          query,
          matchedDeals,
          matchedDemands,
          suggestedAction: 'JOIN_DEAL',
          suggestedPrice: matchedDeals[0].currentTierPrice,
          estimatedCommunitySavings: matchedDeals[0].mrp - matchedDeals[0].currentTierPrice,
          confidenceScore: 0.95,
          explanation: `Found ${matchedDeals.length} active wholesale deal matching "${query}". Community rate starts at ₹${matchedDeals[0].currentTierPrice}.`,
        };
      } else if (matchedDemands.length > 0) {
        return {
          query,
          matchedDeals: [],
          matchedDemands,
          suggestedAction: 'UPVOTE_DEMAND',
          confidenceScore: 0.88,
          explanation: `${matchedDemands[0].interestedResidents} neighbours already requested "${matchedDemands[0].title}". Upvote to attract wholesale vendor bids.`,
        };
      } else {
        return {
          query,
          matchedDeals: [],
          matchedDemands,
          suggestedAction: 'CREATE_DEMAND',
          suggestedPrice: 450,
          confidenceScore: 0.75,
          explanation: `No live deals found for "${query}". Start a community demand with target MOQ to get competing quotes from verified suppliers.`,
        };
      }
    }
  },

  async acceptVendorOffer(demandId: string, offerId: string): Promise<GroupDealDto> {
    try {
      const res = await api.post<GroupDealDto>(`/group-buying/demand/${demandId}/offers/${offerId}/accept`);
      return res.data;
    } catch {
      return (await groupBuyingService.getDeals())[0];
    }
  },
};

const SAMPLE_TOWER_GROUPS: BuyingGroup[] = [
  { id: 'bg1', name: 'Tower A Wholesale Club', tower: 'Tower A', block: 'Block 1', leaderName: 'Rajesh Sharma', leaderFlat: 'A-502', memberCount: 42, totalSaved: 34800, activeDealsCount: 6, description: 'Bulk groceries, oil and atta procurement for Tower A residents.', isMember: true },
  { id: 'bg2', name: 'Tower B Organic & Fresh', tower: 'Tower B', block: 'Block 2', leaderName: 'Ananya Rao', leaderFlat: 'B-201', memberCount: 35, totalSaved: 28400, activeDealsCount: 4, description: 'Farm fresh fruits, organic honey and seasonal vegetables.', isMember: false },
  { id: 'bg3', name: 'Tower C Festival Buyers', tower: 'Tower C', block: 'Block 3', leaderName: 'Suresh Menon', leaderFlat: 'C-804', memberCount: 29, totalSaved: 19200, activeDealsCount: 5, description: 'Sweets, puja items and gifting hampers for festivals.', isMember: false },
  { id: 'bg4', name: 'Villas Collective Bulk Hub', tower: 'Villas Row', block: 'Villas', leaderName: 'Kiran Patel', leaderFlat: 'Villa-12', memberCount: 18, totalSaved: 22500, activeDealsCount: 3, description: 'Household cleaning, dairy and bulk staples.', isMember: false },
];

export type { GroupDealDto, GroupOrderDto, DemandRequest, MonthlyBasket, CommunitySavings, BuyAgainSuggestion, BuyingGroup, CommunityAIQueryResponse };
