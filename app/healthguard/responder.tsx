import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, RADIUS, SHADOWS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { EmergencyIncidentDto } from "@/types/healthguard";

type Availability = "AVAILABLE" | "BUSY" | "OFFLINE";

interface ResponderProfile {
  id: number;
  isActive: boolean;
  availabilityStatus: Availability;
  skills: string;
  certifications: string;
  phoneNumber: string;
  totalResponseCount: number;
  registeredAt: string;
}

const STATUS_COLOR: Record<Availability, string> = {
  AVAILABLE: "#10B981",
  BUSY: "#F59E0B",
  OFFLINE: "#6B7280",
};

const STATUS_LABEL: Record<Availability, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  OFFLINE: "Offline",
};

export default function ResponderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ResponderProfile | null>(null);
  const [communityCount, setCommunityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ skills: "", certifications: "", phoneNumber: "" });
  const [activeIncidents, setActiveIncidents] = useState<EmergencyIncidentDto[]>([]);

  const load = useCallback(async () => {
    const [p, count, history] = await Promise.all([
      healthGuardService.getMyResponderProfile().catch(() => null),
      healthGuardService.getAvailableRespondersCount().catch(() => 0),
      healthGuardService.getIncidentHistory().catch(() => [] as EmergencyIncidentDto[]),
    ]);
    setProfile(p as ResponderProfile | null);
    setCommunityCount(count as number);
    if (p) setForm({ skills: (p as ResponderProfile).skills ?? "", certifications: (p as ResponderProfile).certifications ?? "", phoneNumber: (p as ResponderProfile).phoneNumber ?? "" });
    setActiveIncidents((history as EmergencyIncidentDto[]).filter(i => i.status === "ACTIVE" || i.status === "ACKNOWLEDGED").slice(0, 5));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (!form.skills.trim()) {
      Alert.alert("Required", "Please enter at least one skill.");
      return;
    }
    setSaving(true);
    try {
      const p = await healthGuardService.registerAsResponder(form);
      setProfile(p);
      setShowForm(false);
      Alert.alert("Registered!", "You are now a community responder. Thank you!");
    } catch {
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: Availability) => {
    if (!profile) return;
    setSaving(true);
    try {
      const p = await healthGuardService.updateResponderStatus(status);
      const prev = profile.availabilityStatus;
      setProfile(p);
      if (status === "AVAILABLE" && prev !== "AVAILABLE") setCommunityCount(c => c + 1);
      else if (status !== "AVAILABLE" && prev === "AVAILABLE") setCommunityCount(c => Math.max(0, c - 1));
    } catch {
      Alert.alert("Error", "Could not update status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Responder Hub</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Responder Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3B82F6" />}
      >
        {/* Community count */}
        <View style={styles.statsCard}>
          <Ionicons name="people" size={22} color="#3B82F6" />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.statsNum}>{communityCount}</Text>
            <Text style={styles.statsLabel}>Responders available in your community</Text>
          </View>
        </View>

        {profile ? (
          <>
            {/* Status card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Your Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[profile.availabilityStatus] + "22" }]}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[profile.availabilityStatus] }]} />
                  <Text style={[styles.statusText, { color: STATUS_COLOR[profile.availabilityStatus] }]}>
                    {STATUS_LABEL[profile.availabilityStatus]}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                {profile.skills ? <Text style={styles.detailLine}>Skills: {profile.skills}</Text> : null}
                {profile.certifications ? <Text style={styles.detailLine}>Certs: {profile.certifications}</Text> : null}
                {profile.phoneNumber ? <Text style={styles.detailLine}>Phone: {profile.phoneNumber}</Text> : null}
                <Text style={styles.detailLine}>Total responses: {profile.totalResponseCount}</Text>
              </View>

              <Text style={styles.fieldLabel}>Change Status</Text>
              <View style={styles.statusBtns}>
                {(["AVAILABLE", "BUSY", "OFFLINE"] as Availability[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusBtn,
                      profile.availabilityStatus === s && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] },
                    ]}
                    onPress={() => handleStatusChange(s)}
                    disabled={saving || profile.availabilityStatus === s}
                  >
                    <Text style={[styles.statusBtnText, profile.availabilityStatus === s && { color: "#fff" }]}>
                      {STATUS_LABEL[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Update profile */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Update Profile</Text>
              <Text style={styles.fieldLabel}>Skills</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. First Aid, CPR, Firefighting"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                value={form.skills}
                onChangeText={t => setForm(f => ({ ...f, skills: t }))}
              />
              <Text style={styles.fieldLabel}>Certifications</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. BLS Certified, NDRF Trained"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                value={form.certifications}
                onChangeText={t => setForm(f => ({ ...f, certifications: t }))}
              />
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={form.phoneNumber}
                onChangeText={t => setForm(f => ({ ...f, phoneNumber: t }))}
              />
              <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleRegister} disabled={saving}>
                <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Update Profile"}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register as Responder</Text>
            <Text style={styles.helpText}>
              Registering makes your availability visible to neighbors when an SOS is triggered.
            </Text>
            <Text style={styles.fieldLabel}>Skills *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. First Aid, CPR, Firefighting"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              value={form.skills}
              onChangeText={t => setForm(f => ({ ...f, skills: t }))}
            />
            <Text style={styles.fieldLabel}>Certifications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. BLS Certified, NDRF Trained"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              value={form.certifications}
              onChangeText={t => setForm(f => ({ ...f, certifications: t }))}
            />
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={form.phoneNumber}
              onChangeText={t => setForm(f => ({ ...f, phoneNumber: t }))}
            />
            <View style={styles.formBtns}>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, saving && { opacity: 0.6 }]} onPress={handleRegister} disabled={saving}>
                <Text style={styles.primaryBtnText}>{saving ? "Registering..." : "Register"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark" size={48} color="#3B82F6" />
              <Text style={styles.emptyTitle}>Become a Community Responder</Text>
              <Text style={styles.emptyText}>
                Help your neighbors during emergencies. Your availability will show up when someone nearby triggers an SOS.
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>  Register as Responder</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Active community incidents feed */}
        {profile?.availabilityStatus === "AVAILABLE" && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Active Community Incidents</Text>
              <TouchableOpacity onPress={() => router.push('/healthguard/incidents')}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {activeIncidents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                <Text style={styles.emptyText}>All clear — no active incidents nearby</Text>
              </View>
            ) : (
              activeIncidents.map(inc => (
                <View key={inc.id} style={styles.incidentRow}>
                  <View style={[styles.incidentDot, { backgroundColor: inc.status === "ACTIVE" ? "#ef4444" : "#f59e0b" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incidentDesc} numberOfLines={1}>{inc.description || "Manual SOS"}</Text>
                    <Text style={styles.incidentMeta}>
                      {inc.status} · {inc.triggeredAt ? new Date(inc.triggeredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary ?? "#9CA3AF"} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? "#F9FAFB" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface ?? "#fff", ...SHADOWS.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: COLORS.textSecondary ?? "#6B7280", fontSize: 14 },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  statsCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.sm,
  },
  statsNum: { fontSize: 24, fontWeight: "800", color: "#1D4ED8" },
  statsLabel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface ?? "#fff", borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.sm, gap: SPACING.sm,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: RADIUS.sm ?? 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  detailsBox: { gap: 3 },
  detailLine: { fontSize: 13, color: COLORS.textSecondary ?? "#6B7280" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  statusBtns: { flexDirection: "row", gap: SPACING.sm },
  statusBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border ?? "#E5E7EB",
    borderRadius: RADIUS.md, paddingVertical: 8, alignItems: "center",
  },
  statusBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  input: {
    borderWidth: 1, borderColor: COLORS.border ?? "#E5E7EB",
    borderRadius: RADIUS.md, padding: SPACING.sm,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background ?? "#F9FAFB",
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  helpText: { fontSize: 13, color: COLORS.textSecondary ?? "#6B7280", lineHeight: 18 },
  formBtns: { flexDirection: "row", gap: SPACING.sm },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#3B82F6", borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  outlineBtn: {
    borderWidth: 1.5, borderColor: COLORS.border ?? "#E5E7EB",
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    justifyContent: "center", alignItems: "center",
  },
  outlineBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  emptyBox: { alignItems: "center", paddingVertical: SPACING.md, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  emptyText: { fontSize: 13, color: COLORS.textSecondary ?? "#6B7280", textAlign: "center", lineHeight: 18 },
  viewAll: { fontSize: 13, color: "#3B82F6", fontWeight: "600" },
  incidentRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border ?? "#E5E7EB",
  },
  incidentDot: { width: 8, height: 8, borderRadius: 4 },
  incidentDesc: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  incidentMeta: { fontSize: 11, color: COLORS.textSecondary ?? "#6B7280", marginTop: 2 },
});
