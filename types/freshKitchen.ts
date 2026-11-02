/**
 * Mana Fresh Kitchen & My Daily Basket Core Types for Mobile
 */

export type FreshFoodProductCategory =
  | 'ALL'
  | 'STANDARD_BATTER'
  | 'SPECIALTY_BATTER'
  | 'MILLET_BATTER'
  | 'CHUTNEY_PODI'
  | 'BREAKFAST_KIT';

export type DietaryFlag =
  | 'VEG'
  | 'VEGAN'
  | 'JAIN'
  | 'GLUTEN_FREE'
  | 'HIGH_PROTEIN'
  | 'DIABETIC_FRIENDLY'
  | 'ORGANIC';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type BasketExecutionMode = 'AUTO_ORDER' | 'DAILY_APPROVAL';

export type DailyBasketStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type ComboItemCategory = 'BATTER' | 'CHUTNEY' | 'EXTRA' | 'BEVERAGE' | 'SAMBAR';

export type BatchQaStatus = 'PENDING' | 'PASSED' | 'REJECTED' | 'CONDITIONAL';

export interface FreshNutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sodium?: number;
}

export interface FreshFoodProduct {
  id: string;
  name: string;
  slug?: string;
  description: string;
  category: FreshFoodProductCategory;
  subCategory?: string;
  price: number;
  mrp: number;
  discountPercentage?: number;
  unit: string;
  imageUrl?: string;
  shelfLifeHours: number;
  storageTempMin: number;
  storageTempMax: number;
  storageInstructions: string;
  ingredients: string[];
  dietaryFlags: DietaryFlag[];
  inStock: boolean;
  availableStock: number;
  isSoldOut: boolean;
  vendorId: string;
  vendorName: string;
  rating: number;
  totalReviews: number;
  preparationBatchId?: string;
  fssaiNumber?: string;
  nutritionalInfo?: FreshNutritionalInfo;
  tags?: string[];
  isFeatured?: boolean;
  leadTimeHours?: number;
  fermentationHours?: number;
}

export interface BreakfastComboItem {
  id: string;
  name: string;
  productId?: string;
  product?: FreshFoodProduct;
  quantity: number;
  price: number;
  unit?: string;
  isMandatory: boolean;
  category: ComboItemCategory;
  description?: string;
}

export interface BreakfastCombo {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  basePrice: number;
  discountPercentage: number;
  finalPrice: number;
  servings: string;
  servingsCount: number;
  mainProduct: FreshFoodProduct;
  mainProductId?: string;
  mandatoryChutneyOptions: FreshFoodProduct[];
  optionalAddons: BreakfastComboItem[];
  isActive: boolean;
  vendorId: string;
  vendorName: string;
  rating: number;
  totalReviews?: number;
  tags?: string[];
  prepTimeMinutes?: number;
}

export interface BreakfastComboSelection {
  comboId: string;
  mainProductId: string;
  selectedChutneyId: string;
  selectedAddonIds: string[];
  quantity: number;
  servingsMultiplier?: number;
  customNotes?: string;
  computedTotalPrice: number;
  scheduledDays?: DayOfWeek[];
}

export interface DailyBasketItem {
  id: string;
  basketId?: string;
  productId: string;
  product?: FreshFoodProduct;
  comboId?: string;
  combo?: BreakfastCombo;
  itemName: string;
  itemCategory: string;
  unitPrice: number;
  quantity: number;
  scheduledDays: DayOfWeek[];
  isPaused: boolean;
  specialInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyBasket {
  id: string;
  userId: string;
  communityId: string | number;
  flatNumber: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  executionMode: BasketExecutionMode;
  isVacationPaused: boolean;
  vacationStartDate?: string;
  vacationEndDate?: string;
  items: DailyBasketItem[];
  preferredDeliveryTime: string;
  totalDailyEstimate: number;
  totalWeeklyEstimate: number;
  monthlyProjection: number;
  status: DailyBasketStatus;
  lastOrderTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyBasketItemRequest {
  productId?: string;
  comboId?: string;
  itemName: string;
  itemCategory: string;
  unitPrice: number;
  quantity: number;
  scheduledDays: DayOfWeek[];
  specialInstructions?: string;
}

export interface UpdateDailyBasketItemRequest {
  quantity?: number;
  scheduledDays?: DayOfWeek[];
  isPaused?: boolean;
  specialInstructions?: string;
}

export interface VacationPauseRequest {
  isVacationPaused: boolean;
  vacationStartDate?: string;
  vacationEndDate?: string;
}
