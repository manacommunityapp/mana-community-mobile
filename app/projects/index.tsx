import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getProjects, getProjectMetrics,
  type CommunityProjectDto, type ProjectMetricsDto,
} from "@/services/projectsService";
import { COLORS, SHADOWS, RADIUS, FONTS } from "@/constants/config";

const STAGE_ORDER = ["PROPOSAL","VOTING","APPROVED","PLANNING","PROCUREMENT","IN_PROGRESS","QUALITY_CHECK","COMPLETED"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PROPOSAL:     { label: "Proposal",     color: "#64748B", bg: "#F1F5F9" },
  VOTING:       { label: "Voting",        color: "#7C3AED", bg: "#F5F3FF" },
  APPROVED:     { label: "Approved",      color: "#2563EB", bg: "#EFF6FF" },
  PLANNING:     { label: "Planning",      color: "#D97706", bg: "#FFFBEB" },
  PROCUREMENT:  { label: "Procurement",   color: "#EA580C", bg: "#FFF7ED" },
  IN_PROGRESS:  { label: "In Progress",   color: "#059669", bg: "#ECFDF5" },
  QUALITY_CHECK:{ label: "QC Check",      color: "#0891B2", bg: "#ECFEFF" },
  COMPLETED:    { label: "Completed",     color: "#16A34A", bg: "#F0FDF4" },
};

function fmt(n?: number | null) {
  if (n == null || isNaN(n)) return "₹0";
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(1) + "Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1) + "L";
  return "₹" + (typeof n.toLocaleString === "function" ? n.toLocaleString("en-IN") : String(n));
}

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<CommunityProjectDto[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getProjects(), getProjectMetrics()])
      .then(([p, m]) => { setProjects(p); setMetrics(m); })
      .finally(() => setLoading(false));
  }, []);

  const displayed = projects.filter(p => {
    const matchFilter = filter === "ALL" || p.status === filter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4F46E5" />;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Gradient Header */}
      <LinearGradient
        colors={["#4338CA", "#4F46E5", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Community Projects</Text>
            <Text style={s.headerSub}>Governance → Finance → Completion</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push("/projects/create")} activeOpacity={0.85}>
            <Text style={s.addBtnText}>+ New Proposal</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Metrics Strip */}
      {metrics && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.metricsRow} contentContainerStyle={s.metricsContent}>
          {[
            { label: "Total Projects", value: metrics.totalProjects.toString(), color: "#4F46E5" },
            { label: "Active", value: metrics.activeProjects.toString(), color: "#059669" },
            { label: "Completed", value: metrics.completedProjects.toString(), color: "#0891B2" },
            { label: "Total Budget", value: fmt(metrics.totalApprovedBudget), color: "#7C3AED" },
            { label: "Total Spent", value: fmt(metrics.totalSpent), color: "#DC2626" },
            { label: "Avg Progress", value: metrics.avgCompletionPercent + "%", color: "#D97706" },
          ].map((m, i) => (
            <View key={i} style={s.metricCard}>
              <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          style={s.search}
          placeholder="Search projects (Lift, CCTV, Solar)..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Stage Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {["ALL", ...STAGE_ORDER].map(stage => (
          <TouchableOpacity
            key={stage}
            style={[s.filterChip, filter === stage && s.filterChipActive]}
            onPress={() => setFilter(stage)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterText, filter === stage && s.filterTextActive]}>
              {stage === "ALL" ? "All Projects" : STATUS_META[stage]?.label || stage}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Projects List */}
      <View style={s.listWrap}>
        {displayed.map(p => {
          const meta = STATUS_META[p.status] || { label: p.status, color: "#64748B", bg: "#F1F5F9" };
          return (
            <TouchableOpacity
              key={p.id}
              style={s.projectCard}
              onPress={() => router.push(`/projects/${p.id}`)}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <Text style={s.projectTitle}>{p.title}</Text>
                <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={s.desc} numberOfLines={2}>{p.description}</Text>
              {(() => {
                const percent = p.completionPercent ?? (p as any).completionPercentage ?? 0;
                const budgetAmount = p.budget?.approvedBudget ?? (p as any).estimatedBudget ?? 0;
                return (
                  <>
                    <View style={s.progressWrap}>
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={s.progressText}>{percent}%</Text>
                    </View>
                    <View style={s.cardFooter}>
                      <Text style={s.budgetText}>Budget: <Text style={s.budgetVal}>{fmt(budgetAmount)}</Text></Text>
                      <Text style={s.viewDetails}>View Details →</Text>
                    </View>
                  </>
                );
              })()}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, ...SHADOWS.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold", fontFamily: FONTS.displayBold, letterSpacing: -0.3 },
  headerSub: { color: "#EEF2FF", fontSize: 12, marginTop: 2, fontFamily: FONTS.medium },
  addBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  addBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12, fontFamily: FONTS.bold },
  metricsRow: { marginVertical: 12 },
  metricsContent: { paddingHorizontal: 16, gap: 10 },
  metricCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.lg, padding: 12, minWidth: 105, alignItems: "center", ...SHADOWS.card },
  metricValue: { fontSize: 17, fontWeight: "800", fontFamily: FONTS.displayBold },
  metricLabel: { fontSize: 11, color: "#64748B", marginTop: 2, fontFamily: FONTS.medium },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#E2E8F0", gap: 8, ...SHADOWS.sm },
  search: { flex: 1, fontSize: 13, color: "#0F172A", fontFamily: FONTS.regular },
  filterRow: { marginBottom: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: "#F1F5F9" },
  filterChipActive: { backgroundColor: "#4F46E5" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#475569", fontFamily: FONTS.medium },
  filterTextActive: { color: "#FFFFFF", fontWeight: "700" },
  listWrap: { paddingHorizontal: 16, gap: 12 },
  projectCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: RADIUS.squircle, borderWidth: 1, borderColor: "#E2E8F0", gap: 10, ...SHADOWS.card },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  projectTitle: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: FONTS.bold },
  desc: { fontSize: 12, color: "#64748B", fontFamily: FONTS.regular },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: "700", color: "#475569", fontFamily: FONTS.semiBold },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  budgetText: { fontSize: 12, color: "#64748B", fontFamily: FONTS.regular },
  budgetVal: { fontWeight: "700", color: "#0F172A", fontFamily: FONTS.semiBold },
  viewDetails: { fontSize: 12, fontWeight: "700", color: "#4F46E5", fontFamily: FONTS.semiBold }
});