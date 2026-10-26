import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES, SPACING } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { MealItemDto, MealType, AiMealAnalysisResponse } from "@/types/wellness";

const MEAL_TYPES: { key: MealType; label: string; icon: any; color: string; bg: string }[] = [
  { key: "BREAKFAST", label: "Breakfast", icon: "sunny", color: "#F97316", bg: "#FFF7ED" },
  { key: "LUNCH", label: "Lunch", icon: "restaurant", color: "#10B981", bg: "#ECFDF5" },
  { key: "DINNER", label: "Dinner", icon: "moon", color: "#3B82F6", bg: "#EFF6FF" },
  { key: "SNACK", label: "Snack", icon: "cafe", color: "#8B5CF6", bg: "#F5F3FF" },
];

export default function LogMealScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealType>("LUNCH");
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiMealAnalysisResponse | null>(null);
  const [items, setItems] = useState<MealItemDto[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);
    try {
      const response = await wellnessService.analyzeMealText(inputText.trim(), selectedMeal);
      setResult(response);
      setItems(response.items);
    } catch (e) {
      Alert.alert("Error", "Could not analyze your meal. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const totals = items.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      await wellnessService.logMeal({
        memberId: "m-1",
        mealType: selectedMeal,
        mealTime: new Date().toISOString(),
        items,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        notes: inputText,
        status: "CONFIRMED",
      });
      Alert.alert("Saved!", "Your meal has been logged successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Error", "Could not save meal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItemQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const ratio = (item.quantity + delta) / item.quantity;
      if (item.quantity + delta < 0.5) return item;
      return {
        ...item,
        quantity: Math.round((item.quantity + delta) * 10) / 10,
        calories: Math.round(item.calories * ratio),
        protein: Math.round(item.protein * ratio * 10) / 10,
        carbs: Math.round(item.carbs * ratio * 10) / 10,
        fat: Math.round(item.fat * ratio * 10) / 10,
      };
    }));
  };

  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Meal Type Selector */}
        <View style={styles.mealSelector}>
          {MEAL_TYPES.map((mt) => (
            <TouchableOpacity
              key={mt.key}
              style={[styles.mealTab, selectedMeal === mt.key && { backgroundColor: mt.bg, borderColor: mt.color }]}
              onPress={() => setSelectedMeal(mt.key)}
            >
              <Ionicons name={mt.icon} size={18} color={selectedMeal === mt.key ? mt.color : "#94A3B8"} />
              <Text style={[styles.mealTabText, selectedMeal === mt.key && { color: mt.color }]}>{mt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Input Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={18} color={THEMES.wellness.primary} />
            <Text style={styles.aiTitle}>Describe your meal</Text>
          </View>
          <Text style={styles.aiHint}>
            Type what you ate, e.g. "2 idlis, sambar, and coffee" or "rice, dal, palak paneer and roti"
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What did you eat?"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              onSubmitEditing={handleAnalyze}
            />
            <TouchableOpacity
              style={[styles.analyzeBtn, (!inputText.trim() || analyzing) && styles.analyzeBtnDisabled]}
              onPress={handleAnalyze}
              disabled={!inputText.trim() || analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Analysis Result */}
        {result && items.length > 0 && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>AI Analysis</Text>
              {result.confidence < 0.8 && (
                <View style={styles.confidenceBadge}>
                  <Ionicons name="information-circle" size={12} color="#D97706" />
                  <Text style={styles.confidenceText}>Approximate</Text>
                </View>
              )}
            </View>

            {/* Items */}
            {items.map((item) => (
              <View key={item.id} style={styles.resultItem}>
                <View style={styles.resultItemInfo}>
                  <Text style={styles.resultItemName}>{item.name}</Text>
                  <Text style={styles.resultItemMeta}>{item.calories} kcal | P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(item.id, -0.5)}>
                    <Ionicons name="remove" size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity} {item.servingUnit}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(item.id, 0.5)}>
                    <Ionicons name="add" size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                    <Ionicons name="close" size={14} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Follow-up Questions */}
            {result.followUpQuestions && result.followUpQuestions.length > 0 && (
              <View style={styles.followUpSection}>
                <Text style={styles.followUpTitle}>AI wants to know:</Text>
                {result.followUpQuestions.map((q, i) => (
                  <Text key={i} style={styles.followUpQ}>{q}</Text>
                ))}
              </View>
            )}

            {/* Totals */}
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{Math.round(totals.calories)}</Text>
                <Text style={styles.totalLabel}>kcal</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: "#3B82F6" }]}>{Math.round(totals.protein)}g</Text>
                <Text style={styles.totalLabel}>Protein</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: "#F97316" }]}>{Math.round(totals.carbs)}g</Text>
                <Text style={styles.totalLabel}>Carbs</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: "#8B5CF6" }]}>{Math.round(totals.fat)}g</Text>
                <Text style={styles.totalLabel}>Fat</Text>
              </View>
            </View>

            {result.notes && (
              <Text style={styles.aiNote}>{result.notes}</Text>
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save to Food Journal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestions */}
        {!result && (
          <View style={styles.suggestionsCard}>
            <Text style={styles.suggestionsTitle}>Quick suggestions</Text>
            <View style={styles.suggestionChips}>
              {[
                "2 idlis, sambar and coffee",
                "rice, dal, roti and curd",
                "poha and tea",
                "dosa with chutney",
                "biryani and raita",
                "roti, paneer and salad",
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => { setInputText(s); }}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  mealSelector: { flexDirection: "row", gap: 8 },
  mealTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  mealTabText: { fontSize: 11, fontFamily: FONTS.semiBold, color: "#94A3B8" },

  aiSection: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 8, borderWidth: 1, borderColor: THEMES.wellness.accentBorder, ...SHADOWS.card },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  aiHint: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, borderWidth: 1, borderColor: "#E2E8F0", minHeight: 48, maxHeight: 100, textAlignVertical: "top" },
  analyzeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEMES.wellness.primary, justifyContent: "center", alignItems: "center", ...SHADOWS.glowEmerald },
  analyzeBtnDisabled: { backgroundColor: "#CBD5E1" },

  resultCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  confidenceBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFFBEB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confidenceText: { fontSize: 10, fontFamily: FONTS.medium, color: "#D97706" },

  resultItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  resultItemInfo: { flex: 1 },
  resultItemName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  resultItemMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  qtyValue: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.text, minWidth: 60, textAlign: "center" },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginLeft: 4 },

  followUpSection: { backgroundColor: "#FFFBEB", borderRadius: RADIUS.sm, padding: 10, gap: 4 },
  followUpTitle: { fontSize: 12, fontFamily: FONTS.semiBold, color: "#92400E" },
  followUpQ: { fontSize: 12, fontFamily: FONTS.regular, color: "#78350F" },

  totalsRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, paddingVertical: 12 },
  totalItem: { alignItems: "center" },
  totalValue: { fontSize: 18, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  totalLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted },

  aiNote: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, fontStyle: "italic", textAlign: "center" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: THEMES.wellness.primary, paddingVertical: 14, borderRadius: RADIUS.md, ...SHADOWS.glowEmerald },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: FONTS.bold },

  suggestionsCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  suggestionsTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  suggestionChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: THEMES.wellness.bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: THEMES.wellness.accentBorder },
  chipText: { fontSize: 12, fontFamily: FONTS.medium, color: THEMES.wellness.primaryDark },
});
