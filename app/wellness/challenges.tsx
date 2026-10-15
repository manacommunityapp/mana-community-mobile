import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { WellnessChallengeDto } from "@/types/wellness";

type TabKey = "active" | "upcoming" | "completed";

export default function ChallengesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<WellnessChallengeDto[]>([]);
  const [tab, setTab] = useState<TabKey>("active");

  const loadData = async () => {
    try {
      const data = await wellnessService.getChallenges();
      setChallenges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleJoin = async (id: string) => {
    try {
      await wellnessService.joinChallenge(id);
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, isJoined: true, participantCount: c.participantCount + 1 } : c));
      Alert.alert("Joined!", "You've joined the challenge. Good luck!");
    } catch (e) {
      Alert.alert("Error", "Could not join challenge.");
    }
  };

  const filtered = challenges.filter(c => {
    if (tab === "active") return c.status === "ACTIVE";
    if (tab === "upcoming") return c.status === "UPCOMING";
    return c.status === "COMPLETED";
  });

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={THEMES.wellness.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEMES.wellness.purple, "#A78BFA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Community Challenges</Text>
            <Text style={styles.headerSub}>Compete, collaborate and achieve together</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: "active" as const, label: "Active" },
          { key: "upcoming" as const, label: "Upcoming" },
          { key: "completed" as const, label: "Completed" },
        ]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={THEMES.wellness.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No {tab} challenges</Text>
            <Text style={styles.emptyDesc}>Check back later for new community challenges!</Text>
          </View>
        ) : (
          filtered.map((challenge) => (
            <View key={challenge.id} style={styles.card}>
              {/* Challenge Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: getChallengeColor(challenge.challengeType).bg }]}>
                  <Ionicons name={getChallengeIcon(challenge.challengeType)} size={22} color={getChallengeColor(challenge.challengeType).text} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{challenge.title}</Text>
                  <Text style={styles.cardCreator}>by {challenge.createdBy}</Text>
                </View>
                {challenge.isJoined && (
                  <View style={styles.joinedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.joinedText}>Joined</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardDesc}>{challenge.description}</Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="people" size={14} color={COLORS.textMuted} />
                  <Text style={styles.statText}>{challenge.participantCount} participants</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="flag" size={14} color={COLORS.textMuted} />
                  <Text style={styles.statText}>{challenge.targetValue} {challenge.targetUnit}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                  <Text style={styles.statText}>{formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</Text>
                </View>
              </View>

              {/* Badges */}
              {challenge.badges && challenge.badges.length > 0 && (
                <View style={styles.badgesRow}>
                  {challenge.badges.map((badge) => (
                    <View key={badge.id} style={[styles.badge, badge.earned && styles.badgeEarned]}>
                      <Ionicons name={badge.icon as any} size={16} color={badge.earned ? "#F59E0B" : "#CBD5E1"} />
                      <Text style={[styles.badgeName, badge.earned && styles.badgeNameEarned]}>{badge.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action */}
              {!challenge.isJoined && challenge.status !== "COMPLETED" && (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => handleJoin(challenge.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="hand-left" size={16} color="#FFFFFF" />
                  <Text style={styles.joinBtnText}>Join Challenge</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getChallengeIcon(type: string): any {
  switch (type) { case "WALKING": return "footsteps"; case "HYDRATION": return "water"; case "NUTRITION": return "nutrition"; case "FITNESS": return "barbell"; case "YOGA": return "body"; default: return "trophy"; }
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
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, ...SHADOWS.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: FONTS.displayBold },
  headerSub: { color: "#EDE9FE", fontSize: 12, fontFamily: FONTS.medium, marginTop: 2 },

  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: "center", backgroundColor: "#F1F5F9" },
  tabActive: { backgroundColor: THEMES.wellness.purple },
  tabText: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  tabTextActive: { color: "#FFFFFF" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  emptyDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },

  card: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },
  cardCreator: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  joinedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  joinedText: { fontSize: 11, fontFamily: FONTS.bold, color: "#059669" },

  cardDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 19 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },

  badgesRow: { flexDirection: "row", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  badgeEarned: { backgroundColor: "#FEF3C7" },
  badgeName: { fontSize: 10, fontFamily: FONTS.semiBold, color: "#94A3B8" },
  badgeNameEarned: { color: "#92400E" },

  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: THEMES.wellness.purple, paddingVertical: 12, borderRadius: RADIUS.md },
  joinBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONTS.bold },
});
