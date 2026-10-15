// ─────────────────────────────────────────────────────────────
// MANA HEALTH BUDDY — Wellness, Nutrition & Fitness Types
// ─────────────────────────────────────────────────────────────

export type GoalType = "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN" | "MUSCLE_GAIN" | "GENERAL_WELLNESS";
export type ActivityLevel = "SEDENTARY" | "LIGHTLY_ACTIVE" | "MODERATELY_ACTIVE" | "VERY_ACTIVE" | "EXTRA_ACTIVE";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type MealSourceType = "AI_PHOTO" | "AI_TEXT" | "AI_VOICE" | "MANUAL" | "FOOD_DATABASE";
export type ChallengeType = "WALKING" | "HYDRATION" | "NUTRITION" | "FITNESS" | "YOGA" | "CUSTOM";
export type ChallengeStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type SharingPreference = "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
export type ConsentType = "ACCOUNTABILITY_PARTNER" | "CHALLENGE_PROGRESS" | "WELLNESS_REPORTS";
export type CoachingStyle = "GENTLE" | "MOTIVATIONAL" | "STRICT" | "DATA_FOCUSED";
export type ProviderType = "DIETITIAN" | "NUTRITIONIST" | "PERSONAL_TRAINER" | "YOGA_INSTRUCTOR" | "GYM";

export interface WellnessProfileDto {
  id: string;
  memberId: string;
  communityId: string;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  coachingStyle: CoachingStyle;
  currentWeight?: number;
  targetWeight?: number;
  heightCm?: number;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dietaryPreferences?: string[];
  allergies?: string[];
  visibility: SharingPreference;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionGoalDto {
  id: string;
  memberId: string;
  effectiveDate: string;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;
  fiberTarget?: number;
}

export interface FoodItemDto {
  id: string;
  name: string;
  regionalName?: string;
  servingSize: string;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source: "VERIFIED_DB" | "AI_ESTIMATED" | "USER_ADDED";
  isIndian?: boolean;
  category?: string;
}

export interface MealItemDto {
  id: string;
  foodId?: string;
  name: string;
  quantity: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  confidence: number;
  source: MealSourceType;
}

export interface MealLogDto {
  id: string;
  memberId: string;
  mealType: MealType;
  mealTime: string;
  items: MealItemDto[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string;
  notes?: string;
  aiConversation?: string;
  status: "DRAFT" | "CONFIRMED";
  createdAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  waterIntakeMl: number;
  mealsLogged: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;
}

export interface WeeklyTrend {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWater: number;
  daysLogged: number;
  bestDay: string;
  streakDays: number;
}

export interface WellnessChallengeDto {
  id: string;
  communityId: string;
  title: string;
  description: string;
  challengeType: ChallengeType;
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  targetValue: number;
  targetUnit: string;
  participantCount: number;
  maxParticipants?: number;
  createdBy: string;
  rules?: string;
  badges?: ChallengeBadgeDto[];
  coverImageUrl?: string;
  isJoined?: boolean;
}

export interface ChallengeParticipantDto {
  id: string;
  challengeId: string;
  memberId: string;
  memberName: string;
  joinedAt: string;
  currentProgress: number;
  sharingPreference: SharingPreference;
  rank?: number;
}

export interface ChallengeBadgeDto {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  earned?: boolean;
  earnedAt?: string;
}

export interface AccountabilityPartnerDto {
  id: string;
  memberId: string;
  partnerName: string;
  partnerContact: string;
  consentStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";
  sharedMetrics: ConsentType[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface WellnessProviderDto {
  id: string;
  name: string;
  providerType: ProviderType;
  specialization?: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  available: boolean;
  verified: boolean;
  languages: string[];
  location: string;
  distanceKm?: number;
  about?: string;
  nextAvailableSlot?: string;
}

export interface AiMealAnalysisRequest {
  imageBase64?: string;
  textDescription?: string;
  mealType: MealType;
}

export interface AiMealAnalysisResponse {
  items: MealItemDto[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidence: number;
  followUpQuestions?: string[];
  notes?: string;
}

export interface WaterLogDto {
  id: string;
  memberId: string;
  amountMl: number;
  loggedAt: string;
}

export interface WellnessReminderDto {
  id: string;
  memberId: string;
  type: "MEAL_LOG" | "WATER" | "EXERCISE" | "WEIGH_IN" | "CHALLENGE";
  time: string;
  enabled: boolean;
  message?: string;
}
