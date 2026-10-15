import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { MealLogDto, DailyNutritionSummary } from "@/types/wellness";

export default function FoodJournalScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meals, setMeals] = useState<MealLogDto[]>([]);
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);

  const loadData = async () => {
    try {
      const [m, s] = await Promise.all([
        wellnessService.getMeals(),
        wellnessService.getDailySummary(),
      ]);
      setMeals(m);
      setSummary(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={THEMES.wellness.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Journal</Text>
        <TouchableOpacity onPress={() => router.push("/wellness/log-meal")} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={THEMES.wellness.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={THEMES.wellness.primary} />}
      >
        {/* Daily Summary Bar */}
        {summary && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalCalories}</Text>
              <Text style={styles.summaryLabel}>Eaten</Text>
            </View>
            <View style={[styles.summaryDivider]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: THEMES.wellness.primary }]}>
                {Math.max(summary.calorieTarget - summary.totalCalories, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.calorieTarget}</Text>
              <Text style={styles.summaryLabel}>Goal</Text>
            </View>
          </View>
        )}

        {/* Macros Progress */}
        {summary && (
          <View style={styles.macrosBars}>
            {[
              { label: "Protein", current: summary.totalProtein, target: summary.proteinTarget, color: "#3B82F6" },
              { label: "Carbs", current: summary.totalCarbs, target: summary.carbsTarget, color: "#F97316" },
              { label: "Fat", current: summary.totalFat, target: summary.fatTarget, color: "#8B5CF6" },
            ].map((m) => (
              <View key={m.label} style={styles.macroBar}>
                <View style={styles.macroBarHeader}>
                  <Text style={styles.macroBarLabel}>{m.label}</Text>
                  <Text style={styles.macroBarValue}>{m.current}g / {m.target}g</Text>
                </View>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { width: `${Math.min((m.current / m.target) * 100, 100)}%`, backgroundColor: m.color }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Meal List */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No meals logged yet</Text>
            <Text style={styles.emptyDesc}>Tap the + button or use AI to scan your meal photo</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/wellness/log-meal")}>
              <Text style={styles.emptyBtnText}>Log Your First Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: getMealBg(meal.mealType) }]}>
                  <Ionicons name={getMealIconName(meal.mealType)} size={18} color={getMealTint(meal.mealType)} />
                </View>
                <View style={styles.mealMeta}>
                  <Text style={styles.mealType}>
                    {meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()}
                  </Text>
                  <Text style={styles.mealTime}>{formatTime(meal.mealTime)}</Text>
                </View>
                <View style={styles.mealCalBadge}>
                  <Text style={styles.mealCalValue}>{meal.totalCalories}</Text>
                  <Text style={styles.mealCalUnit}>kcal</Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsList}>
                {meal.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.servingUnit}</Text>
                    <Text style={styles.itemCal}>{item.calories} kcal</Text>
                  </View>
                ))}
              </View>

              {/* Macros Footer */}
              <View style={styles.mealFooter}>
                <View style={styles.mealMacros}>
                  <Text style={[styles.macTag, { backgroundColor: "#EFF6FF", color: "#3B82F6" }]}>
                    Protein {meal.totalProtein}g
                  </Text>
                  <Text style={[styles.macTag, { backgroundColor: "#FFF7ED", color: "#F97316" }]}>
                    Carbs {meal.totalCarbs}g
                  </Text>
                  <Text style={[styles.macTag, { backgroundColor: "#F5F3FF", color: "#8B5CF6" }]}>
                    Fat {meal.totalFat}g
                  </Text>
                </View>
                {meal.items.some(i => i.source === "AI_PHOTO" || i.source === "AI_TEXT") && (
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color={THEMES.wellness.primary} />
                    <Text style={styles.aiText}>AI estimated</Text>
                  </View>
                )}
              </View>

              {meal.notes && <Text style={styles.mealNotes}>{meal.notes}</Text>}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/wellness/log-meal")} activeOpacity={0.85}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Log Meal</Text>
      </TouchableOpacity>
    </View>
  );
}

function getMealIconName(type: string): any {
  switch (type) { case "BREAKFAST": return "sunny"; case "LUNCH": return "restaurant"; case "DINNER": return "moon"; case "SNACK": return "cafe"; default: return "restaurant"; }
}
function getMealBg(type: string) {
  switch (type) { case "BREAKFAST": return "#FFF7ED"; case "LUNCH": return "#ECFDF5"; case "DINNER": return "#EFF6FF"; case "SNACK": return "#F5F3FF"; default: return "#F1F5F9"; }
}
function getMealTint(type: string) {
  switch (type) { case "BREAKFAST": return "#F97316"; case "LUNCH": return "#10B981"; case "DINNER": return "#3B82F6"; case "SNACK": return "#8B5CF6"; default: return "#64748B"; }
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  addBtn: {},
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  summaryBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text },
  summaryLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#E2E8F0" },

  macrosBars: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  macroBar: { gap: 4 },
  macroBarHeader: { flexDirection: "row", justifyContent: "space-between" },
  macroBarLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.text },
  macroBarValue: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },
  macroBarTrack: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  macroBarFill: { height: "100%", borderRadius: 3 },

  sectionTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: -0.2 },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  emptyDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center" },
  emptyBtn: { backgroundColor: THEMES.wellness.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.sm, marginTop: 8 },
  emptyBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONTS.bold },

  mealCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 14, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  mealMeta: { flex: 1 },
  mealType: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text },
  mealTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  mealCalBadge: { alignItems: "flex-end" },
  mealCalValue: { fontSize: 18, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  mealCalUnit: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted },

  itemsList: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8, gap: 4 },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemName: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: COLORS.text },
  itemQty: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginRight: 12 },
  itemCal: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textSecondary, width: 60, textAlign: "right" },

  mealFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealMacros: { flexDirection: "row", gap: 4 },
  macTag: { fontSize: 10, fontFamily: FONTS.bold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: THEMES.wellness.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiText: { fontSize: 10, fontFamily: FONTS.medium, color: THEMES.wellness.primary },
  mealNotes: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, fontStyle: "italic" },

  fab: { position: "absolute", bottom: 24, right: 20, backgroundColor: THEMES.wellness.primary, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.glowEmerald },
  fabText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONTS.bold },
});
