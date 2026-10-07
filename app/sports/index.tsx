import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { sportsService } from "@/services/sportsService";
import { ScoreCard } from "@/components/sports/ScoreCard";
import { TournamentCard } from "@/components/sports/TournamentCard";
import { PLAYO_THEME, POPULAR_SPORTS } from "@/constants/playoTheme";

const QUICK_ACTIONS = [
  { emoji: "🏸", label: "Book Venues", desc: "Courts & Turfs", route: "/facilities" },
  { emoji: "👥", label: "Join Games", desc: "Find Players", route: "/sports/matches" },
  { emoji: "🏆", label: "Tournaments", desc: "League Cups", route: "/sports/tournaments" },
  { emoji: "📊", label: "Leaderboard", desc: "Rankings", route: "/sports/leaderboard" },
];

export default function SportsHubScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<string>("all");

  const { data: liveMatches = [], isLoading: loadingLive, refetch, isRefetching } = useQuery({
    queryKey: ["sports-live"],
    queryFn: sportsService.getLiveMatches,
    refetchInterval: 15_000,
  });

  const { data: todayMatches = [], isLoading: loadingToday } = useQuery({
    queryKey: ["sports-today"],
    queryFn: sportsService.getTodayMatches,
    refetchInterval: 60_000,
  });

  const { data: tournamentsPage } = useQuery({
    queryKey: ["tournaments-hub"],
    queryFn: () => sportsService.getTournaments(undefined, "ONGOING"),
  });
  const ongoingTournaments = tournamentsPage?.content.slice(0, 3) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Playo Top Header with Location Pill */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.playoLogoWrap}>
            <Text style={styles.playoLogoText}>playo</Text>
            <View style={styles.playoDot} />
          </View>
          <TouchableOpacity style={styles.locationPill} activeOpacity={0.8}>
            <Ionicons name="location" size={14} color={PLAYO_THEME.colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>Mana Community Arena</Text>
            <Ionicons name="chevron-down" size={12} color={PLAYO_THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {liveMatches.length > 0 && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{liveMatches.length} Live</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PLAYO_THEME.colors.primary} />}
      >
        {/* Playo Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextContent}>
            <View style={styles.karmaBadge}>
              <Text style={styles.karmaBadgeText}>⚡ COMMUNITY SPORTS PLATFORM</Text>
            </View>
            <Text style={styles.heroTitle}>Book Venues. Join Games. Find Players.</Text>
            <Text style={styles.heroSub}>
              The trusted sports network inside Mana Community. Book badminton, cricket, pickleball courts & team up.
            </Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push("/facilities")}
              activeOpacity={0.9}
            >
              <Text style={styles.heroBtnText}>Book a Court Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Sports Carousel (Playo Aspect Cards) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Popular Sports</Text>
            <Text style={styles.sectionSubTitle}>Tap to explore games & courts</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
            {POPULAR_SPORTS.map(sport => (
              <TouchableOpacity
                key={sport.id}
                style={styles.sportCard}
                onPress={() => router.push("/facilities")}
                activeOpacity={0.88}
              >
                <ImageBackground
                  source={{ uri: sport.imageUrl }}
                  style={styles.sportCardBg}
                  imageStyle={styles.sportCardImg}
                >
                  <View style={styles.sportCardScrim}>
                    <View style={styles.sportCardTopBadge}>
                      <Text style={styles.sportCardEmoji}>{sport.emoji}</Text>
                    </View>
                    <View style={styles.sportCardBottom}>
                      <Text style={styles.sportName}>{sport.name}</Text>
                      <Text style={styles.sportStats}>
                        {sport.activePlayers} players • {sport.courtsAvailable} courts
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Action Hub */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.85}
            >
              <View style={styles.quickEmojiWrap}>
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
              <Text style={styles.quickDesc}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🔴 Live Matches</Text>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>IN PLAY</Text>
              </View>
            </View>
            <View style={styles.cardsWrap}>
              {liveMatches.map(m => (
                <ScoreCard key={m.id} match={m} />
              ))}
            </View>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => router.push("/sports/matches")}>
              <Text style={styles.seeAllText}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loadingToday ? (
            <ActivityIndicator color={PLAYO_THEME.colors.primary} />
          ) : todayMatches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No matches scheduled for today.</Text>
              <TouchableOpacity
                style={styles.hostMatchBtn}
                onPress={() => router.push("/sports/matches")}
              >
                <Text style={styles.hostMatchBtnText}>+ Host a Friendly Game</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsWrap}>
              {todayMatches.slice(0, 3).map(m => (
                <ScoreCard key={m.id} match={m} />
              ))}
            </View>
          )}
        </View>

        {/* Ongoing Tournaments */}
        {ongoingTournaments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🏆 Active Tournaments</Text>
              <TouchableOpacity onPress={() => router.push("/sports/tournaments")}>
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardsWrap}>
              {ongoingTournaments.map(t => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PLAYO_THEME.colors.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PLAYO_THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: PLAYO_THEME.colors.borderSubtle,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  playoLogoWrap: { flexDirection: "row", alignItems: "baseline" },
  playoLogoText: { fontSize: 24, fontWeight: "900", color: PLAYO_THEME.colors.primary, letterSpacing: -0.5 },
  playoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PLAYO_THEME.colors.textMain, marginLeft: 2 },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PLAYO_THEME.colors.background,
    borderWidth: 1,
    borderColor: PLAYO_THEME.colors.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 190,
    ...PLAYO_THEME.shadows.pill,
  },
  locationText: { fontSize: 12, fontWeight: "600", color: PLAYO_THEME.colors.textMain, flexShrink: 1 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PLAYO_THEME.colors.liveRed },
  liveCount: { fontSize: 11, fontWeight: "bold", color: PLAYO_THEME.colors.liveRed },
  scrollContent: { padding: 16, gap: 18 },
  heroCard: {
    backgroundColor: PLAYO_THEME.colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: PLAYO_THEME.colors.borderSubtle,
    ...PLAYO_THEME.shadows.card,
  },
  heroTextContent: { gap: 8 },
  karmaBadge: { alignSelf: "flex-start", backgroundColor: PLAYO_THEME.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  karmaBadgeText: { fontSize: 10, fontWeight: "800", color: PLAYO_THEME.colors.primaryDark, letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: PLAYO_THEME.colors.textMain, lineHeight: 26, textTransform: "uppercase" },
  heroSub: { fontSize: 13, color: PLAYO_THEME.colors.textMuted, lineHeight: 18 },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PLAYO_THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
    ...PLAYO_THEME.shadows.buttonGreen,
  },
  heroBtnText: { fontSize: 14, fontWeight: "bold", color: "#FFFFFF" },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: PLAYO_THEME.colors.textMain },
  sectionSubTitle: { fontSize: 12, color: PLAYO_THEME.colors.textMuted },
  seeAllText: { fontSize: 13, fontWeight: "bold", color: PLAYO_THEME.colors.primary },
  sportsScroll: { gap: 12, paddingVertical: 4 },
  sportCard: {
    width: 140,
    height: 190,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: PLAYO_THEME.colors.background,
    borderWidth: 1,
    borderColor: PLAYO_THEME.colors.borderSubtle,
    ...PLAYO_THEME.shadows.card,
  },
  sportCardBg: { width: "100%", height: "100%" },
  sportCardImg: { borderRadius: 20 },
  sportCardScrim: {
    flex: 1,
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sportCardTopBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  sportCardEmoji: { fontSize: 14 },
  sportCardBottom: { gap: 2 },
  sportName: { fontSize: 15, fontWeight: "900", color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  sportStats: { fontSize: 10, color: "#E5E7EB", fontWeight: "600" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "48%",
    backgroundColor: PLAYO_THEME.colors.background,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PLAYO_THEME.colors.borderSubtle,
    gap: 4,
    ...PLAYO_THEME.shadows.card,
  },
  quickEmojiWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: PLAYO_THEME.colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  quickEmoji: { fontSize: 18 },
  quickLabel: { fontSize: 14, fontWeight: "800", color: PLAYO_THEME.colors.textMain },
  quickDesc: { fontSize: 11, color: PLAYO_THEME.colors.textMuted },
  cardsWrap: { gap: 10 },
  emptyCard: { backgroundColor: PLAYO_THEME.colors.background, padding: 20, borderRadius: 16, alignItems: "center", gap: 10, borderWidth: 1, borderColor: PLAYO_THEME.colors.borderSubtle },
  emptyText: { fontSize: 13, color: PLAYO_THEME.colors.textMuted },
  hostMatchBtn: { backgroundColor: PLAYO_THEME.colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  hostMatchBtnText: { color: PLAYO_THEME.colors.primaryDark, fontWeight: "bold", fontSize: 13 },
  liveTag: { backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  liveTagText: { color: "#DC2626", fontSize: 10, fontWeight: "bold" },
});