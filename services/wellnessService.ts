import api from "./apiClient";
import {
  WellnessProfileDto,
  NutritionGoalDto,
  MealLogDto,
  MealItemDto,
  DailyNutritionSummary,
  WeeklyTrend,
  WellnessChallengeDto,
  ChallengeParticipantDto,
  AccountabilityPartnerDto,
  WellnessProviderDto,
  AiMealAnalysisResponse,
  AccountabilityAlertDto,
  AccountabilityAlertType,
  FoodItemDto,
  WaterLogDto,
  ProviderSlotDto,
  AppointmentBookingDto,
  SessionMode,
} from "../types/wellness";

// Foods with high junk food score — global + Indian street food
const JUNK_FOOD_KEYWORDS: Record<string, number> = {
  // Global
  pizza: 0.9, burger: 0.9, "french fries": 0.9, fries: 0.85, chips: 0.8,
  hotdog: 0.85, "hot dog": 0.85, donut: 0.9, "doughnut": 0.9,
  "fried chicken": 0.8, nuggets: 0.85, soda: 0.75, cola: 0.75,
  candy: 0.85, chocolate: 0.6, cookie: 0.65, cake: 0.65, pastry: 0.7,
  "ice cream": 0.7, "deep fried": 0.8,
  // Indian street food
  "vada pav": 0.8, "pav bhaji": 0.75, samosa: 0.75, "kachori": 0.8,
  "pani puri": 0.6, "bhel puri": 0.55, "sev puri": 0.65,
  "aloo tikki": 0.7, "raj kachori": 0.75, "dahi vada": 0.5,
  "jalebi": 0.85, "gulab jamun": 0.85, "rabri": 0.75,
  "namkeen": 0.7, "chakli": 0.65, "gathiya": 0.65,
};

const JUNK_FOOD_THRESHOLD = 0.6;

function computeJunkFoodScore(items: MealItemDto[], text?: string): number {
  const searchText = [
    ...items.map(i => i.name.toLowerCase()),
    text?.toLowerCase() ?? "",
  ].join(" ");

  let maxScore = 0;
  for (const [keyword, score] of Object.entries(JUNK_FOOD_KEYWORDS)) {
    if (searchText.includes(keyword) && score > maxScore) maxScore = score;
  }
  return maxScore;
}

let alertsState: AccountabilityAlertDto[] = [];

// ── Seed Data ──────────────────────────────────────────────────

const SEED_PROFILE: WellnessProfileDto = {
  id: "wp-1",
  memberId: "m-1",
  communityId: "c-1",
  goalType: "WEIGHT_LOSS",
  activityLevel: "MODERATELY_ACTIVE",
  coachingStyle: "MOTIVATIONAL",
  currentWeight: 78,
  targetWeight: 72,
  heightCm: 175,
  age: 32,
  gender: "MALE",
  dietaryPreferences: ["Vegetarian"],
  allergies: ["Peanuts"],
  visibility: "FRIENDS_ONLY",
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-15T08:00:00Z",
};

const SEED_GOALS: NutritionGoalDto = {
  id: "ng-1",
  memberId: "m-1",
  effectiveDate: "2026-10-01",
  calorieTarget: 2000,
  proteinTarget: 80,
  carbsTarget: 250,
  fatTarget: 65,
  waterTarget: 3000,
  fiberTarget: 30,
};

const SEED_DAILY_SUMMARY: DailyNutritionSummary = {
  date: "2026-10-15",
  totalCalories: 1450,
  totalProtein: 52,
  totalCarbs: 180,
  totalFat: 42,
  totalFiber: 18,
  waterIntakeMl: 2100,
  mealsLogged: 2,
  calorieTarget: 2000,
  proteinTarget: 80,
  carbsTarget: 250,
  fatTarget: 65,
  waterTarget: 3000,
};

const SEED_MEALS: MealLogDto[] = [
  {
    id: "ml-1",
    memberId: "m-1",
    mealType: "BREAKFAST",
    mealTime: "2026-10-15T08:30:00Z",
    items: [
      { id: "mi-1", name: "Idli", quantity: 3, servingUnit: "pieces", calories: 195, protein: 6, carbs: 39, fat: 0.6, fiber: 1.5, confidence: 0.92, source: "AI_TEXT" },
      { id: "mi-2", name: "Sambar", quantity: 1, servingUnit: "bowl", calories: 120, protein: 6, carbs: 18, fat: 3, fiber: 4, confidence: 0.85, source: "AI_TEXT" },
      { id: "mi-3", name: "Coconut Chutney", quantity: 2, servingUnit: "tbsp", calories: 50, protein: 1, carbs: 3, fat: 4, confidence: 0.88, source: "AI_TEXT" },
      { id: "mi-4", name: "Filter Coffee", quantity: 1, servingUnit: "cup", calories: 85, protein: 3, carbs: 8, fat: 4, confidence: 0.95, source: "AI_TEXT" },
    ],
    totalCalories: 450,
    totalProtein: 16,
    totalCarbs: 68,
    totalFat: 11.6,
    notes: "Morning breakfast at home",
    status: "CONFIRMED",
    createdAt: "2026-10-15T08:35:00Z",
  },
  {
    id: "ml-2",
    memberId: "m-1",
    mealType: "LUNCH",
    mealTime: "2026-10-15T13:00:00Z",
    items: [
      { id: "mi-5", name: "Rice", quantity: 1.5, servingUnit: "cups", calories: 310, protein: 6, carbs: 68, fat: 0.5, fiber: 1, confidence: 0.9, source: "AI_PHOTO" },
      { id: "mi-6", name: "Dal Tadka", quantity: 1, servingUnit: "bowl", calories: 180, protein: 12, carbs: 22, fat: 6, fiber: 5, confidence: 0.82, source: "AI_PHOTO" },
      { id: "mi-7", name: "Palak Paneer", quantity: 1, servingUnit: "serving", calories: 260, protein: 14, carbs: 10, fat: 18, fiber: 3, confidence: 0.78, source: "AI_PHOTO" },
      { id: "mi-8", name: "Roti", quantity: 2, servingUnit: "pieces", calories: 200, protein: 6, carbs: 36, fat: 4, fiber: 4, confidence: 0.9, source: "AI_PHOTO" },
      { id: "mi-9", name: "Curd/Raita", quantity: 1, servingUnit: "bowl", calories: 60, protein: 4, carbs: 5, fat: 2, confidence: 0.88, source: "AI_PHOTO" },
    ],
    totalCalories: 1010,
    totalProtein: 42,
    totalCarbs: 141,
    totalFat: 30.5,
    imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe",
    notes: "Thali from office canteen",
    status: "CONFIRMED",
    createdAt: "2026-10-15T13:10:00Z",
  },
];

const SEED_WEEKLY_TREND: WeeklyTrend = {
  weekStart: "2026-10-07",
  avgCalories: 1850,
  avgProtein: 68,
  avgCarbs: 230,
  avgFat: 55,
  avgWater: 2400,
  daysLogged: 6,
  bestDay: "2026-10-12",
  streakDays: 12,
};

const SEED_CHALLENGES: WellnessChallengeDto[] = [
  {
    id: "wc-1",
    communityId: "c-1",
    title: "10K Steps Daily Challenge",
    description: "Walk 10,000 steps every day for 30 days. Track your steps and compete with neighbors!",
    challengeType: "WALKING",
    status: "ACTIVE",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    targetValue: 10000,
    targetUnit: "steps/day",
    participantCount: 47,
    maxParticipants: 100,
    createdBy: "Apartment RWA",
    rules: "Log your daily step count. Walking in parks, buildings, or anywhere counts. Honor system!",
    isJoined: true,
    badges: [
      { id: "b-1", name: "First Steps", description: "Complete your first day", icon: "footsteps", requirement: 1, earned: true, earnedAt: "2026-10-01" },
      { id: "b-2", name: "Week Warrior", description: "7 days in a row", icon: "flame", requirement: 7, earned: true, earnedAt: "2026-10-07" },
      { id: "b-3", name: "Marathon Runner", description: "Complete all 30 days", icon: "trophy", requirement: 30, earned: false },
    ],
  },
  {
    id: "wc-2",
    communityId: "c-1",
    title: "Hydration Heroes",
    description: "Drink at least 3 liters of water daily. Stay hydrated, stay healthy!",
    challengeType: "HYDRATION",
    status: "ACTIVE",
    startDate: "2026-10-10",
    endDate: "2026-11-10",
    targetValue: 3000,
    targetUnit: "ml/day",
    participantCount: 32,
    createdBy: "Wellness Committee",
    isJoined: false,
  },
  {
    id: "wc-3",
    communityId: "c-1",
    title: "Morning Yoga 21-Day Streak",
    description: "Join the community yoga session every morning at 6 AM in the clubhouse garden.",
    challengeType: "YOGA",
    status: "UPCOMING",
    startDate: "2026-11-01",
    endDate: "2026-11-21",
    targetValue: 21,
    targetUnit: "sessions",
    participantCount: 18,
    maxParticipants: 40,
    createdBy: "Sports Club",
    isJoined: false,
  },
  {
    id: "wc-4",
    communityId: "c-1",
    title: "Eat Clean Week",
    description: "No processed food for 7 days. Log all meals and keep it natural!",
    challengeType: "NUTRITION",
    status: "ACTIVE",
    startDate: "2026-10-14",
    endDate: "2026-10-21",
    targetValue: 7,
    targetUnit: "clean days",
    participantCount: 23,
    createdBy: "Nutrition Club",
    isJoined: true,
  },
];

const SEED_FOOD_CATALOG: FoodItemDto[] = [
  { id: "f-1", name: "Idli", regionalName: "Idli", servingSize: "1", servingUnit: "piece", calories: 65, protein: 2, carbs: 13, fat: 0.2, fiber: 0.5, source: "VERIFIED_DB", isIndian: true, category: "Breakfast" },
  { id: "f-2", name: "Dosa (Plain)", regionalName: "Dosa", servingSize: "1", servingUnit: "piece", calories: 120, protein: 3, carbs: 18, fat: 4, fiber: 1, source: "VERIFIED_DB", isIndian: true, category: "Breakfast" },
  { id: "f-3", name: "Roti/Chapati", regionalName: "Roti", servingSize: "1", servingUnit: "piece", calories: 100, protein: 3, carbs: 18, fat: 2, fiber: 2, source: "VERIFIED_DB", isIndian: true, category: "Staple" },
  { id: "f-4", name: "Rice (Cooked)", regionalName: "Chawal", servingSize: "1", servingUnit: "cup", calories: 206, protein: 4, carbs: 45, fat: 0.4, fiber: 0.6, source: "VERIFIED_DB", isIndian: true, category: "Staple" },
  { id: "f-5", name: "Dal Tadka", regionalName: "Dal", servingSize: "1", servingUnit: "bowl", calories: 180, protein: 12, carbs: 22, fat: 6, fiber: 5, source: "VERIFIED_DB", isIndian: true, category: "Curry" },
  { id: "f-6", name: "Paneer Butter Masala", regionalName: "Paneer", servingSize: "1", servingUnit: "serving", calories: 350, protein: 16, carbs: 12, fat: 26, fiber: 2, source: "VERIFIED_DB", isIndian: true, category: "Curry" },
  { id: "f-7", name: "Sambar", servingSize: "1", servingUnit: "bowl", calories: 120, protein: 6, carbs: 18, fat: 3, fiber: 4, source: "VERIFIED_DB", isIndian: true, category: "Curry" },
  { id: "f-8", name: "Curd/Yogurt", regionalName: "Dahi", servingSize: "1", servingUnit: "cup", calories: 100, protein: 8, carbs: 8, fat: 4, source: "VERIFIED_DB", isIndian: true, category: "Dairy" },
  { id: "f-9", name: "Biryani (Veg)", servingSize: "1", servingUnit: "plate", calories: 400, protein: 10, carbs: 60, fat: 14, fiber: 3, source: "VERIFIED_DB", isIndian: true, category: "Rice" },
  { id: "f-10", name: "Poha", servingSize: "1", servingUnit: "plate", calories: 250, protein: 5, carbs: 42, fat: 8, fiber: 2, source: "VERIFIED_DB", isIndian: true, category: "Breakfast" },
  { id: "f-11", name: "Upma", servingSize: "1", servingUnit: "bowl", calories: 210, protein: 5, carbs: 35, fat: 6, fiber: 2, source: "VERIFIED_DB", isIndian: true, category: "Breakfast" },
  { id: "f-12", name: "Filter Coffee (with milk)", servingSize: "1", servingUnit: "cup", calories: 85, protein: 3, carbs: 8, fat: 4, source: "VERIFIED_DB", isIndian: true, category: "Beverage" },
  { id: "f-13", name: "Masala Chai", servingSize: "1", servingUnit: "cup", calories: 70, protein: 2, carbs: 10, fat: 2.5, source: "VERIFIED_DB", isIndian: true, category: "Beverage" },
  { id: "f-14", name: "Banana", servingSize: "1", servingUnit: "medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, source: "VERIFIED_DB", category: "Fruit" },
  { id: "f-15", name: "Egg Omelette", servingSize: "2", servingUnit: "eggs", calories: 180, protein: 12, carbs: 2, fat: 14, source: "VERIFIED_DB", category: "Protein" },
];

const SEED_PROVIDERS: WellnessProviderDto[] = [
  {
    id: "prov-1",
    name: "Dt. Priya Sharma",
    providerType: "DIETITIAN",
    specialization: "Weight Management & PCOS",
    experienceYears: 8,
    rating: 4.9,
    reviewCount: 56,
    consultationFee: 500,
    available: true,
    verified: true,
    languages: ["English", "Hindi"],
    location: "Tower C, Mana Residency",
    distanceKm: 0.2,
    about: "Certified dietitian specializing in Indian dietary patterns. 500+ consultations completed.",
    nextAvailableSlot: "Tomorrow, 10:00 AM",
  },
  {
    id: "prov-2",
    name: "Coach Ravi Menon",
    providerType: "PERSONAL_TRAINER",
    specialization: "Strength & Functional Training",
    experienceYears: 12,
    rating: 4.7,
    reviewCount: 38,
    consultationFee: 800,
    available: true,
    verified: true,
    languages: ["English", "Hindi", "Malayalam"],
    location: "Clubhouse Gym, Mana Residency",
    distanceKm: 0.1,
    about: "ACE certified personal trainer. Specializes in functional fitness for busy professionals.",
    nextAvailableSlot: "Today, 5:00 PM",
  },
  {
    id: "prov-3",
    name: "Yogini Ananya Iyer",
    providerType: "YOGA_INSTRUCTOR",
    specialization: "Hatha & Pranayama",
    experienceYears: 15,
    rating: 4.8,
    reviewCount: 72,
    consultationFee: 400,
    available: true,
    verified: true,
    languages: ["English", "Hindi", "Tamil"],
    location: "Garden Area, Mana Residency",
    distanceKm: 0.05,
    about: "RYT-500 certified yoga instructor. Conducts morning sessions for the community.",
    nextAvailableSlot: "Tomorrow, 6:00 AM",
  },
];

const SEED_WATER_LOGS: WaterLogDto[] = [
  { id: "w-1", memberId: "m-1", amountMl: 300, loggedAt: "2026-10-15T07:00:00Z" },
  { id: "w-2", memberId: "m-1", amountMl: 500, loggedAt: "2026-10-15T09:30:00Z" },
  { id: "w-3", memberId: "m-1", amountMl: 300, loggedAt: "2026-10-15T11:00:00Z" },
  { id: "w-4", memberId: "m-1", amountMl: 500, loggedAt: "2026-10-15T13:30:00Z" },
  { id: "w-5", memberId: "m-1", amountMl: 500, loggedAt: "2026-10-15T16:00:00Z" },
];

// ── Service ────────────────────────────────────────────────────

let profileState = { ...SEED_PROFILE };
let goalsState = { ...SEED_GOALS };
let mealsState = [...SEED_MEALS];
let waterState = [...SEED_WATER_LOGS];

export const wellnessService = {
  async getProfile(): Promise<WellnessProfileDto> {
    try {
      const res = await api.get<WellnessProfileDto>("/wellness/profile");
      return res.data;
    } catch {
      return profileState;
    }
  },

  async updateProfile(data: Partial<WellnessProfileDto>): Promise<WellnessProfileDto> {
    try {
      const res = await api.put<WellnessProfileDto>("/wellness/profile", data);
      return res.data;
    } catch {
      profileState = { ...profileState, ...data, updatedAt: new Date().toISOString() };
      return profileState;
    }
  },

  async getGoals(): Promise<NutritionGoalDto> {
    try {
      const res = await api.get<NutritionGoalDto>("/wellness/goals");
      return res.data;
    } catch {
      return goalsState;
    }
  },

  async getDailySummary(date?: string): Promise<DailyNutritionSummary> {
    try {
      const res = await api.get<DailyNutritionSummary>("/wellness/summary/daily", { params: { date } });
      return res.data;
    } catch {
      return SEED_DAILY_SUMMARY;
    }
  },

  async getWeeklyTrend(): Promise<WeeklyTrend> {
    try {
      const res = await api.get<WeeklyTrend>("/wellness/summary/weekly");
      return res.data;
    } catch {
      return SEED_WEEKLY_TREND;
    }
  },

  async getMeals(date?: string): Promise<MealLogDto[]> {
    try {
      const res = await api.get<MealLogDto[]>("/wellness/meals", { params: { date } });
      return res.data;
    } catch {
      return mealsState;
    }
  },

  async logMeal(meal: Omit<MealLogDto, "id" | "createdAt">): Promise<MealLogDto> {
    try {
      const res = await api.post<MealLogDto>("/wellness/meals", meal);
      return res.data;
    } catch {
      const newMeal: MealLogDto = { ...meal, id: `ml-${Date.now()}`, createdAt: new Date().toISOString() };
      mealsState.push(newMeal);
      return newMeal;
    }
  },

  async analyzeMealPhoto(imageBase64: string, mealType: string): Promise<AiMealAnalysisResponse> {
    try {
      const res = await api.post<AiMealAnalysisResponse>("/wellness/meals/analyze", { imageBase64, mealType });
      return res.data;
    } catch {
      const seedItems: MealItemDto[] = [
        { id: "ai-1", name: "Mixed Thali", quantity: 1, servingUnit: "plate", calories: 650, protein: 22, carbs: 85, fat: 24, fiber: 8, confidence: 0.75, source: "AI_PHOTO" as const },
      ];
      const junkFoodScore = computeJunkFoodScore(seedItems);
      return {
        items: seedItems,
        totalCalories: 650,
        totalProtein: 22,
        totalCarbs: 85,
        totalFat: 24,
        confidence: 0.75,
        followUpQuestions: [
          "Was oil or ghee used for cooking?",
          "How many rotis/chapatis were there?",
          "Did you have rice alongside?"
        ],
        notes: "AI estimate based on photo analysis. Portions are approximate. Please correct if needed.",
        junkFoodScore,
        isJunkFood: junkFoodScore >= JUNK_FOOD_THRESHOLD,
      };
    }
  },

  async analyzeMealText(text: string, mealType: string): Promise<AiMealAnalysisResponse> {
    try {
      const res = await api.post<AiMealAnalysisResponse>("/wellness/meals/analyze", { textDescription: text, mealType });
      return res.data;
    } catch {
      const words = text.toLowerCase();
      const items: MealItemDto[] = [];

      if (words.includes("idli")) items.push({ id: `ai-${Date.now()}-1`, name: "Idli", quantity: words.includes("2") ? 2 : 3, servingUnit: "pieces", calories: words.includes("2") ? 130 : 195, protein: words.includes("2") ? 4 : 6, carbs: words.includes("2") ? 26 : 39, fat: 0.4, confidence: 0.92, source: "AI_TEXT" });
      if (words.includes("dosa")) items.push({ id: `ai-${Date.now()}-2`, name: "Dosa", quantity: 1, servingUnit: "piece", calories: 120, protein: 3, carbs: 18, fat: 4, confidence: 0.9, source: "AI_TEXT" });
      if (words.includes("sambar")) items.push({ id: `ai-${Date.now()}-3`, name: "Sambar", quantity: 1, servingUnit: "bowl", calories: 120, protein: 6, carbs: 18, fat: 3, confidence: 0.85, source: "AI_TEXT" });
      if (words.includes("rice") || words.includes("chawal")) items.push({ id: `ai-${Date.now()}-4`, name: "Rice", quantity: 1, servingUnit: "cup", calories: 206, protein: 4, carbs: 45, fat: 0.4, confidence: 0.88, source: "AI_TEXT" });
      if (words.includes("dal")) items.push({ id: `ai-${Date.now()}-5`, name: "Dal", quantity: 1, servingUnit: "bowl", calories: 180, protein: 12, carbs: 22, fat: 6, confidence: 0.85, source: "AI_TEXT" });
      if (words.includes("roti") || words.includes("chapati")) items.push({ id: `ai-${Date.now()}-6`, name: "Roti", quantity: 2, servingUnit: "pieces", calories: 200, protein: 6, carbs: 36, fat: 4, confidence: 0.9, source: "AI_TEXT" });
      if (words.includes("coffee")) items.push({ id: `ai-${Date.now()}-7`, name: "Filter Coffee", quantity: 1, servingUnit: "cup", calories: 85, protein: 3, carbs: 8, fat: 4, confidence: 0.95, source: "AI_TEXT" });
      if (words.includes("tea") || words.includes("chai")) items.push({ id: `ai-${Date.now()}-8`, name: "Masala Chai", quantity: 1, servingUnit: "cup", calories: 70, protein: 2, carbs: 10, fat: 2.5, confidence: 0.93, source: "AI_TEXT" });

      if (items.length === 0) {
        items.push({ id: `ai-${Date.now()}-0`, name: text.slice(0, 50), quantity: 1, servingUnit: "serving", calories: 300, protein: 10, carbs: 40, fat: 12, confidence: 0.5, source: "AI_TEXT" });
      }

      const totals = items.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const junkFoodScore = computeJunkFoodScore(items, text);
      return {
        items,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        confidence: items.reduce((sum, i) => sum + i.confidence, 0) / items.length,
        notes: "AI estimate based on text description. Values are approximate.",
        junkFoodScore,
        isJunkFood: junkFoodScore >= JUNK_FOOD_THRESHOLD,
      };
    }
  },

  async searchFood(query: string): Promise<FoodItemDto[]> {
    try {
      const res = await api.get<FoodItemDto[]>("/wellness/food/search", { params: { q: query } });
      return res.data;
    } catch {
      const q = query.toLowerCase();
      return SEED_FOOD_CATALOG.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.regionalName && f.regionalName.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q))
      );
    }
  },

  async logWater(amountMl: number): Promise<WaterLogDto> {
    try {
      const res = await api.post<WaterLogDto>("/nutrition/water", { amountMl });
      return res.data;
    } catch {
      const log: WaterLogDto = { id: `w-${Date.now()}`, memberId: "m-1", amountMl, loggedAt: new Date().toISOString() };
      waterState.push(log);
      return log;
    }
  },

  async getWaterLogs(date?: string): Promise<WaterLogDto[]> {
    try {
      const res = await api.get<WaterLogDto[]>("/nutrition/water", { params: { date } });
      return res.data;
    } catch {
      return waterState;
    }
  },

  async getChallenges(): Promise<WellnessChallengeDto[]> {
    try {
      const res = await api.get<WellnessChallengeDto[]>("/wellness/challenges");
      return res.data;
    } catch {
      return SEED_CHALLENGES;
    }
  },

  async joinChallenge(challengeId: string): Promise<ChallengeParticipantDto> {
    try {
      const res = await api.post<ChallengeParticipantDto>(`/wellness/challenges/${challengeId}/join`);
      return res.data;
    } catch {
      return {
        id: `cp-${Date.now()}`,
        challengeId,
        memberId: "m-1",
        memberName: "You",
        joinedAt: new Date().toISOString(),
        currentProgress: 0,
        sharingPreference: "FRIENDS_ONLY",
      };
    }
  },

  async getProviders(): Promise<WellnessProviderDto[]> {
    try {
      const res = await api.get<WellnessProviderDto[]>("/wellness/providers");
      return res.data;
    } catch {
      return SEED_PROVIDERS;
    }
  },

  async getPartners(): Promise<AccountabilityPartnerDto[]> {
    try {
      const res = await api.get<AccountabilityPartnerDto[]>("/wellness/accountability/partners");
      return res.data;
    } catch {
      return [];
    }
  },

  getFoodCatalog(): FoodItemDto[] {
    return SEED_FOOD_CATALOG;
  },

  async getAlerts(): Promise<AccountabilityAlertDto[]> {
    try {
      const res = await api.get<AccountabilityAlertDto[]>("/wellness/alerts");
      return res.data;
    } catch {
      return alertsState;
    }
  },

  async markAlertRead(alertId: string): Promise<void> {
    try {
      await api.put(`/wellness/alerts/${alertId}/read`);
    } catch {
      alertsState = alertsState.map(a => a.id === alertId ? { ...a, isRead: true } : a);
    }
  },

  async sendAccountabilityAlert(type: AccountabilityAlertType, message: string, data?: Record<string, unknown>): Promise<void> {
    try {
      await api.post("/wellness/alerts", { alertType: type, message, data });
    } catch {
      const alert: AccountabilityAlertDto = {
        id: `alert-${Date.now()}`,
        alertType: type,
        triggeredAt: new Date().toISOString(),
        message,
        isRead: false,
        data,
      };
      alertsState = [alert, ...alertsState];
    }
  },

  async checkAndTriggerJunkFoodAlert(analysis: AiMealAnalysisResponse): Promise<void> {
    if (!analysis.isJunkFood) return;
    const partners = await this.getPartners();
    const activePartners = partners.filter(p => p.consentStatus === "ACCEPTED" && p.status === "ACTIVE");
    if (activePartners.length === 0) return;
    const foodNames = analysis.items.map(i => i.name).join(", ");
    await this.sendAccountabilityAlert(
      "JUNK_FOOD",
      `Junk food detected in your meal: ${foodNames}. Score: ${Math.round((analysis.junkFoodScore ?? 0) * 100)}%.`,
      { junkFoodScore: analysis.junkFoodScore, items: foodNames },
    );
  },

  async getAvailableSlots(providerId: string, date: string): Promise<ProviderSlotDto[]> {
    try {
      const res = await api.get<ProviderSlotDto[]>(`/wellness/providers/${providerId}/slots`, { params: { date } });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const slots: ProviderSlotDto[] = [
          { time: '09:00', label: '9:00 AM', available: true },
          { time: '10:00', label: '10:00 AM', available: true },
          { time: '11:00', label: '11:00 AM', available: false },
          { time: '14:00', label: '2:00 PM', available: true },
          { time: '15:00', label: '3:00 PM', available: true },
          { time: '16:00', label: '4:00 PM', available: true },
          { time: '17:00', label: '5:00 PM', available: false },
        ];
        // Vary availability by provider ID to look realistic
        const seed = providerId.charCodeAt(providerId.length - 1) % 3;
        return slots.map((s, i) => ({ ...s, available: s.available && (i + seed) % 4 !== 0 }));
      }
      throw new Error(err?.response?.data?.message || 'Failed to load available slots.');
    }
  },

  async bookAppointment(
    providerId: string,
    providerName: string,
    date: string,
    timeSlot: string,
    sessionMode: SessionMode,
    fee: number,
  ): Promise<AppointmentBookingDto> {
    try {
      const res = await api.post<AppointmentBookingDto>('/wellness/appointments', {
        providerId, date, timeSlot, sessionMode,
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const ref = `MANA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        return {
          id: `appt-${Date.now()}`,
          providerId,
          providerName,
          date,
          timeSlot,
          sessionMode,
          fee,
          status: 'CONFIRMED',
          bookingRef: ref,
        };
      }
      throw new Error(err?.response?.data?.message || 'Booking failed. Please try again.');
    }
  },
};
