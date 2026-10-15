import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { WaterLogDto, NutritionGoalDto } from "@/types/wellness";

const QUICK_AMOUNTS = [
  { label: "Glass", amount: 250, icon: "water" as const },
  { label: "Bottle", amount: 500, icon: "flask" as const },
  { label: "Large", amount: 750, icon: "beaker" as const },
];

export default function WaterTrackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WaterLogDto[]>([]);
  const [goals, setGoals] = useState<NutritionGoalDto | null>(null);

  const loadData = async () => {
    try {
      const [w, g] = await Promise.all([
        wellnessService.getWaterLogs(),
        wellnessService.getGoals(),
      ]);
      setLogs(w);
      setGoals(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleLog = async (amount: number) => {
    try {
      const log = await wellnessService.logWater(amount);
      setLogs(prev => [...prev, log]);
    } catch (e) {
      Alert.alert("Error", "Could not log water.");
    }
  };

  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
  const target = goals?.waterTarget || 3000;
  const pct = Math.min(Math.round((totalMl / target) * 100), 100);
  const glasses = Math.floor(totalMl / 250);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#3B82F6" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Tracker</Text>
        <Ionicons name="water" size={22} color="#3B82F6" />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Circle */}
        <View style={styles.progressCard}>
          <View style={styles.circleWrap}>
            <View style={styles.circleOuter}>
              <View style={styles.circleInner}>
                <Ionicons name="water" size={28} color="#3B82F6" />
                <Text style={styles.circleValue}>{(totalMl / 1000).toFixed(1)}L</Text>
                <Text style={styles.circleLabel}>of {(target / 1000).toFixed(1)}L</Text>
              </View>
            </View>
          </View>
          <Text style={styles.pctText}>{pct}% of daily goal</Text>
          <View style={styles.progressBarWrap}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.glassesText}>{glasses} glasses consumed</Text>
        </View>

        {/* Quick Add */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity key={q.label} style={styles.quickBtn} onPress={() => handleLog(q.amount)} activeOpacity={0.8}>
              <View style={styles.quickIconWrap}>
                <Ionicons name={q.icon} size={22} color="#3B82F6" />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
              <Text style={styles.quickAmount}>{q.amount}ml</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Glass Visualization */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Today's glasses</Text>
          <View style={styles.glassesGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={[styles.glass, i < glasses && styles.glassFilled]}>
                <Ionicons name="water" size={18} color={i < glasses ? "#3B82F6" : "#CBD5E1"} />
              </View>
            ))}
          </View>
        </View>

        {/* Log History */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>Today's Log</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No water logged yet. Start hydrating!</Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <Ionicons name="water" size={14} color="#3B82F6" />
                <Text style={styles.logAmount}>{log.amountMl}ml</Text>
                <Text style={styles.logTime}>{formatTime(log.loggedAt)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  progressCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 24, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  circleWrap: { marginBottom: 4 },
  circleOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 8, borderColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  circleInner: { alignItems: "center", gap: 2 },
  circleValue: { fontSize: 28, fontFamily: FONTS.displayBold, color: "#1E40AF" },
  circleLabel: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
  pctText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#3B82F6" },
  progressBarWrap: { width: "100%", height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 4 },
  glassesText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },

  sectionTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  quickLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  quickAmount: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },

  glassCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  glassesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  glass: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  glassFilled: { backgroundColor: "#DBEAFE" },

  historyCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 8, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  emptyText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center", paddingVertical: 16 },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  logAmount: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, flex: 1 },
  logTime: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
});
