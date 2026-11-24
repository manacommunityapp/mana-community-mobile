import { apiClient } from './apiClient';
import type {
  FreshFoodProduct,
  FreshFoodProductCategory,
  BreakfastCombo,
  BreakfastComboSelection,
  DailyBasket,
  DailyBasketItem,
  CreateDailyBasketItemRequest,
  UpdateDailyBasketItemRequest,
  VacationPauseRequest,
  DeliveryPassDto,
  HandoverVerifyRequest,
} from '@/types/freshKitchen';

export const SEED_FRESH_PRODUCTS: FreshFoodProduct[] = [
  {
    id: 'prod-std-idli-1',
    name: 'Classic Malgudi Idli Batter',
    slug: 'classic-malgudi-idli-batter',
    description: 'Naturally stone-ground using aged urad dal and parboiled rice. Fermented for 14 hours for ultra fluffy, pillowy idlis.',
    category: 'STANDARD_BATTER',
    price: 85,
    mrp: 100,
    discountPercentage: 15,
    unit: '1 kg (Makes 20-22 Idlis)',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    shelfLifeHours: 72,
    storageTempMin: 2,
    storageTempMax: 4,
    storageInstructions: 'Store at 2-4°C immediately upon receipt. Do not freeze.',
    ingredients: ['Parboiled Rice (65%)', 'Guntur Urad Dal (30%)', 'Fenugreek Seeds (3%)', 'RO Water', 'Salt'],
    dietaryFlags: ['VEG', 'VEGAN', 'GLUTEN_FREE'],
    inStock: true,
    availableStock: 24,
    isSoldOut: false,
    vendorId: 'v-kitchen-01',
    vendorName: 'Sri Krishna Home Batters',
    rating: 4.89,
    totalReviews: 342,
    preparationBatchId: 'BAT-2026-031',
    fssaiNumber: '11521018000452',
    tags: ['Bestseller', 'Preservative Free'],
    isFeatured: true,
    leadTimeHours: 10,
    fermentationHours: 14,
  },
  {
    id: 'prod-crisp-dosa-2',
    name: 'Golden Roast Crispy Dosa Batter',
    slug: 'golden-roast-crispy-dosa-batter',
    description: 'Special blend infused with chana dal and poha for restaurant-style mahogany red, shatteringly crispy dosas.',
    category: 'STANDARD_BATTER',
    price: 90,
    mrp: 110,
    discountPercentage: 18,
    unit: '1 kg (Makes 15-18 Dosas)',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    shelfLifeHours: 72,
    storageTempMin: 2,
    storageTempMax: 4,
    storageInstructions: 'Store at 2-4°C.',
    ingredients: ['Sona Masoori Rice (60%)', 'Urad Gota (25%)', 'Bengal Gram (10%)', 'Poha', 'Methi'],
    dietaryFlags: ['VEG', 'VEGAN', 'GLUTEN_FREE'],
    inStock: true,
    availableStock: 18,
    isSoldOut: false,
    vendorId: 'v-kitchen-01',
    vendorName: 'Sri Krishna Home Batters',
    rating: 4.92,
    totalReviews: 512,
    preparationBatchId: 'BAT-2026-032',
    fssaiNumber: '11521018000452',
    tags: ['Chef Special', 'Extra Crispy'],
    isFeatured: true,
    leadTimeHours: 10,
    fermentationHours: 12,
  },
  {
    id: 'prod-millet-ragi-3',
    name: 'Organic Sprouted Ragi Millet Batter',
    slug: 'sprouted-ragi-millet-batter',
    description: 'High-calcium organic finger millet (ragi) batter blended with black gram for sustained energy release.',
    category: 'MILLET_BATTER',
    price: 115,
    mrp: 140,
    discountPercentage: 17,
    unit: '900g (Makes 14 Dosas)',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    shelfLifeHours: 48,
    storageTempMin: 2,
    storageTempMax: 4,
    storageInstructions: 'Keep refrigerated between 2°C - 4°C.',
    ingredients: ['Sprouted Organic Ragi (55%)', 'Whole Black Gram (35%)', 'Fenugreek', 'Rock Salt'],
    dietaryFlags: ['VEG', 'VEGAN', 'GLUTEN_FREE', 'DIABETIC_FRIENDLY', 'ORGANIC'],
    inStock: true,
    availableStock: 12,
    isSoldOut: false,
    vendorId: 'v-kitchen-02',
    vendorName: 'Millet Mandi Co-op',
    rating: 4.76,
    totalReviews: 189,
    preparationBatchId: 'BAT-2026-035',
    fssaiNumber: '11522020000199',
    tags: ['High Fiber', 'Low GI'],
    isFeatured: true,
    leadTimeHours: 12,
    fermentationHours: 16,
  },
  {
    id: 'prod-chutney-coco-5',
    name: 'Homestyle Fresh Coconut Chutney',
    slug: 'homestyle-coconut-chutney',
    description: 'Freshly grated coconut tempered with curry leaves, mustard seeds, and ginger. Ground daily at 4:30 AM.',
    category: 'CHUTNEY_PODI',
    price: 45,
    mrp: 55,
    discountPercentage: 18,
    unit: '250g Container',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    shelfLifeHours: 36,
    storageTempMin: 2,
    storageTempMax: 4,
    storageInstructions: 'Consume within 36 hours. Keep chilled.',
    ingredients: ['Fresh Coconut (70%)', 'Roasted Gram (15%)', 'Green Chillies', 'Curry Leaves', 'Cold Pressed Groundnut Oil'],
    dietaryFlags: ['VEG', 'VEGAN', 'GLUTEN_FREE', 'JAIN'],
    inStock: true,
    availableStock: 30,
    isSoldOut: false,
    vendorId: 'v-kitchen-01',
    vendorName: 'Sri Krishna Home Batters',
    rating: 4.95,
    totalReviews: 420,
    preparationBatchId: 'CHT-2026-041',
    fssaiNumber: '11521018000452',
    tags: ['Fresh Daily', 'No Added Onion/Garlic'],
    isFeatured: true,
    leadTimeHours: 6,
  },
];

export const SEED_BREAKFAST_COMBOS: BreakfastCombo[] = [
  {
    id: 'combo-idli-feast',
    name: 'South Indian Sunrise Breakfast Kit',
    description: '1kg Pillowy Idli Batter + 250g Homestyle Coconut Chutney + 500ml Ready-to-Warm Madras Sambar.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    basePrice: 195,
    discountPercentage: 20,
    finalPrice: 155,
    servings: 'Serves 3-4 Persons',
    servingsCount: 4,
    mainProduct: SEED_FRESH_PRODUCTS[0],
    mainProductId: SEED_FRESH_PRODUCTS[0].id,
    mandatoryChutneyOptions: [SEED_FRESH_PRODUCTS[3]],
    optionalAddons: [
      {
        id: 'addon-ghee-1',
        name: 'Pure Desi A2 Cow Ghee Mini (50ml)',
        quantity: 1,
        price: 45,
        isMandatory: false,
        category: 'EXTRA',
        description: 'Bilona churned aromatic ghee',
      },
    ],
    isActive: true,
    vendorId: 'v-kitchen-01',
    vendorName: 'Sri Krishna Home Batters',
    rating: 4.93,
    totalReviews: 284,
    tags: ['Complete Meal', 'Save ₹40'],
    prepTimeMinutes: 15,
  },
];

export const freshKitchenService = {
  getProducts: async (category?: FreshFoodProductCategory): Promise<FreshFoodProduct[]> => {
    try {
      const endpoint = category && category !== 'ALL'
        ? `/fresh-kitchen/products?category=${category}`
        : '/fresh-kitchen/products';
      const response = await apiClient.get(endpoint);
      const data = (response.data as any)?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          ...item,
          id: String(item.productId || item.id),
          price: Number(item.unitPrice || item.price || 0),
          mrp: Math.round(Number(item.unitPrice || item.price || 0) * 1.2),
          inStock: !item.isSoldOut,
          shelfLifeHours: item.shelfLifeHours || 48,
          storageTempMin: item.storageTempMin || 2,
          storageTempMax: item.storageTempMax || 4,
        }));
      }
      return filterSeedProducts(category);
    } catch {
      return filterSeedProducts(category);
    }
  },

  getProductById: async (id: string): Promise<FreshFoodProduct> => {
    try {
      const response = await apiClient.get(`/fresh-kitchen/products/${id}`);
      return (response.data as any)?.data || response.data;
    } catch {
      const match = SEED_FRESH_PRODUCTS.find((p) => p.id === id);
      if (match) return match;
      throw new Error(`Product not found: ${id}`);
    }
  },

  getBreakfastCombos: async (): Promise<BreakfastCombo[]> => {
    try {
      const response = await apiClient.get('/fresh-kitchen/combos');
      const data = (response.data as any)?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return SEED_BREAKFAST_COMBOS;
    } catch {
      return SEED_BREAKFAST_COMBOS;
    }
  },

  getDailyBasket: async (): Promise<DailyBasket> => {
    try {
      const response = await apiClient.get('/daily-basket');
      return (response.data as any)?.data || response.data;
    } catch {
      return {
        id: 'basket-user-default',
        userId: 'current-user',
        communityId: 1,
        flatNumber: 'Tower A - 402',
        deliveryAddress: 'Tower A, Flat 402, Mana Residency',
        deliveryInstructions: 'Leave in cool bag outside door before 6:30 AM',
        executionMode: 'AUTO_ORDER',
        isVacationPaused: false,
        items: [
          {
            id: 'item-1',
            productId: SEED_FRESH_PRODUCTS[0].id,
            product: SEED_FRESH_PRODUCTS[0],
            itemName: SEED_FRESH_PRODUCTS[0].name,
            itemCategory: 'STANDARD_BATTER',
            unitPrice: SEED_FRESH_PRODUCTS[0].price,
            quantity: 1,
            scheduledDays: ['MON', 'WED', 'FRI'],
            isPaused: false,
          },
        ],
        preferredDeliveryTime: '06:00 AM - 06:45 AM',
        totalDailyEstimate: 85,
        totalWeeklyEstimate: 255,
        monthlyProjection: 1020,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  addItemToDailyBasket: async (request: CreateDailyBasketItemRequest): Promise<DailyBasketItem> => {
    try {
      const response = await apiClient.post('/daily-basket/items', request);
      return (response.data as any)?.data || response.data;
    } catch {
      return {
        id: 'item-' + Date.now(),
        productId: request.productId || 'custom-prod',
        itemName: request.itemName,
        itemCategory: request.itemCategory,
        unitPrice: request.unitPrice,
        quantity: request.quantity,
        scheduledDays: request.scheduledDays,
        isPaused: false,
        specialInstructions: request.specialInstructions,
      };
    }
  },

  updateDailyBasketItem: async (itemId: string, request: UpdateDailyBasketItemRequest): Promise<DailyBasketItem> => {
    try {
      const response = await apiClient.put(`/daily-basket/items/${itemId}`, request);
      return (response.data as any)?.data || response.data;
    } catch {
      return {
        id: itemId,
        productId: 'item-updated',
        itemName: 'Updated Item',
        itemCategory: 'BATTER',
        unitPrice: 85,
        quantity: request.quantity || 1,
        scheduledDays: request.scheduledDays || ['MON', 'WED', 'FRI'],
        isPaused: request.isPaused ?? false,
      };
    }
  },

  deleteDailyBasketItem: async (itemId: string): Promise<void> => {
    try {
      await apiClient.delete(`/daily-basket/items/${itemId}`);
    } catch {
      // offline fallback
    }
  },

  pauseDailyBasket: async (request: VacationPauseRequest): Promise<DailyBasket> => {
    try {
      const response = await apiClient.post('/daily-basket/pause', {
        pauseStartDate: request.vacationStartDate,
        pauseEndDate: request.vacationEndDate,
      });
      return (response.data as any)?.data || response.data;
    } catch {
      const basket = await freshKitchenService.getDailyBasket();
      return {
        ...basket,
        isVacationPaused: true,
        vacationStartDate: request.vacationStartDate,
        vacationEndDate: request.vacationEndDate,
      };
    }
  },

  resumeDailyBasket: async (): Promise<DailyBasket> => {
    try {
      const response = await apiClient.post('/daily-basket/resume', {});
      return (response.data as any)?.data || response.data;
    } catch {
      const basket = await freshKitchenService.getDailyBasket();
      return {
        ...basket,
        isVacationPaused: false,
        vacationStartDate: undefined,
        vacationEndDate: undefined,
      };
    }
  },

  getTodayDeliveryPass: async (): Promise<DeliveryPassDto | null> => {
    try {
      const response = await apiClient.get('/daily-basket/today-pass');
      const payload = (response.data as any)?.data || response.data;
      return payload || null;
    } catch {
      // Mock seed pass for offline preview if needed
      return {
        orderId: 9021,
        orderNumber: 'ORD-BAS-TODAY-01',
        buyerName: 'Resident Pass',
        deliveryAddress: 'Flat 402, Tower B, Mana Community',
        deliverySlot: '06:00 AM - 07:30 AM',
        estimatedDeliveryDate: new Date().toISOString().split('T')[0],
        status: 'CONFIRMED',
        handoverOtp: '481923',
        qrToken: 'MANA-BASKET-PASS-9021-SECURE',
        totalAmount: 175,
        paymentStatus: 'PAID',
        paymentMethod: 'COMMERCE_WALLET',
        isEscrowLocked: true,
        items: [
          {
            productId: 'prod-std-idli-1',
            productName: 'Classic Malgudi Idli Batter (1 kg)',
            quantity: 1,
            unitPrice: 85,
            totalPrice: 85,
          },
          {
            productId: 'prod-chutney-coconut-5',
            productName: 'Tadkewali Coconut Chutney (250g)',
            quantity: 2,
            unitPrice: 45,
            totalPrice: 90,
          },
        ],
      };
    }
  },

  lookupDeliveryOrder: async (tokenOrNumber: string): Promise<DeliveryPassDto> => {
    const response = await apiClient.get('/daily-basket/orders/lookup', {
      params: { tokenOrNumber },
    });
    return (response.data as any)?.data || response.data;
  },

  verifyDeliveryHandover: async (request: HandoverVerifyRequest): Promise<DeliveryPassDto> => {
    const response = await apiClient.post('/daily-basket/handover/verify', request);
    return (response.data as any)?.data || response.data;
  },
};

function filterSeedProducts(category?: FreshFoodProductCategory): FreshFoodProduct[] {
  if (!category || category === 'ALL') {
    return SEED_FRESH_PRODUCTS;
  }
  return SEED_FRESH_PRODUCTS.filter((p) => p.category === category);
}
