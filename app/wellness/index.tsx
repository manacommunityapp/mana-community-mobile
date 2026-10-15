import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  Dimensions, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES, SPACING } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { DailyNutritionSummary, WeeklyTrend, MealLogDto, WellnessChallengeDto } from "@/types/wellness";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function MacroRing({ label, current, target, color, unit }: { label: string; current: number; target: number; color: string; unit: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <View style={styles.macroRing}>
      <View style={[styles.ringOuter, { borderColor: color + "30" }]}>
        <View style={[styles.ringProgress, { borderColor: color, borderTopColor: pct > 75 ? color : "transparent", borderRightColor: pct > 50 ? color : "transparent", borderBottomColor: pct > 25 ? color : "transparent" }]}>
          <Text style={[styles.ringValue, { color }]}>{current}</Text>
        </View>
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroTarget}>{target}{unit}</Text>
    </View>
  );
}

export default function WellnessDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [trend, setTrend] = useState<WeeklyTrend | null>(null);
  const [meals, setMeals] = useState<MealLogDto[]>([]);
  const [challenges, setChallenges] = useState<WellnessChallengeDto[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [s, t, m, c] = await Promise.all([
        wellnessService.getDailySummary(),
        wellnessService.getWeeklyTrend(),
        wellnessService.getMeals(),
        wellnessService.getChallenges(),
      ]);
      setSummary(s);
      setTrend(t);
      setMeals(m);
      setChallenges(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEMES.wellness.primary} />
      </View>
    );
  }

  const calPct = summary ? Math.round((summary.totalCalories / summary.calorieTarget) * 100) : 0;
  const waterPct = summary ? Math.round((summary.waterIntakeMl / summary.waterTarget) * 100) : 0;
  const activeChallenges = challenges.filter(c => c.status === "ACTIVE" && c.isJoined);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={THEMES.wellness.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Health Buddy</Text>
            <Text style={styles.headerSub}>Your wellness companion</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/wellness/profile")}>
              <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Banner */}
        {trend && trend.streakDays > 0 && (
          <View style={styles.streakBanner}>
            <Ionicons name="flame" size={18} color="#FCD34D" />
            <Text style={styles.streakText}>{trend.streakDays} day streak!</Text>
            <Text style={styles.streakSub}>{trend.daysLogged}/7 days logged this week</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEMES.wellness.primary} />}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEMES.wellness.bg }]} onPress={() => router.push("/wellness/log-meal")}>
            <View style={[styles.quickIcon, { backgroundColor: THEMES.wellness.accentLight }]}>
              <Ionicons name="camera" size={22} color={THEMES.wellness.primary} />
            </View>
            <Text style={styles.quickLabel}>Scan Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEMES.wellness.orangeLight }]} onPress={() => router.push("/wellness/food-journal")}>
            <View style={[styles.quickIcon, { backgroundColor: "#FFEDD5" }]}>
              <Ionicons name="restaurant" size={22} color={THEMES.wellness.orange} />
            </View>
            <Text style={styles.quickLabel}>Food Log</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEMES.wellness.blueLight }]} onPress={() => router.push("/wellness/water-tracker")}>
            <View style={[styles.quickIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="water" size={22} color={THEMES.wellness.blue} />
            </View>
            <Text style={styles.quickLabel}>Water</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEMES.wellness.purpleLight }]} onPress={() => router.push("/wellness/challenges")}>
            <View style={[styles.quickIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="trophy" size={22} color={THEMES.wellness.purple} />
            </View>
            <Text style={styles.quickLabel}>Challenges</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Nutrition Summary */}
        {summary && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Nutrition</Text>
              <View style={[styles.pill, calPct >= 80 ? styles.pillGood : styles.pillNeutral]}>
                <Text style={[styles.pillText, calPct >= 80 ? styles.pillTextGood : styles.pillTextNeutral]}>
                  {calPct}% of goal
                </Text>
              </View>
            </View>

            {/* Calorie Progress */}
            <View style={styles.calorieSection}>
              <View style={styles.calorieMain}>
                <Text style={styles.calorieValue}>{summary.totalCalories}</Text>
                <Text style={styles.calorieUnit}>/ {summary.calorieTarget} kcal</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(calPct, 100)}%`, backgroundColor: calPct > 100 ? COLORS.error : THEMES.wellness.primary }]} />
              </View>
              <Text style={styles.calorieRemaining}>
                {summary.calorieTarget - summary.totalCalories > 0
                  ? `${summary.calorieTarget - summary.totalCalories} kcal remaining`
                  : "Goal reached!"}
              </Text>
            </View>

            {/* Macro Breakdown */}
            <View style={styles.macrosRow}>
              <MacroRing label="Protein" current={summary.totalProtein} target={summary.proteinTarget} color="#3B82F6" unit="g" />
              <MacroRing label="Carbs" current={summary.totalCarbs} target={summary.carbsTarget} color="#F97316" unit="g" />
              <MacroRing label="Fat" current={summary.totalFat} target={summary.fatTarget} color="#8B5CF6" unit="g" />
              <MacroRing label="Fiber" current={summary.totalFiber} target={30} color="#10B981" unit="g" />
            </View>

            {/* Water */}
            <View style={styles.waterSection}>
              <View style={styles.waterHeader}>
                <Ionicons name="water" size={18} color="#3B82F6" />
                <Text style={styles.waterTitle}>Water Intake</Text>
                <Text style={styles.waterValue}>{(summary.waterIntakeMl / 1000).toFixed(1)}L / {(summary.waterTarget / 1000).toFixed(1)}L</Text>
              </View>
              <View style={styles.waterBar}>
                <View style={[styles.waterFill, { width: `${Math.min(waterPct, 100)}%` }]} />
              </View>
              <View style={styles.waterGlasses}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={[styles.glass, i < Math.floor(summary.waterIntakeMl / 375) && styles.glassFilled]}>
                    <Ionicons name="water" size={14} color={i < Math.floor(summary.waterIntakeMl / 375) ? "#3B82F6" : "#CBD5E1"} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Today's Meals */}
        {meals.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Meals</Text>
              <TouchableOpacity onPress={() => router.push("/wellness/food-journal")}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {meals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={[styles.mealTypeBadge, { backgroundColor: getMealColor(meal.mealType).bg }]}>
                    <Ionicons name={getMealIcon(meal.mealType)} size={16} color={getMealColor(meal.mealType).text} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealType}>{meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()}</Text>
                    <Text style={styles.mealTime}>{formatTime(meal.mealTime)}</Text>
                  </View>
                  <Text style={styles.mealCal}>{meal.totalCalories} kcal</Text>
                </View>
                <View style={styles.mealItems}>
                  {meal.items.slice(0, 3).map((item) => (
                    <Text key={item.id} style={styles.mealItemText}>
                      {item.name} ({item.quantity} {item.servingUnit})
                    </Text>
                  ))}
                  {meal.items.length > 3 && (
                    <Text style={styles.mealMore}>+{meal.items.length - 3} more items</Text>
                  )}
                </View>
                <View style={styles.mealMacros}>
                  <Text style={[styles.macroTag, { backgroundColor: "#EFF6FF", color: "#3B82F6" }]}>P: {meal.totalProtein}g</Text>
                  <Text style={[styles.macroTag, { backgroundColor: "#FFF7ED", color: "#F97316" }]}>C: {meal.totalCarbs}g</Text>
                  <Text style={[styles.macroTag, { backgroundColor: "#F5F3FF", color: "#8B5CF6" }]}>F: {meal.totalFat}g</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Active Challenges</Text>
              <TouchableOpacity onPress={() => router.push("/wellness/challenges")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeChallenges.map((ch) => (
              <TouchableOpacity key={ch.id} style={styles.challengeCard} onPress={() => router.push("/wellness/challenges")} activeOpacity={0.8}>
                <View style={styles.challengeRow}>
                  <View style={[styles.challengeIcon, { backgroundColor: getChallengeColor(ch.challengeType).bg }]}>
                    <Ionicons name={getChallengeIcon(ch.challengeType)} size={20} color={getChallengeColor(ch.challengeType).text} />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{ch.title}</Text>
                    <Text style={styles.challengeMeta}>{ch.participantCount} participants</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Weekly Trend */}
        {trend && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Overview</Text>
            <View style={styles.trendGrid}>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{trend.avgCalories}</Text>
                <Text style={styles.trendLabel}>Avg Calories</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{trend.avgProtein}g</Text>
                <Text style={styles.trendLabel}>Avg Protein</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{(trend.avgWater / 1000).toFixed(1)}L</Text>
                <Text style={styles.trendLabel}>Avg Water</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{trend.daysLogged}/7</Text>
                <Text style={styles.trendLabel}>Days Logged</Text>
              </View>
            </View>
          </View>
        )}

        {/* Services Grid */}
        <Text style={styles.sectionTitle}>Wellness Services</Text>
        <View style={styles.servicesGrid}>
          {[
            { title: "Dietitians", desc: "Book consultation", icon: "nutrition" as const, route: "/wellness/providers", color: THEMES.wellness.primary, bg: THEMES.wellness.accentLight },
            { title: "Challenges", desc: "Join community", icon: "trophy" as const, route: "/wellness/challenges", color: THEMES.wellness.purple, bg: THEMES.wellness.purpleLight },
            { title: "Food Database", desc: "Search foods", icon: "search" as const, route: "/wellness/food-journal", color: THEMES.wellness.orange, bg: THEMES.wellness.orangeLight },
            { title: "AI Coach", desc: "Personal guidance", icon: "sparkles" as const, route: "/wellness/profile", color: THEMES.wellness.blue, bg: THEMES.wellness.blueLight },
            { title: "Health Hub", desc: "Doctors & records", icon: "medkit" as const, route: "/health", color: "#0D9488", bg: "#CCFBF1" },
            { title: "Sports", desc: "Activities & events", icon: "football" as const, route: "/sports", color: THEMES.wellness.rose, bg: THEMES.wellness.roseLight },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.serviceItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.serviceTitle}>{item.title}</Text>
              <Text style={styles.serviceDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Log Meal Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/wellness/log-meal")}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={THEMES.wellness.gradient}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function getMealIcon(type: string): any {
  switch (type) {
    case "BREAKFAST": return "sunny";
    case "LUNCH": return "restaurant";
    case "DINNER": return "moon";
    case "SNACK": return "cafe";
    default: return "restaurant";
  }
}

function getMealColor(type: string) {
  switch (type) {
    case "BREAKFAST": return { bg: "#FFF7ED", text: "#F97316" };
    case "LUNCH": return { bg: "#ECFDF5", text: "#10B981" };
    case "DINNER": return { bg: "#EFF6FF", text: "#3B82F6" };
    case "SNACK": return { bg: "#F5F3FF", text: "#8B5CF6" };
    default: return { bg: "#F1F5F9", text: "#64748B" };
  }
}

function getChallengeIcon(type: string): any {
  switch (type) {
    case "WALKING": return "footsteps";
    case "HYDRATION": return "water";
    case "NUTRITION": return "nutrition";
    case "FITNESS": return "barbell";
    case "YOGA": return "body";
    default: return "trophy";
  }
}

function getChallengeColor(type: string) {
  switch (type) {
    case "WALKING": return { bg: "#ECFDF5", text: "#10B981" };
    case "HYDRATION": return { bg: "#EFF6FF", text: "#3B82F6" };
    case "NUTRITION": return { bg: "#FFF7ED", text: "#F97316" };
    case "FITNESS": return { bg: "#FFF1F2", text: "#F43F5E" };
    case "YOGA": return { bg: "#F5F3FF", text: "#8B5CF6" };
    default: return { bg: "#F1F5F9", text: "#64748B" };
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, ...SHADOWS.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: FONTS.displayBold, letterSpacing: -0.5 },
  headerSub: { color: "#D1FAE5", fontSize: 13, marginTop: 2, fontFamily: FONTS.medium },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  streakBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full },
  streakText: { color: "#FCD34D", fontSize: 14, fontFamily: FONTS.bold },
  streakSub: { color: "#D1FAE5", fontSize: 12, fontFamily: FONTS.regular, marginLeft: "auto" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  quickActions: { flexDirection: "row", gap: 10, marginTop: -8 },
  quickBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: "center", gap: 6, ...SHADOWS.card },
  quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quickLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.text },

  card: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 14, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEMES.wellness.primary },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  pillGood: { backgroundColor: "#ECFDF5" },
  pillNeutral: { backgroundColor: "#FFF7ED" },
  pillText: { fontSize: 11, fontFamily: FONTS.bold },
  pillTextGood: { color: "#059669" },
  pillTextNeutral: { color: "#D97706" },

  calorieSection: { gap: 6 },
  calorieMain: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  calorieValue: { fontSize: 32, fontFamily: FONTS.displayBold, color: THEMES.wellness.primary },
  calorieUnit: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  progressBar: { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  calorieRemaining: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },

  macrosRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  macroRing: { alignItems: "center", gap: 4 },
  ringOuter: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  ringProgress: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  ringValue: { fontSize: 13, fontFamily: FONTS.displayBold },
  macroLabel: { fontSize: 10, fontFamily: FONTS.semiBold, color: COLORS.textSecondary },
  macroTarget: { fontSize: 9, fontFamily: FONTS.regular, color: COLORS.textMuted },

  waterSection: { backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, padding: 12, gap: 8 },
  waterHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  waterTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  waterValue: { marginLeft: "auto", fontSize: 12, fontFamily: FONTS.bold, color: "#3B82F6" },
  waterBar: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  waterFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 3 },
  waterGlasses: { flexDirection: "row", justifyContent: "space-between" },
  glass: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  glassFilled: { backgroundColor: "#DBEAFE" },

  mealCard: { backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, padding: 12, gap: 8 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealTypeBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  mealInfo: { flex: 1 },
  mealType: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  mealTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  mealCal: { fontSize: 15, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  mealItems: { paddingLeft: 46 },
  mealItemText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18 },
  mealMore: { fontSize: 11, fontFamily: FONTS.medium, color: THEMES.wellness.primary, marginTop: 2 },
  mealMacros: { flexDirection: "row", gap: 6, paddingLeft: 46 },
  macroTag: { fontSize: 10, fontFamily: FONTS.bold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  challengeCard: { backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, padding: 12 },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  challengeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  challengeMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },

  trendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trendItem: { width: "47%", backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, padding: 12, alignItems: "center", gap: 2 },
  trendValue: { fontSize: 18, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  trendLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },

  sectionTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: -0.2 },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceItem: { width: "31%", backgroundColor: "#FFFFFF", padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", ...SHADOWS.card },
  serviceIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  serviceTitle: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.text, textAlign: "center" },
  serviceDesc: { fontSize: 9.5, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center", marginTop: 1 },

  fab: { position: "absolute", bottom: 24, right: 20, ...SHADOWS.glowEmerald },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
});
