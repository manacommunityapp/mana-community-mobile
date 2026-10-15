import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { WellnessProfileDto, NutritionGoalDto } from "@/types/wellness";

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  MAINTAIN: "Maintain Weight",
  MUSCLE_GAIN: "Muscle Gain",
  GENERAL_WELLNESS: "General Wellness",
};

const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: "Sedentary",
  LIGHTLY_ACTIVE: "Lightly Active",
  MODERATELY_ACTIVE: "Moderately Active",
  VERY_ACTIVE: "Very Active",
  EXTRA_ACTIVE: "Extra Active",
};

const COACHING_LABELS: Record<string, string> = {
  GENTLE: "Gentle & Supportive",
  MOTIVATIONAL: "Motivational",
  STRICT: "Strict & Disciplined",
  DATA_FOCUSED: "Data-Focused",
};

export default function WellnessProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WellnessProfileDto | null>(null);
  const [goals, setGoals] = useState<NutritionGoalDto | null>(null);

  useEffect(() => {
    Promise.all([
      wellnessService.getProfile(),
      wellnessService.getGoals(),
    ]).then(([p, g]) => {
      setProfile(p);
      setGoals(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={THEMES.wellness.primary} /></View>;
  }

  if (!profile || !goals) return null;

  const bmi = profile.heightCm && profile.currentWeight
    ? (profile.currentWeight / ((profile.heightCm / 100) ** 2)).toFixed(1)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={THEMES.wellness.primary} />
        </View>
        <Text style={styles.profileTitle}>Your Wellness Profile</Text>
        <View style={styles.profilePills}>
          <View style={[styles.pill, { backgroundColor: THEMES.wellness.bg }]}>
            <Text style={[styles.pillText, { color: THEMES.wellness.primaryDark }]}>{GOAL_LABELS[profile.goalType]}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: "#EFF6FF" }]}>
            <Text style={[styles.pillText, { color: "#3B82F6" }]}>{ACTIVITY_LABELS[profile.activityLevel]}</Text>
          </View>
        </View>
      </View>

      {/* Body Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.currentWeight} kg</Text>
            <Text style={styles.statLabel}>Current Weight</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.targetWeight} kg</Text>
            <Text style={styles.statLabel}>Target Weight</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.heightCm} cm</Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          {bmi && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bmi}</Text>
              <Text style={styles.statLabel}>BMI</Text>
            </View>
          )}
        </View>
      </View>

      {/* Nutrition Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Nutrition Goals</Text>
        <View style={styles.goalsList}>
          {[
            { label: "Calories", value: `${goals.calorieTarget} kcal`, color: THEMES.wellness.primary },
            { label: "Protein", value: `${goals.proteinTarget}g`, color: "#3B82F6" },
            { label: "Carbs", value: `${goals.carbsTarget}g`, color: "#F97316" },
            { label: "Fat", value: `${goals.fatTarget}g`, color: "#8B5CF6" },
            { label: "Water", value: `${(goals.waterTarget / 1000).toFixed(1)}L`, color: "#06B6D4" },
            { label: "Fiber", value: `${goals.fiberTarget || 30}g`, color: "#10B981" },
          ].map((g) => (
            <View key={g.label} style={styles.goalRow}>
              <View style={[styles.goalDot, { backgroundColor: g.color }]} />
              <Text style={styles.goalLabel}>{g.label}</Text>
              <Text style={[styles.goalValue, { color: g.color }]}>{g.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.prefRow}>
          <Ionicons name="chatbubbles-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.prefLabel}>Coaching Style</Text>
          <Text style={styles.prefValue}>{COACHING_LABELS[profile.coachingStyle]}</Text>
        </View>
        {profile.dietaryPreferences && profile.dietaryPreferences.length > 0 && (
          <View style={styles.prefRow}>
            <Ionicons name="leaf-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.prefLabel}>Diet</Text>
            <Text style={styles.prefValue}>{profile.dietaryPreferences.join(", ")}</Text>
          </View>
        )}
        {profile.allergies && profile.allergies.length > 0 && (
          <View style={styles.prefRow}>
            <Ionicons name="warning-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.prefLabel}>Allergies</Text>
            <Text style={styles.prefValue}>{profile.allergies.join(", ")}</Text>
          </View>
        )}
        <View style={styles.prefRow}>
          <Ionicons name="eye-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.prefLabel}>Visibility</Text>
          <Text style={styles.prefValue}>{profile.visibility.replace(/_/g, " ")}</Text>
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={18} color="#059669" />
        <Text style={styles.privacyText}>
          Your nutrition data is private. Only you control who can see your meals, weight, and health goals.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 14 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },

  profileCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: THEMES.wellness.accentLight, justifyContent: "center", alignItems: "center" },
  profileTitle: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  profilePills: { flexDirection: "row", gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  pillText: { fontSize: 12, fontFamily: FONTS.semiBold },

  card: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statItem: { width: "47%", backgroundColor: "#F8FAFC", borderRadius: RADIUS.md, padding: 12, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },

  goalsList: { gap: 8 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
  goalValue: { fontSize: 15, fontFamily: FONTS.displayBold },

  prefRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  prefLabel: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text },
  prefValue: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.textSecondary },

  privacyCard: { flexDirection: "row", gap: 8, backgroundColor: "#ECFDF5", borderRadius: RADIUS.md, padding: 12, alignItems: "flex-start" },
  privacyText: { flex: 1, fontSize: 12, fontFamily: FONTS.regular, color: "#065F46", lineHeight: 18 },
});
