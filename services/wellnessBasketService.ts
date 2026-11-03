import { apiClient } from './apiClient';
import type {
  WellnessPlan,
  WellnessSubscriber,
  WellnessSubscribeRequest,
  WellnessPauseRequest,
  WellnessMenuWeek,
  WellnessSwapRequest,
  WellnessSwap,
  WellnessCluster,
} from '@/types/wellnessBasket';

export const SEED_WELLNESS_PLANS: WellnessPlan[] = [
  {
    planType: 'BASIC',
    displayName: 'Basic Wellness Box',
    description: 'Daily portion-controlled whole-food breakfast kit with seasonal fruits and ancient millets.',
    pricePerMonth: 1999,
    pricePerDelivery: 77,
    deliveriesPerMonth: 26,
    includedFeatures: [
      '2 Seasonal Fruit portions',
      '1 Ancient Millet / Grain breakfast kit',
      '1 Fresh-cut Micro-Salad portion',
      'Dietitian-reviewed 4-week rotation',
      'Doorstep delivery before 8:00 AM (Mon–Sat)',
    ],
    boxContentsSummary: ['Seasonal Fruits', 'Millet Kit', 'Greens Bowl'],
  },
  {
    planType: 'PREMIUM',
    displayName: 'Premium Wellness Box',
    description: 'High-protein, superfood-enriched daily kit with personalised macro targets and automated allergy protection.',
    pricePerMonth: 2799,
    pricePerDelivery: 108,
    deliveriesPerMonth: 26,
    includedFeatures: [
      '2 Seasonal & Exotic Fruit portions',
      '1 High-Protein / Steamed Sprout portion',
      '1 Ancient Grain / Low-GI breakfast portion',
      '1 Fresh-cut salad with dressing',
      '1 Superfood Add-on (Chia/Flax/Walnuts)',
      'Automated allergy substitution guarantee',
      'Priority doorstep delivery before 8:00 AM (Mon–Sat)',
    ],
    boxContentsSummary: ['Exotic Fruits', 'Sprout/Protein Bowl', 'Millet Kit', 'Salad', 'Superfood Mix'],
  },
];

export const SEED_CLUSTERS: WellnessCluster[] = [
  {
    id: 1,
    societyName: 'Mana Premiere Residences',
    block: 'Towers A-E',
    city: 'Hyderabad',
    status: 'ACTIVE',
    currentSubscriberCount: 18,
    activationThreshold: 15,
    maxCapacity: 80,
    deliveryStartTime: '06:00:00',
    deliveryEndTime: '08:00:00',
    isActivated: true,
    subscribersNeededForActivation: 0,
  },
  {
    id: 2,
    societyName: 'Aparna Sarovar Grande',
    block: 'Blocks 1-8',
    city: 'Hyderabad',
    status: 'PENDING',
    currentSubscriberCount: 12,
    activationThreshold: 15,
    maxCapacity: 80,
    deliveryStartTime: '06:00:00',
    deliveryEndTime: '08:00:00',
    isActivated: false,
    subscribersNeededForActivation: 3,
  },
];

export const SEED_SUBSCRIBER: WellnessSubscriber = {
  id: 101,
  userId: 1,
  planType: 'PREMIUM',
  portionSize: 'STANDARD',
  goalType: 'WEIGHT_LOSS',
  dislikedIngredients: ['Papaya'],
  extraNotes: 'Deliver before 7:30 AM please.',
  subscriptionStatus: 'ACTIVE',
  cashfreeSubscriptionId: 'CF-SUB-MOB-1102',
  clusterId: 1,
  clusterSocietyName: 'Mana Premiere Residences',
  clusterStatus: 'ACTIVE',
  clusterCurrentSubscribers: 18,
  clusterActivationThreshold: 15,
  createdAt: '2026-11-01T08:00:00Z',
};

export const SEED_WEEK_MENU: WellnessMenuWeek = {
  cycleWeek: 2,
  weekStartDate: '2026-11-03',
  weekEndDate: '2026-11-08',
  planType: 'PREMIUM',
  isSwapWindowOpen: true,
  swapWindowCloseMessage: 'Weekly Swap Window is OPEN! Customize next week until Sat 8 PM.',
  days: [
    {
      deliveryDate: '2026-11-03',
      dayOfWeekName: 'Monday',
      dayOfWeek: 1,
      planType: 'PREMIUM',
      totalEnergyKcal: 385,
      totalProteinG: 18.5,
      totalCarbsG: 52.0,
      totalFatG: 9.2,
      totalFibreG: 12.0,
      dietitianNotes: 'High-satiety low-GI morning starter. High bioavailable protein to ignite metabolism.',
      isSwapped: false,
      products: [
        {
          productId: 101,
          productName: 'Golden Kiwi & Pomegranate Bowl',
          category: 'FRUIT_BOWL',
          energyKcal: 110,
          proteinG: 1.8,
          carbsG: 24.5,
          fatG: 0.8,
          fibreG: 4.2,
          perServingG: 150,
          goalTags: ['WEIGHT_LOSS', 'HEART_HEALTH'],
          allergenFlags: [],
        },
        {
          productId: 102,
          productName: 'Steamed Yellow Moong & Microgreen Salad',
          category: 'PROTEIN_SPROUT',
          energyKcal: 165,
          proteinG: 12.5,
          carbsG: 18.0,
          fatG: 4.5,
          fibreG: 5.8,
          perServingG: 120,
          goalTags: ['WEIGHT_LOSS', 'MUSCLE_GAIN'],
          allergenFlags: [],
        },
        {
          productId: 103,
          productName: 'Foxtail Millet & Roasted Flax Porridge Kit',
          category: 'MILLET_GRAIN',
          energyKcal: 110,
          proteinG: 4.2,
          carbsG: 19.5,
          fatG: 3.9,
          fibreG: 2.0,
          perServingG: 100,
          goalTags: ['DIABETIC_FRIENDLY'],
          allergenFlags: [],
        },
      ],
      alternativeProducts: [
        {
          productId: 201,
          productName: 'Spiced Roasted Paneer & Chickpea Cup',
          category: 'PROTEIN_SPROUT',
          energyKcal: 180,
          proteinG: 14.0,
          carbsG: 15.0,
          fatG: 6.5,
          fibreG: 4.0,
          perServingG: 120,
          goalTags: ['MUSCLE_GAIN'],
          allergenFlags: ['DAIRY'],
        },
      ],
    },
    {
      deliveryDate: '2026-11-04',
      dayOfWeekName: 'Tuesday',
      dayOfWeek: 2,
      planType: 'PREMIUM',
      totalEnergyKcal: 410,
      totalProteinG: 20.0,
      totalCarbsG: 48.0,
      totalFatG: 11.5,
      totalFibreG: 10.5,
      dietitianNotes: 'Antioxidant-dense berry boost paired with slow-burning jowar and sprouted legumes.',
      isSwapped: false,
      products: [
        {
          productId: 104,
          productName: 'Mixed Berries & Imported Red Apple',
          category: 'FRUIT_BOWL',
          energyKcal: 120,
          proteinG: 1.5,
          carbsG: 26.0,
          fatG: 0.9,
          fibreG: 4.5,
          perServingG: 150,
          goalTags: ['GENERAL_WELLNESS'],
          allergenFlags: [],
        },
        {
          productId: 105,
          productName: 'Boiled Sprouted Chickpeas with Herbs',
          category: 'PROTEIN_SPROUT',
          energyKcal: 175,
          proteinG: 13.5,
          carbsG: 20.0,
          fatG: 4.2,
          fibreG: 5.0,
          perServingG: 120,
          goalTags: ['MUSCLE_GAIN'],
          allergenFlags: [],
        },
      ],
      alternativeProducts: [],
    },
  ],
};

export const wellnessBasketService = {
  async getPlans(): Promise<WellnessPlan[]> {
    try {
      const res = await apiClient.get<WellnessPlan[]>('/wellness-basket/plans');
      return res.data;
    } catch {
      return SEED_WELLNESS_PLANS;
    }
  },

  async getSubscription(): Promise<WellnessSubscriber> {
    try {
      const res = await apiClient.get<WellnessSubscriber>('/wellness-basket/subscription');
      return res.data;
    } catch {
      return SEED_SUBSCRIBER;
    }
  },

  async subscribe(request: WellnessSubscribeRequest): Promise<WellnessSubscriber> {
    try {
      const res = await apiClient.post<WellnessSubscriber>('/wellness-basket/subscribe', request);
      return res.data;
    } catch {
      return {
        ...SEED_SUBSCRIBER,
        planType: request.planType,
        portionSize: request.portionSize,
        goalType: request.goalType,
        dislikedIngredients: request.dislikedIngredients,
        clusterSocietyName: request.societyName || 'Mana Premiere Residences',
      };
    }
  },

  async pauseSubscription(request: WellnessPauseRequest): Promise<WellnessSubscriber> {
    try {
      const res = await apiClient.post<WellnessSubscriber>('/wellness-basket/subscription/pause', request);
      return res.data;
    } catch {
      return {
        ...SEED_SUBSCRIBER,
        subscriptionStatus: 'PAUSED',
        pauseFrom: request.pauseFrom,
        pauseUntil: request.pauseUntil,
      };
    }
  },

  async resumeSubscription(): Promise<WellnessSubscriber> {
    try {
      const res = await apiClient.post<WellnessSubscriber>('/wellness-basket/subscription/resume');
      return res.data;
    } catch {
      return {
        ...SEED_SUBSCRIBER,
        subscriptionStatus: 'ACTIVE',
        pauseFrom: undefined,
        pauseUntil: undefined,
      };
    }
  },

  async getMenuForWeek(weekStartDate?: string): Promise<WellnessMenuWeek> {
    try {
      const res = await apiClient.get<WellnessMenuWeek>('/wellness-basket/menu/week', {
        params: weekStartDate ? { weekStartDate } : {},
      });
      return res.data;
    } catch {
      return SEED_WEEK_MENU;
    }
  },

  async requestSwap(request: WellnessSwapRequest): Promise<WellnessSwap> {
    try {
      const res = await apiClient.post<WellnessSwap>('/wellness-basket/menu/swap', request);
      return res.data;
    } catch {
      return {
        id: 99,
        subscriberPreferenceId: 101,
        userId: 1,
        deliveryDate: request.deliveryDate,
        originalProductId: request.originalProductId,
        originalProductName: 'Replaced Item',
        requestedProductId: request.requestedProductId,
        requestedProductName: 'Substituted Item',
        status: 'APPROVED',
        requestedAt: new Date().toISOString(),
      };
    }
  },

  async getClusters(): Promise<WellnessCluster[]> {
    try {
      const res = await apiClient.get<WellnessCluster[]>('/wellness-basket/clusters');
      return res.data;
    } catch {
      return SEED_CLUSTERS;
    }
  },
};
