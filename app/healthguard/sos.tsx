import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";
import type { EmergencyContactDto, IncidentSeverity } from "@/types/healthguard";

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; desc: string; color: string }[] = [
  { value: "LEVEL_1_NOTICE", label: "Health Notice", desc: "Feeling unwell", color: "#3b82f6" },
  { value: "LEVEL_2_ATTENTION", label: "Needs Attention", desc: "Moderate concern", color: "#f59e0b" },
  { value: "LEVEL_3_POSSIBLE_EMERGENCY", label: "Possible Emergency", desc: "May need help", color: "#f97316" },
  { value: "LEVEL_4_CONFIRMED", label: "Emergency", desc: "Send help now", color: "#dc2626" },
];

type Phase = "idle" | "confirm" | "triggering" | "triggered" | "error";

export default function SosScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [severity, setSeverity] = useState<IncidentSeverity>("LEVEL_3_POSSIBLE_EMERGENCY");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contacts, setContacts] = useState<EmergencyContactDto[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [alertsSent, setAlertsSent] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    healthGuardService.getContacts()
      .then(list => setContacts(list.filter(c => c.notifyOnSos && c.isActive !== false)))
      .catch(() => {});
  }, []);

  const startCountdown = useCallback(() => {
    setPhase("confirm");
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          triggerSos();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [severity, description, location]);

  const cancelCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase("idle");
  };

  const triggerSos = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase("triggering");
    try {
      const incident = await healthGuardService.triggerSos({
        description: description.trim() || undefined,
        severity,
        locationAddress: location.trim() || undefined,
        triggerType: "MANUAL_SOS",
      });
      setAlertsSent(incident.alertsSent ?? contacts.length);
      setPhase("triggered");
    } catch {
      setPhase("error");
    }
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const sosContacts = contacts.filter(c => c.notifyOnSos);

  /* ── Triggered ── */
  if (phase === "triggered") {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#22c55e" />
        </View>
        <Text style={styles.successTitle}>SOS Sent!</Text>
        <Text style={styles.successSub}>{alertsSent} contact{alertsSent !== 1 ? "s" : ""} notified</Text>
        <View style={styles.callRow}>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#dc2626" }]} onPress={() => Linking.openURL("tel:112")}>
            <Ionicons name="call" size={18} color="#fff" />
            <Text style={styles.callBtnText}>112</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#ea580c" }]} onPress={() => Linking.openURL("tel:108")}>
            <Ionicons name="call" size={18} color="#fff" />
            <Text style={styles.callBtnText}>108</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/healthguard")}>
          <Text style={styles.backBtnText}>Back to HealthGuard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Error ── */
  if (phase === "error") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="warning" size={48} color="#dc2626" />
        <Text style={styles.successTitle}>SOS Failed</Text>
        <Text style={styles.successSub}>Call 112 directly</Text>
        <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#dc2626", paddingHorizontal: 32, marginTop: 8 }]} onPress={() => Linking.openURL("tel:112")}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.callBtnText}>Call 112</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => setPhase("idle")}>
          <Text style={styles.backBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Triggering ── */
  if (phase === "triggering") {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.successSub}>Sending SOS alert...</Text>
      </View>
    );
  }

  /* ── Confirm (countdown) ── */
  if (phase === "confirm") {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.countdownCircle}>
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
        <Text style={styles.successTitle}>Sending in {countdown}s</Text>
        <Text style={styles.successSub}>{sosContacts.length} contact{sosContacts.length !== 1 ? "s" : ""} will be notified</Text>
        <View style={styles.callRow}>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#dc2626", flex: 1 }]} onPress={triggerSos}>
            <Text style={styles.callBtnText}>Send Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#e2e8f0", flex: 1 }]} onPress={cancelCountdown}>
            <Text style={[styles.callBtnText, { color: COLORS.TEXT_PRIMARY }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.callRow}>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#dc2626" }]} onPress={() => Linking.openURL("tel:112")}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBtnText}>112</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#ea580c" }]} onPress={() => Linking.openURL("tel:108")}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBtnText}>108</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Idle form ── */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Emergency SOS</Text>
      </View>

      {/* Emergency call strip */}
      <View style={styles.callStrip}>
        {[{ num: "112", label: "Emergency", bg: "#dc2626" }, { num: "108", label: "Ambulance", bg: "#ea580c" }, { num: "100", label: "Police", bg: "#2563eb" }].map(({ num, label, bg }) => (
          <TouchableOpacity key={num} style={[styles.stripBtn, { backgroundColor: bg }]} onPress={() => Linking.openURL(`tel:${num}`)}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={styles.stripNum}>{num}</Text>
            <Text style={styles.stripLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <Text style={styles.label}>Severity</Text>
      {SEVERITY_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.severityRow, severity === opt.value && { borderColor: opt.color, backgroundColor: opt.color + "12" }]}
          onPress={() => setSeverity(opt.value)}
        >
          <View style={[styles.radio, severity === opt.value && { borderColor: opt.color }]}>
            {severity === opt.value && <View style={[styles.radioDot, { backgroundColor: opt.color }]} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.severityLabel, severity === opt.value && { color: opt.color }]}>{opt.label}</Text>
            <Text style={styles.severityDesc}>{opt.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Description */}
      <Text style={[styles.label, { marginTop: 14 }]}>What's happening? <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        style={styles.textArea}
        placeholder="e.g. Chest pain, fell down, feeling faint..."
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Location */}
      <Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Block A, Flat 302"
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        value={location}
        onChangeText={setLocation}
      />

      {/* Who will be notified */}
      <View style={styles.notifyCard}>
        <View style={styles.notifyHeader}>
          <Ionicons name="people" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.notifyTitle}>Who will be notified</Text>
          <View style={styles.notifyBadge}>
            <Text style={styles.notifyBadgeText}>{sosContacts.length}</Text>
          </View>
        </View>
        {sosContacts.length === 0 ? (
          <TouchableOpacity onPress={() => router.push("/healthguard/contacts")}>
            <Text style={styles.addContactLink}>No SOS contacts. Tap to add →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.chipRow}>
            {sosContacts.slice(0, 4).map(c => (
              <View key={c.id} style={styles.chip}>
                <Text style={styles.chipText}>{c.name}</Text>
              </View>
            ))}
            {sosContacts.length > 4 && <Text style={styles.moreText}>+{sosContacts.length - 4} more</Text>}
          </View>
        )}
      </View>

      {/* SOS button */}
      <TouchableOpacity style={styles.sosBigBtn} activeOpacity={0.85} onPress={startCountdown}>
        <Ionicons name="warning" size={28} color="#fff" />
        <Text style={styles.sosBigText}>SOS</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap SOS to start a 5-second countdown before alerting contacts</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: SPACING.MD, paddingBottom: 40 },
  centered: { justifyContent: "center", alignItems: "center", padding: 32, gap: 14 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  backIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOWS.SM },
  navTitle: { fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  callStrip: { flexDirection: "row", gap: 8, marginBottom: 20 },
  stripBtn: { flex: 1, borderRadius: RADIUS.MD, padding: 10, alignItems: "center", gap: 2 },
  stripNum: { color: "#fff", fontSize: 16, fontWeight: "800" },
  stripLabel: { color: "rgba(255,255,255,0.8)", fontSize: 9 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY, marginBottom: 8 },
  optional: { fontSize: 12, fontWeight: "400", color: COLORS.TEXT_SECONDARY },
  severityRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 12, marginBottom: 8, backgroundColor: "#fff" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#94a3b8", alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  severityLabel: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  severityDesc: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 1 },
  textArea: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 12, fontSize: 14, color: COLORS.TEXT_PRIMARY, backgroundColor: "#fff", minHeight: 80, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: RADIUS.MD, padding: 12, fontSize: 14, color: COLORS.TEXT_PRIMARY, backgroundColor: "#fff", marginBottom: 14 },
  notifyCard: { backgroundColor: "#fff", borderRadius: RADIUS.MD, padding: 14, marginBottom: 20, ...SHADOWS.SM },
  notifyHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  notifyTitle: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY, flex: 1 },
  notifyBadge: { backgroundColor: COLORS.PRIMARY + "20", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  notifyBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.PRIMARY },
  addContactLink: { fontSize: 13, color: COLORS.PRIMARY, textDecorationLine: "underline" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#dbeafe", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, color: "#1d4ed8", fontWeight: "500" },
  moreText: { fontSize: 12, color: COLORS.TEXT_SECONDARY, alignSelf: "center" },
  sosBigBtn: { backgroundColor: "#dc2626", borderRadius: 20, padding: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, ...SHADOWS.MD },
  sosBigText: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: 4 },
  hint: { textAlign: "center", fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 10 },
  // triggered / error / countdown
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontWeight: "800", color: COLORS.TEXT_PRIMARY },
  successSub: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center" },
  countdownCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  countdownNum: { fontSize: 44, fontWeight: "900", color: "#dc2626" },
  callRow: { flexDirection: "row", gap: 12, marginTop: 4, width: "100%" },
  callBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: RADIUS.MD, paddingVertical: 14, paddingHorizontal: 16 },
  callBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  backBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: COLORS.PRIMARY, fontSize: 14, fontWeight: "600" },
});
