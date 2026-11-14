/**
 * Mana Fresh Wellness – Nutrition Subscription Mobile Types
 */

export type WellnessPlanType = 'BASIC' | 'PREMIUM';
export type PortionSize = 'SMALL' | 'STANDARD' | 'LARGE';

export type WellnessGoalType =
  | 'WEIGHT_LOSS'
  | 'MUSCLE_GAIN'
  | 'DIABETIC_FRIENDLY'
  | 'HEART_HEALTH'
  | 'GENERAL_WELLNESS'
  | 'KIDS_NUTRITION';

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ClusterStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface WellnessPlan {
  planType: WellnessPlanType;
  displayName: string;
  description: string;
  pricePerMonth: number;
  pricePerDelivery: number;
  deliveriesPerMonth: number;
  includedFeatures: string[];
  boxContentsSummary: string[];
}

export interface WellnessNutrition {
  id?: number;
  productId: number;
  productName: string;
  category: string;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  sugarG?: number;
  fatG: number;
  saturatedFatG?: number;
  fibreG?: number;
  sodiumMg?: number;
  glycemicIndex?: number;
  perServingG: number;
  goalTags: string[];
  allergenFlags: string[];
}

export interface WellnessMenuDay {
  deliveryDate: string; // YYYY-MM-DD
  dayOfWeekName: string;
  dayOfWeek: number;
  planType: WellnessPlanType;
  products: WellnessNutrition[];
  alternativeProducts: WellnessNutrition[];
  totalEnergyKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFibreG: number;
  dietitianNotes: string;
  isSwapped: boolean;
  activeSwapId?: number;
  activeSwapStatus?: SwapStatus;
}

export interface WellnessMenuWeek {
  cycleWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  planType: WellnessPlanType;
  days: WellnessMenuDay[];
  isSwapWindowOpen: boolean;
  swapWindowCloseMessage: string;
}

export interface WellnessSubscriber {
  id: number;
  userId: number;
  planType: WellnessPlanType;
  portionSize: PortionSize;
  goalType?: WellnessGoalType;
  dislikedIngredients: string[];
  extraNotes?: string;
  subscriptionStatus: SubscriptionStatus;
  pauseFrom?: string;
  pauseUntil?: string;
  cashfreeSubscriptionId?: string;
  clusterId?: number;
  clusterSocietyName?: string;
  clusterStatus?: ClusterStatus;
  clusterCurrentSubscribers: number;
  clusterActivationThreshold: number;
  createdAt: string;
}

export interface WellnessCluster {
  id: number;
  societyName: string;
  block?: string;
  city: string;
  status: ClusterStatus;
  currentSubscriberCount: number;
  activationThreshold: number;
  maxCapacity: number;
  deliveryStartTime: string;
  deliveryEndTime: string;
  isActivated: boolean;
  subscribersNeededForActivation: number;
}

export interface WellnessSubscribeRequest {
  planType: WellnessPlanType;
  portionSize: PortionSize;
  goalType?: WellnessGoalType;
  dislikedIngredients: string[];
  extraNotes?: string;
  societyName?: string;
  block?: string;
  flatNo?: string;
}

export interface WellnessSwapRequest {
  deliveryDate: string;
  originalProductId: number;
  requestedProductId: number;
  reason?: string;
}

export interface WellnessSwap {
  id: number;
  subscriberPreferenceId: number;
  userId: number;
  deliveryDate: string;
  originalProductId: number;
  originalProductName: string;
  requestedProductId: number;
  requestedProductName: string;
  status: SwapStatus;
  rejectionReason?: string;
  requestedAt: string;
  resolvedAt?: string;
}

export interface WellnessPauseRequest {
  pauseFrom: string;
  pauseUntil: string;
  reason?: string;
}
