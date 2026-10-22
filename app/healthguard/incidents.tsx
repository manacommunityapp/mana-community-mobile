import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { EmergencyIncidentDto } from "@/types/healthguard";

const SEVERITY_COLORS: Record<string, string> = {
  LEVEL_1_NOTICE: "#3b82f6",
  LEVEL_2_ATTENTION: "#f59e0b",
  LEVEL_3_POSSIBLE_EMERGENCY: "#f97316",
  LEVEL_4_CONFIRMED: "#dc2626",
};

const SEVERITY_LABELS: Record<string, string> = {
  LEVEL_1_NOTICE: "Notice",
  LEVEL_2_ATTENTION: "Attention",
  LEVEL_3_POSSIBLE_EMERGENCY: "Possible Emergency",
  LEVEL_4_CONFIRMED: "Emergency",
};

const STATUS_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  ACTIVE: { name: "warning", color: "#dc2626" },
  ACKNOWLEDGED: { name: "time", color: "#f59e0b" },
  RESOLVED: { name: "checkmark-circle", color: "#22c55e" },
  CANCELLED: { name: "close-circle", color: "#94a3b8" },
  ESCALATED: { name: "alert-circle", color: "#dc2626" },
};

function formatDuration(start?: string, end?: string): string {
  if (!start) return "-";
  const mins = Math.round((new Date(end ?? new Date().toISOString()).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function IncidentsScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<EmergencyIncidentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await healthGuardService.getIncidentHistory();
      setIncidents(list);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = incidents.filter(i => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return ["ACTIVE", "ACKNOWLEDGED", "ESCALATED"].includes(i.status ?? "");
    return ["RESOLVED", "CANCELLED"].includes(i.status ?? "");
  });

  const activeCnt = incidents.filter(i => ["ACTIVE", "ACKNOWLEDGED", "ESCALATED"].includes(i.status ?? "")).length;
  const resolvedCnt = incidents.filter(i => ["RESOLVED", "CANCELLED"].includes(i.status ?? "")).length;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.PRIMARY} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.PRIMARY} />}
    >
      {/* Nav */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Incident History</Text>
        <Text style={styles.count}>{incidents.length} total</Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {([["ALL", incidents.length], ["ACTIVE", activeCnt], ["RESOLVED", resolvedCnt]] as const).map(([f, cnt]) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "ALL" ? `All (${cnt})` : f === "ACTIVE" ? `Active (${cnt})` : `Resolved (${cnt})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Incidents */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark-outline" size={40} color="#22c55e" />
          <Text style={styles.emptyTitle}>No incidents</Text>
          <Text style={styles.emptySub}>{filter === "ALL" ? "You haven't triggered any SOS alerts yet" : `No ${filter.toLowerCase()} incidents`}</Text>
        </View>
      ) : (
        filtered.map(inc => {
          const key = inc.incidentUuid ?? String(inc.id);
          const isExp = expanded === key;
          const statusCfg = STATUS_ICONS[inc.status ?? "RESOLVED"];
          const sevColor = SEVERITY_COLORS[inc.severity ?? ""] ?? "#64748b";
          return (
            <TouchableOpacity
              key={key}
              style={[styles.card, inc.status === "ACTIVE" && styles.cardActive]}
              activeOpacity={0.8}
              onPress={() => setExpanded(isExp ? null : key)}
            >
              <View style={styles.cardRow}>
                <Ionicons name={statusCfg.name} size={20} color={statusCfg.color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {inc.description || `${(inc.triggerType ?? "MANUAL_SOS").replace(/_/g, " ")} — SOS`}
                  </Text>
                  <Text style={styles.cardSub}>
                    {inc.triggeredAt ? new Date(inc.triggeredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                    {"  ·  "}
                    {formatDuration(inc.triggeredAt, inc.resolvedAt)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[styles.severityBadge, { borderColor: sevColor + "60", backgroundColor: sevColor + "15" }]}>
                    <Text style={[styles.severityBadgeText, { color: sevColor }]}>{SEVERITY_LABELS[inc.severity ?? ""] ?? inc.severity}</Text>
                  </View>
                  <Ionicons name={isExp ? "chevron-up" : "chevron-down"} size={14} color={COLORS.TEXT_SECONDARY} />
                </View>
              </View>

              {isExp && (
                <View style={styles.expandBody}>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: statusCfg.color }]}>{inc.status}</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Alerts sent</Text><Text style={styles.detailValue}>{inc.alertsSent ?? 0} contacts</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Trigger</Text><Text style={styles.detailValue}>{(inc.triggerType ?? "").replace(/_/g, " ")}</Text></View>
                    {inc.locationAddress && <View style={styles.detailItem}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{inc.locationAddress}</Text></View>}
                  </View>
                  {inc.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}><Text style={{ fontWeight: "700", color: COLORS.TEXT_PRIMARY }}>Notes: </Text>{inc.notes}</Text>
                    </View>
                  )}
                  {inc.notifications && inc.notifications.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.detailLabel}>Notifications</Text>
                      {inc.notifications.map((n, i) => (
                        <View key={i} style={styles.notifRow}>
                          <Text style={styles.notifName}>{n.recipientName ?? n.recipientPhone}</Text>
                          <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>{n.status}</Text></View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: SPACING.MD, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  backIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOWS.SM },
  navTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  count: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  filterPillActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  filterText: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_SECONDARY },
  filterTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: COLORS.TEXT_SECONDARY, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 14, marginBottom: 8, ...SHADOWS.SM },
  cardActive: { borderWidth: 1.5, borderColor: "#fca5a5" },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  cardSub: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 2 },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  severityBadgeText: { fontSize: 10, fontWeight: "600" },
  expandBody: { borderTopWidth: 1, borderTopColor: "#f1f5f9", marginTop: 10, paddingTop: 10 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  detailItem: { minWidth: "45%" },
  detailLabel: { fontSize: 10, color: COLORS.TEXT_SECONDARY, marginBottom: 1 },
  detailValue: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  notesBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 8 },
  notesText: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  notifRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  notifName: { fontSize: 12, color: COLORS.TEXT_PRIMARY },
  notifBadge: { backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  notifBadgeText: { fontSize: 10, color: COLORS.TEXT_SECONDARY },
});
