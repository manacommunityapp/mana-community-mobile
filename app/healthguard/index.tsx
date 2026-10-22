import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { HealthProfileDto, EmergencyContactDto, EmergencyIncidentDto } from "@/types/healthguard";

const EMERGENCY_NUMBERS = [
  { num: "112", label: "Emergency", color: "#dc2626" },
  { num: "108", label: "Ambulance", color: "#ea580c" },
  { num: "100", label: "Police", color: "#2563eb" },
  { num: "101", label: "Fire", color: "#dc2626" },
];

export default function HealthGuardDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<HealthProfileDto | null>(null);
  const [contacts, setContacts] = useState<EmergencyContactDto[]>([]);
  const [activeIncident, setActiveIncident] = useState<EmergencyIncidentDto | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<EmergencyIncidentDto[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, contactsRes, activeRes, historyRes] = await Promise.all([
        healthGuardService.getProfile(),
        healthGuardService.getContacts(),
        healthGuardService.getActiveIncident(),
        healthGuardService.getIncidentHistory(),
      ]);
      setProfile(profileRes);
      setContacts(contactsRes);
      setActiveIncident(activeRes);
      setRecentIncidents(historyRes.slice(0, 3));
    } catch {
      // seed data already returned by service
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading HealthGuard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.PRIMARY} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={22} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.title}>Mana HealthGuard</Text>
            <Text style={styles.subtitle}>Smart Emergency Response</Text>
          </View>
        </View>
      </View>

      {/* Active incident banner */}
      {activeIncident && (
        <View style={styles.activeBanner}>
          <Ionicons name="warning" size={20} color="#dc2626" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>Active Emergency</Text>
            <Text style={styles.bannerSub}>{activeIncident.description || "SOS triggered"} · {activeIncident.alertsSent ?? 0} contacts alerted</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/healthguard/incidents")} style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SOS button */}
      <TouchableOpacity style={styles.sosBtn} activeOpacity={0.85} onPress={() => router.push("/healthguard/sos")}>
        <Ionicons name="warning" size={32} color="#fff" />
        <Text style={styles.sosBtnText}>SOS</Text>
        <Text style={styles.sosBtnSub}>Tap to trigger emergency alert</Text>
      </TouchableOpacity>

      {/* Emergency numbers */}
      <Text style={styles.sectionTitle}>Emergency Numbers</Text>
      <View style={styles.numGrid}>
        {EMERGENCY_NUMBERS.map(({ num, label, color }) => (
          <TouchableOpacity key={num} style={[styles.numCard, { borderColor: color + "30" }]} onPress={() => Linking.openURL(`tel:${num}`)}>
            <Ionicons name="call" size={18} color={color} />
            <Text style={[styles.numText, { color }]}>{num}</Text>
            <Text style={styles.numLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push("/healthguard/contacts")}>
          <Ionicons name="people" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.statNum}>{contacts.length}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
          <Text style={styles.statNum}>{recentIncidents.filter(i => i.status === "RESOLVED").length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push("/healthguard/incidents")}>
          <Ionicons name="time" size={20} color="#f59e0b" />
          <Text style={styles.statNum}>{recentIncidents.length}</Text>
          <Text style={styles.statLabel}>Incidents</Text>
        </TouchableOpacity>
      </View>

      {/* Phase 2 — Community services */}
      <Text style={styles.sectionTitle}>Community Services</Text>
      <View style={styles.serviceRow}>
        <TouchableOpacity style={[styles.serviceCard, { borderColor: "#3B82F630" }]} onPress={() => router.push("/healthguard/responder")}>
          <View style={[styles.serviceIcon, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="shield-checkmark" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.serviceName}>Responder Hub</Text>
          <Text style={styles.serviceDesc}>Register as community responder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.serviceCard, { borderColor: "#EF444430" }]} onPress={() => router.push("/healthguard/ambulance")}>
          <View style={[styles.serviceIcon, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="car" size={22} color="#EF4444" />
          </View>
          <Text style={styles.serviceName}>Ambulance</Text>
          <Text style={styles.serviceDesc}>Book emergency transport</Text>
        </TouchableOpacity>
      </View>

      {/* Phase 4 — Wearable */}
      <Text style={styles.sectionTitle}>Wearable Monitor</Text>
      <TouchableOpacity style={[styles.wearableBanner]} onPress={() => router.push("/healthguard/wearable")}>
        <View style={styles.wearableBannerLeft}>
          <Text style={styles.wearableBannerIcon}>⌚</Text>
          <View>
            <Text style={styles.wearableBannerTitle}>Connect Wearable</Text>
            <Text style={styles.wearableBannerSub}>Fall detection · Heart rate alerts · SpO₂ monitoring</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
      </TouchableOpacity>

      {/* Blood group */}
      {profile?.bloodGroup && profile.bloodGroup !== "UNKNOWN" && (
        <View style={styles.profileCard}>
          <Ionicons name="medical" size={18} color="#ef4444" />
          <Text style={styles.profileText}>Blood Group: <Text style={styles.profileBold}>{profile.bloodGroup.replace("_", "+")}</Text></Text>
        </View>
      )}

      {/* Top contacts */}
      {contacts.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity onPress={() => router.push("/healthguard/contacts")}>
              <Text style={styles.seeAll}>Manage</Text>
            </TouchableOpacity>
          </View>
          {contacts.slice(0, 2).map(c => (
            <View key={c.id} style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone} · {c.relationship}</Text>
              </View>
              {c.notifyOnSos && (
                <View style={styles.sosBadge}>
                  <Text style={styles.sosBadgeText}>SOS</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: SPACING.MD, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.TEXT_SECONDARY, fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fecaca" },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  subtitle: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 1 },
  activeBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: RADIUS.MD, padding: 12, marginBottom: 14 },
  bannerTitle: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
  bannerSub: { fontSize: 11, color: "#ef4444", marginTop: 1 },
  bannerBtn: { backgroundColor: "#dc2626", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  bannerBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sosBtn: { backgroundColor: "#dc2626", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20, ...SHADOWS.MD },
  sosBtnText: { fontSize: 32, fontWeight: "900", color: "#fff", marginTop: 6, letterSpacing: 4 },
  sosBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY, marginBottom: 10, marginTop: 4 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 4 },
  seeAll: { fontSize: 12, color: COLORS.PRIMARY, fontWeight: "600" },
  numGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  numCard: { flex: 1, minWidth: "22%", backgroundColor: "#fff", borderRadius: RADIUS.MD, borderWidth: 1, padding: 10, alignItems: "center", gap: 3, ...SHADOWS.SM },
  numText: { fontSize: 16, fontWeight: "800" },
  numLabel: { fontSize: 9, color: COLORS.TEXT_SECONDARY, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 14, alignItems: "center", gap: 4, ...SHADOWS.SM },
  statNum: { fontSize: 20, fontWeight: "800", color: COLORS.TEXT_PRIMARY },
  statLabel: { fontSize: 10, color: COLORS.TEXT_SECONDARY },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 12, marginBottom: 14, ...SHADOWS.SM },
  profileText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  profileBold: { fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  contactRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 12, marginBottom: 8, ...SHADOWS.SM },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 10 },
  contactInitial: { fontSize: 16, fontWeight: "700", color: "#1d4ed8" },
  contactName: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  contactPhone: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 1 },
  sosBadge: { backgroundColor: "#fef2f2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#fca5a5" },
  sosBadgeText: { fontSize: 10, fontWeight: "700", color: "#dc2626" },
  wearableBanner: {
    backgroundColor: "#eff6ff", borderRadius: RADIUS.MD, padding: SPACING.MD,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#bfdbfe", marginBottom: 14, ...SHADOWS.SM,
  },
  wearableBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  wearableBannerIcon: { fontSize: 32 },
  wearableBannerTitle: { fontSize: 15, fontWeight: "700", color: "#1e40af" },
  wearableBannerSub: { fontSize: 12, color: "#3b82f6", marginTop: 2 },
  serviceRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  serviceCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.MD,
    borderWidth: 1, padding: 12, alignItems: "center", gap: 6, ...SHADOWS.SM,
  },
  serviceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceName: { fontSize: 12, fontWeight: "700", color: COLORS.TEXT_PRIMARY, textAlign: "center" },
  serviceDesc: { fontSize: 10, color: COLORS.TEXT_SECONDARY, textAlign: "center" },
});
