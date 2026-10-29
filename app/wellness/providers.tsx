import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { WellnessProviderDto, ProviderSlotDto, SessionMode } from "@/types/wellness";

const PROVIDER_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  DIETITIAN: { icon: "nutrition", color: "#10B981", bg: "#ECFDF5" },
  NUTRITIONIST: { icon: "leaf", color: "#059669", bg: "#D1FAE5" },
  PERSONAL_TRAINER: { icon: "barbell", color: "#F43F5E", bg: "#FFF1F2" },
  YOGA_INSTRUCTOR: { icon: "body", color: "#8B5CF6", bg: "#F5F3FF" },
  GYM: { icon: "fitness", color: "#F97316", bg: "#FFF7ED" },
};

const SESSION_MODES: { key: SessionMode; label: string; icon: any }[] = [
  { key: "ONLINE", label: "Online", icon: "videocam-outline" },
  { key: "IN_PERSON", label: "In-Person", icon: "location-outline" },
];

function getNext7Days(): { label: string; short: string; iso: string }[] {
  const days = [];
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const short = dayNames[d.getDay()];
    const label = i === 0 ? "Today" : i === 1 ? "Tmr" : `${short} ${d.getDate()}`;
    days.push({ label, short, iso });
  }
  return days;
}

const DAYS = getNext7Days();

// ─── Booking Modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  provider: WellnessProviderDto | null;
  onClose: () => void;
}

function BookingModal({ provider, onClose }: BookingModalProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [slots, setSlots] = useState<ProviderSlotDto[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>("ONLINE");
  const [step, setStep] = useState<"pick" | "confirm" | "success">("pick");
  const [booking, setBooking] = useState<{ bookingRef: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadSlots = useCallback(async (dayIso: string) => {
    if (!provider) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setError("");
    try {
      const s = await wellnessService.getAvailableSlots(provider.id, dayIso);
      setSlots(s);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (provider) {
      setStep("pick");
      setSelectedDayIdx(0);
      setSelectedSlot(null);
      setSessionMode("ONLINE");
      setError("");
      setBooking(null);
      loadSlots(DAYS[0].iso);
    }
  }, [provider]);

  const handleDaySelect = (idx: number) => {
    setSelectedDayIdx(idx);
    loadSlots(DAYS[idx].iso);
  };

  const handleConfirm = async () => {
    if (!provider || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await wellnessService.bookAppointment(
        provider.id,
        provider.name,
        DAYS[selectedDayIdx].iso,
        selectedSlot,
        sessionMode,
        provider.consultationFee,
      );
      setBooking({ bookingRef: result.bookingRef });
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Booking failed. Please try again.");
      setStep("pick");
    } finally {
      setSubmitting(false);
    }
  };

  if (!provider) return null;
  const cfg = PROVIDER_CONFIG[provider.providerType] || PROVIDER_CONFIG.DIETITIAN;
  const availableSlots = slots.filter(s => s.available);
  const canBook = !!selectedSlot;

  return (
    <Modal visible={!!provider} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={22} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{provider.name}</Text>
              <Text style={styles.sheetSpec}>{provider.providerType.replace(/_/g, " ")} · Rs. {provider.consultationFee}/session</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── Success state ──────────────────────────────────── */}
          {step === "success" && booking && (
            <View style={styles.successBody}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Appointment Confirmed!</Text>
              <Text style={styles.successSub}>
                {DAYS[selectedDayIdx].label} · {selectedSlot} · {sessionMode === "ONLINE" ? "Online" : "In-Person"}
              </Text>
              <View style={styles.refBox}>
                <Text style={styles.refLabel}>Booking Reference</Text>
                <Text style={styles.refCode}>{booking.bookingRef}</Text>
              </View>
              <Text style={styles.successNote}>You will receive a confirmation on your registered mobile number.</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Confirm step ───────────────────────────────────── */}
          {step === "confirm" && (
            <View style={styles.confirmBody}>
              <Text style={styles.confirmTitle}>Confirm Booking</Text>
              <View style={styles.confirmCard}>
                <Row label="Provider" value={provider.name} />
                <Row label="Date" value={DAYS[selectedDayIdx].label} />
                <Row label="Time" value={selectedSlot ?? ""} />
                <Row label="Session" value={sessionMode === "ONLINE" ? "Online" : "In-Person"} />
                <Row label="Fee" value={`Rs. ${provider.consultationFee}`} last />
              </View>
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
              <View style={styles.confirmBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep("pick")} disabled={submitting}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBookBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleConfirm}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.confirmBookBtnText}>Confirm Booking</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Pick step ──────────────────────────────────────── */}
          {step === "pick" && (
            <ScrollView style={styles.pickScroll} showsVerticalScrollIndicator={false}>
              {/* Day selector */}
              <Text style={styles.sectionLabel}>Select Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={d.iso}
                    style={[styles.dayChip, i === selectedDayIdx && styles.dayChipActive]}
                    onPress={() => handleDaySelect(i)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayChipText, i === selectedDayIdx && styles.dayChipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time slots */}
              <Text style={styles.sectionLabel}>Available Slots</Text>
              {slotsLoading
                ? <ActivityIndicator style={{ marginVertical: 16 }} color={THEMES.wellness.primary} />
                : availableSlots.length === 0
                  ? <Text style={styles.noSlots}>No slots available for this day.</Text>
                  : (
                    <View style={styles.slotGrid}>
                      {availableSlots.map((s) => (
                        <TouchableOpacity
                          key={s.time}
                          style={[styles.slotChip, selectedSlot === s.time && styles.slotChipActive]}
                          onPress={() => setSelectedSlot(s.time)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.slotChipText, selectedSlot === s.time && styles.slotChipTextActive]}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
              }

              {/* Session mode */}
              <Text style={styles.sectionLabel}>Session Type</Text>
              <View style={styles.modeRow}>
                {SESSION_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.modeChip, sessionMode === m.key && styles.modeChipActive]}
                    onPress={() => setSessionMode(m.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={m.icon} size={14} color={sessionMode === m.key ? "#FFF" : COLORS.textSecondary} />
                    <Text style={[styles.modeChipText, sessionMode === m.key && styles.modeChipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.bookNowBtn, !canBook && { opacity: 0.4 }]}
                onPress={() => setStep("confirm")}
                disabled={!canBook}
                activeOpacity={0.85}
              >
                <Text style={styles.bookNowBtnText}>Review Booking</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.confirmRow, !last && styles.confirmRowBorder]}>
      <Text style={styles.confirmRowLabel}>{label}</Text>
      <Text style={styles.confirmRowValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProvidersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<WellnessProviderDto[]>([]);
  const [bookingProvider, setBookingProvider] = useState<WellnessProviderDto | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await wellnessService.getProviders();
      setProviders(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={THEMES.wellness.primary} /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEMES.wellness.primary} />}
      >
        {providers.map((p) => {
          const cfg = PROVIDER_CONFIG[p.providerType] || PROVIDER_CONFIG.DIETITIAN;
          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={24} color={cfg.color} />
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{p.name}</Text>
                    {p.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.spec}>
                    {p.providerType.replace(/_/g, " ")} | {p.specialization}
                  </Text>
                  <Text style={styles.exp}>{p.experienceYears} yrs exp | {p.languages.join(", ")}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{p.rating}</Text>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                </View>
              </View>

              <Text style={styles.about} numberOfLines={2}>{p.about}</Text>

              <View style={styles.footer}>
                <View style={styles.feeWrap}>
                  <Text style={styles.fee}>Rs. {p.consultationFee}</Text>
                  <Text style={styles.feeLabel}>per session</Text>
                </View>
                <View style={styles.slotWrap}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.slotText}>{p.nextAvailableSlot}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.bookBtn, !p.available && styles.bookBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={() => p.available && setBookingProvider(p)}
                  disabled={!p.available}
                >
                  <Text style={styles.bookBtnText}>{p.available ? "Book" : "Unavailable"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <BookingModal provider={bookingProvider} onClose={() => setBookingProvider(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 14 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },

  card: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.xs },
  verifiedText: { color: "#1D4ED8", fontSize: 9, fontFamily: FONTS.bold },
  spec: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 1 },
  exp: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.sm },
  ratingText: { fontSize: 13, fontFamily: FONTS.bold, color: "#92400E" },
  about: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10, gap: 8 },
  feeWrap: {},
  fee: { fontSize: 15, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  feeLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted },
  slotWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  slotText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },
  bookBtn: { backgroundColor: THEMES.wellness.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.sm, ...SHADOWS.glowEmerald },
  bookBtnDisabled: { backgroundColor: "#CBD5E1" },
  bookBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: FONTS.bold },

  // Modal
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingBottom: Platform.OS === "ios" ? 32 : 16 },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },

  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  sheetAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sheetName: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  sheetSpec: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
  closeBtn: { padding: 6 },

  // Pick step
  pickScroll: { flex: 1 },
  sectionLabel: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 16, marginBottom: 8, paddingHorizontal: 16 },
  dayRow: { marginBottom: 4 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  dayChipActive: { backgroundColor: THEMES.wellness.primary, borderColor: THEMES.wellness.primary },
  dayChipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  dayChipTextActive: { color: "#FFFFFF", fontFamily: FONTS.bold },
  noSlots: { paddingHorizontal: 16, fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, marginBottom: 8 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  slotChipActive: { backgroundColor: THEMES.wellness.primary, borderColor: THEMES.wellness.primary },
  slotChipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  slotChipTextActive: { color: "#FFFFFF", fontFamily: FONTS.bold },
  modeRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  modeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  modeChipActive: { backgroundColor: THEMES.wellness.primary, borderColor: THEMES.wellness.primary },
  modeChipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  modeChipTextActive: { color: "#FFFFFF", fontFamily: FONTS.bold },
  errorBanner: { marginHorizontal: 16, marginTop: 8, backgroundColor: "#FEE2E2", color: "#DC2626", padding: 10, borderRadius: RADIUS.sm, fontSize: 13, fontFamily: FONTS.medium },
  bookNowBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: THEMES.wellness.primary, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: "center", ...SHADOWS.glowEmerald },
  bookNowBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: FONTS.bold },

  // Confirm step
  confirmBody: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  confirmTitle: { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text, marginBottom: 14 },
  confirmCard: { backgroundColor: "#F8FAFC", borderRadius: RADIUS.squircle, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden", marginBottom: 12 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  confirmRowBorder: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  confirmRowLabel: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  confirmRowValue: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text },
  confirmBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  confirmBookBtn: { flex: 2, paddingVertical: 13, borderRadius: RADIUS.sm, backgroundColor: THEMES.wellness.primary, alignItems: "center", ...SHADOWS.glowEmerald },
  confirmBookBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONTS.bold },

  // Success step
  successBody: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, alignItems: "center" },
  successIconWrap: { marginVertical: 16 },
  successTitle: { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text, marginBottom: 6 },
  successSub: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, textAlign: "center", marginBottom: 16 },
  refBox: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: RADIUS.squircle, paddingHorizontal: 20, paddingVertical: 14, alignItems: "center", width: "100%", marginBottom: 12 },
  refLabel: { fontSize: 11, fontFamily: FONTS.medium, color: "#065F46", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  refCode: { fontSize: 20, fontFamily: FONTS.displayBold, color: "#065F46", letterSpacing: 2 },
  successNote: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center", marginBottom: 20 },
  doneBtn: { backgroundColor: THEMES.wellness.primary, paddingHorizontal: 48, paddingVertical: 13, borderRadius: RADIUS.sm, ...SHADOWS.glowEmerald },
  doneBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: FONTS.bold },
});
