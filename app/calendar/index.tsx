import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { COLORS, SPACING, RADIUS, SHADOWS } from "@/constants/config";
import { manaCalendarService } from "@/services/manaCalendarService";
import type { CalendarDomain, CalendarEventItem } from "@/types/manaCalendar";

const DOMAINS: { key: CalendarDomain | "ALL"; label: string; icon: string; color: string }[] = [
  { key: "ALL", label: "All", icon: "calendar-outline", color: COLORS.primary },
  { key: "EVENT", label: "Events", icon: "sparkles-outline", color: "#8B5CF6" },
  { key: "POOJA", label: "Pooja", icon: "flame-outline", color: "#F97316" },
  { key: "SPORTS", label: "Sports", icon: "trophy-outline", color: "#10B981" },
  { key: "ACADEMY", label: "Academy", icon: "school-outline", color: "#6366F1" },
  { key: "TRIP", label: "Trips", icon: "compass-outline", color: "#06B6D4" },
  { key: "GOVERNANCE", label: "Gov", icon: "shield-checkmark-outline", color: "#F59E0B" },
  { key: "GROUP_BUY_PICKUP", label: "Pickup", icon: "bag-handle-outline", color: "#F43F5E" },
  { key: "BOOKING", label: "Booking", icon: "bookmark-outline", color: "#3B82F6" },
  { key: "PAYMENT", label: "Bills", icon: "card-outline", color: "#EF4444" },
  { key: "MAINTENANCE", label: "Maint", icon: "construct-outline", color: "#64748B" },
  { key: "COMMUNITY_MARKET", label: "Markets", icon: "cart-outline", color: "#14B8A6" },
];

export default function ManaCalendarScreen() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState<CalendarDomain | "ALL">("ALL");
  const [onlyMine, setOnlyMine] = useState(false);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["mana-calendar-timeline", selectedDomain, onlyMine],
    queryFn: () =>
      manaCalendarService.getTimeline({
        domain: selectedDomain === "ALL" ? undefined : selectedDomain,
        onlyMine: onlyMine ? true : undefined,
      }),
  });

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="calendar" size={12} color="#67E8F9" />
          <Text style={styles.badgeText}>Mana Unified Timeline</Text>
        </View>
        <Text style={styles.bannerTitle}>Community Calendar</Text>
        <Text style={styles.bannerSub}>11 domains synchronized into one schedule</Text>

        <TouchableOpacity
          style={[styles.mineToggle, onlyMine && styles.mineToggleActive]}
          onPress={() => setOnlyMine(!onlyMine)}
        >
          <Ionicons name={onlyMine ? "checkbox" : "square-outline"} size={16} color="#FFFFFF" />
          <Text style={styles.mineToggleText}>My Schedule Only</Text>
        </TouchableOpacity>
      </View>

      {/* Domain Filters Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterStrip}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}
      >
        {DOMAINS.map((dom) => {
          const isActive = selectedDomain === dom.key;
          return (
            <TouchableOpacity
              key={dom.key}
              onPress={() => setSelectedDomain(dom.key)}
              style={[styles.filterChip, isActive && { backgroundColor: dom.color }]}
            >
              <Ionicons name={dom.icon as any} size={13} color={isActive ? "#FFFFFF" : dom.color} />
              <Text style={[styles.filterChipText, isActive && { color: "#FFFFFF" }]}>{dom.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Events List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Scheduled Items</Text>
            <Text style={styles.emptySub}>No events found for the selected filter.</Text>
          </View>
        ) : (
          events.map((ev: CalendarEventItem) => (
            <View key={ev.id} style={styles.card}>
              <View style={[styles.accentBar, { backgroundColor: ev.color || COLORS.primary }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.domainLabel, { color: ev.color || COLORS.primary }]}>
                    {ev.domain.replace(/_/g, " ")}
                  </Text>
                  {ev.badge && (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgePillText}>{ev.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{ev.title}</Text>
                {ev.description && <Text style={styles.cardDesc} numberOfLines={2}>{ev.description}</Text>}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#64748B" />
                    <Text style={styles.metaText}>
                      {formatDate(ev.startTime)} • {formatTime(ev.startTime)}
                    </Text>
                  </View>
                </View>

                {ev.location && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>{ev.location}</Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  {ev.googleCalendarUrl ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(ev.googleCalendarUrl!)}
                      style={styles.calLinkBtn}
                    >
                      <Ionicons name="logo-google" size={12} color="#475569" />
                      <Text style={styles.calLinkText}>+ Google Cal</Text>
                    </TouchableOpacity>
                  ) : <View />}

                  <TouchableOpacity
                    onPress={() => {
                      if (ev.targetRoute) router.push(ev.targetRoute as any);
                    }}
                    style={[styles.actionBtn, { backgroundColor: ev.color || COLORS.primary }]}
                  >
                    <Text style={styles.actionBtnText}>{ev.actionLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  banner: {
    backgroundColor: "#0F172A",
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  badgeText: { color: "#67E8F9", fontSize: 10, fontWeight: "700" },
  bannerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  bannerSub: { color: "#94A3B8", fontSize: 12, marginTop: 2, marginBottom: 10 },
  mineToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  mineToggleActive: { backgroundColor: "#0891B2" },
  mineToggleText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  filterStrip: { backgroundColor: "#FFFFFF", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#E2E8F0" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  filterChipText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  list: { flex: 1 },
  listContent: { padding: SPACING.md },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  accentBar: { width: 5 },
  cardBody: { flex: 1, padding: SPACING.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  domainLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  badgePill: { backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  badgePillText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#64748B", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  calLinkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  calLinkText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  actionBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyWrap: { alignItems: "center", marginTop: 60, padding: SPACING.lg },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#334155", marginTop: 8 },
  emptySub: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 4 },
});
