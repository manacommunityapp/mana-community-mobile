import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { CareJourneyDto, CareJourneyStage } from "@/types/health";
import { FONTS, RADIUS, SHADOWS } from "@/constants/config";

const STAGES: { id: CareJourneyStage; label: string; shortLabel: string; icon: string }[] = [
  { id: "APPOINTMENT_BOOKED",     label: "Appointment booked",      shortLabel: "Booked",      icon: "calendar-outline" },
  { id: "CONSULTATION_COMPLETED", label: "Consultation done",        shortLabel: "Consulted",   icon: "chatbubble-ellipses-outline" },
  { id: "PRESCRIPTION_ISSUED",    label: "Prescription issued",      shortLabel: "Rx issued",   icon: "document-text-outline" },
  { id: "LAB_TEST_ORDERED",       label: "Lab test ordered",         shortLabel: "Lab ordered", icon: "flask-outline" },
  { id: "RESULTS_READY",          label: "Results ready",            shortLabel: "Results",     icon: "checkmark-circle-outline" },
  { id: "FOLLOW_UP_SCHEDULED",    label: "Follow-up scheduled",      shortLabel: "Follow-up",   icon: "refresh-circle-outline" },
];

function stageIndex(stage: CareJourneyStage): number {
  return STAGES.findIndex(s => s.id === stage);
}

function stageColor(stage: CareJourneyStage): { dot: string; bg: string; text: string } {
  const idx = stageIndex(stage);
  if (stage === "RESULTS_READY" || stage === "FOLLOW_UP_SCHEDULED") {
    return { dot: "#059669", bg: "#ECFDF5", text: "#065F46" };
  }
  if (idx <= 1) return { dot: "#6366F1", bg: "#EEF2FF", text: "#4338CA" };
  if (idx <= 3) return { dot: "#D97706", bg: "#FEF3C7", text: "#92400E" };
  return { dot: "#0D9488", bg: "#F0FDFA", text: "#0F766E" };
}

function JourneyStageBar({ currentStage }: { currentStage: CareJourneyStage }) {
  const current = stageIndex(currentStage);
  return (
    <View style={bar.wrap}>
      {STAGES.map((s, idx) => {
        const done = idx <= current;
        const active = idx === current;
        return (
          <View key={s.id} style={bar.stepWrap}>
            <View style={[bar.dot, done ? bar.dotDone : bar.dotPending, active && bar.dotActive]}>
              {done && !active ? (
                <Ionicons name="checkmark" size={9} color="#FFFFFF" />
              ) : (
                <View style={[bar.innerDot, active ? bar.innerActive : bar.innerPending]} />
              )}
            </View>
            {idx < STAGES.length - 1 && (
              <View style={[bar.line, done && idx < current ? bar.lineDone : bar.linePending]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  stepWrap: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", zIndex: 1 },
  dotDone: { backgroundColor: "#0D9488" },
  dotPending: { backgroundColor: "#E2E8F0" },
  dotActive: { backgroundColor: "#0D9488", borderWidth: 2, borderColor: "#CCFBF1" },
  innerDot: { width: 8, height: 8, borderRadius: 4 },
  innerActive: { backgroundColor: "#FFFFFF" },
  innerPending: { backgroundColor: "#94A3B8" },
  line: { flex: 1, height: 2, marginHorizontal: 2 },
  lineDone: { backgroundColor: "#0D9488" },
  linePending: { backgroundColor: "#E2E8F0" },
});

function JourneyCard({ journey, onAction }: { journey: CareJourneyDto; onAction: (j: CareJourneyDto, action: string) => void }) {
  const col = stageColor(journey.currentStage);
  const stageInfo = STAGES.find(s => s.id === journey.currentStage)!;

  return (
    <View style={styles.journeyCard}>
      {/* Patient + Doctor row */}
      <View style={styles.jHeader}>
        <View style={styles.jAvatarWrap}>
          <Ionicons name="person" size={18} color="#0D9488" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.jPatientName}>{journey.patientName}</Text>
          <Text style={styles.jDoctor}>{journey.doctorName} · {journey.doctorSpecialty}</Text>
        </View>
        <View style={[styles.jStageBadge, { backgroundColor: col.bg }]}>
          <Text style={[styles.jStageBadgeText, { color: col.text }]}>{stageInfo.shortLabel}</Text>
        </View>
      </View>

      {/* Mode + time */}
      <View style={styles.jMeta}>
        <Ionicons
          name={journey.mode === "VIDEO" ? "videocam-outline" : journey.mode === "PHONE" ? "call-outline" : "business-outline"}
          size={13}
          color="#64748B"
        />
        <Text style={styles.jMetaText}>
          {journey.mode === "VIDEO" ? "Video" : journey.mode === "PHONE" ? "Phone" : "In-person"}
          {" · "}{journey.appointmentTime}
        </Text>
      </View>

      {/* Stage progress bar */}
      <JourneyStageBar currentStage={journey.currentStage} />
      <View style={styles.jStageLabels}>
        {STAGES.map((s, idx) => (
          <Text
            key={s.id}
            style={[styles.jStageLabel, idx === stageIndex(journey.currentStage) && styles.jStageLabelActive]}
            numberOfLines={1}
          >
            {s.shortLabel}
          </Text>
        ))}
      </View>

      {/* Context-sensitive action area */}
      <View style={styles.jActions}>
        {/* Prescription available */}
        {journey.prescriptionId && (
          <TouchableOpacity
            style={styles.jActionBtn}
            onPress={() => onAction(journey, "VIEW_RX")}
          >
            <Ionicons name="document-text" size={14} color="#0D9488" />
            <Text style={styles.jActionText}>View prescription</Text>
          </TouchableOpacity>
        )}

        {/* Lab results ready */}
        {journey.resultsAvailable && journey.resultDocumentId && (
          <TouchableOpacity
            style={[styles.jActionBtn, styles.jActionBtnGreen]}
            onPress={() => onAction(journey, "VIEW_RESULTS")}
          >
            <Ionicons name="flask" size={14} color="#059669" />
            <Text style={[styles.jActionText, { color: "#059669" }]}>View results</Text>
          </TouchableOpacity>
        )}

        {/* Video call link */}
        {journey.mode === "VIDEO" && journey.currentStage === "APPOINTMENT_BOOKED" && (
          <TouchableOpacity
            style={[styles.jActionBtn, styles.jActionBtnPurple]}
            onPress={() => onAction(journey, "JOIN_VIDEO")}
          >
            <Ionicons name="videocam" size={14} color="#6366F1" />
            <Text style={[styles.jActionText, { color: "#6366F1" }]}>Join video call</Text>
          </TouchableOpacity>
        )}

        {/* Follow-up pending */}
        {journey.clinicianRecommendedFollowUp?.status === "PENDING" && (
          <TouchableOpacity
            style={[styles.jActionBtn, styles.jActionBtnAmber]}
            onPress={() => onAction(journey, "BOOK_FOLLOWUP")}
          >
            <Ionicons name="calendar" size={14} color="#D97706" />
            <Text style={[styles.jActionText, { color: "#D97706" }]}>Book follow-up</Text>
          </TouchableOpacity>
        )}

        {/* Follow-up booked */}
        {journey.clinicianRecommendedFollowUp?.status === "BOOKED" && (
          <View style={[styles.jActionBtn, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={[styles.jActionText, { color: "#16A34A" }]}>Follow-up booked</Text>
          </View>
        )}
      </View>

      {/* Clinician instructions if any */}
      {journey.clinicianRecommendedFollowUp?.instructions && (
        <View style={styles.jInstructionBanner}>
          <Ionicons name="information-circle" size={13} color="#0F766E" />
          <Text style={styles.jInstructionText} numberOfLines={2}>
            {journey.clinicianRecommendedFollowUp.instructions}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CareJourneyScreen() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<CareJourneyDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthService.getCareJourneys()
      .then(setJourneys)
      .finally(() => setLoading(false));
  }, []);

  const handleAction = (journey: CareJourneyDto, action: string) => {
    switch (action) {
      case "VIEW_RX":
        Alert.alert(
          "Prescription",
          journey.prescriptionSummary || "No prescription summary available.",
          [
            { text: "Open Health Vault", onPress: () => router.push("/health/records") },
            { text: "Close" }
          ]
        );
        break;
      case "VIEW_RESULTS":
        Alert.alert(
          "Lab Results Ready",
          `Results for ${journey.labPackageName || "your lab test"} are available in your Health Vault.`,
          [
            { text: "View in Vault", onPress: () => router.push("/health/records") },
            { text: "Close" }
          ]
        );
        break;
      case "JOIN_VIDEO":
        Alert.alert(
          "Join Video Consultation",
          "Your secure video call link is ready. Tap Join to open.",
          [
            {
              text: "Join",
              onPress: () => Linking.openURL("https://meet.manacommunity.in/health/" + journey.appointmentId)
            },
            { text: "Cancel" }
          ]
        );
        break;
      case "BOOK_FOLLOWUP":
        router.push(`/health/doctors/${journey.doctorId}` as any);
        break;
    }
  };

  const activeJourneys = journeys.filter(j =>
    j.currentStage !== "FOLLOW_UP_SCHEDULED" ||
    j.clinicianRecommendedFollowUp?.status === "PENDING"
  );
  const completedJourneys = journeys.filter(j =>
    j.currentStage === "FOLLOW_UP_SCHEDULED" &&
    j.clinicianRecommendedFollowUp?.status !== "PENDING"
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#312E81", "#4338CA", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Care Journey</Text>
        <Text style={styles.headerSub}>
          Track your family's complete health journey — from booking to follow-up
        </Text>
        {activeJourneys.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{activeJourneys.length} active journey{activeJourneys.length > 1 ? "s" : ""}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* How it works strip */}
        <View style={styles.howWrap}>
          {STAGES.map((s, idx) => (
            <View key={s.id} style={styles.howStep}>
              <View style={styles.howIconWrap}>
                <Ionicons name={s.icon as any} size={16} color="#4F46E5" />
              </View>
              <Text style={styles.howLabel} numberOfLines={2}>{s.shortLabel}</Text>
              {idx < STAGES.length - 1 && <View style={styles.howArrow} />}
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading journeys...</Text>
          </View>
        ) : activeJourneys.length === 0 && completedJourneys.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trail-sign-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No active care journeys</Text>
            <Text style={styles.emptySubtitle}>Book a doctor consultation to start tracking your health journey.</Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push("/health/doctors")}
            >
              <Text style={styles.ctaBtnText}>Find a Doctor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeJourneys.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active journeys</Text>
                {activeJourneys.map(j => (
                  <JourneyCard key={j.id} journey={j} onAction={handleAction} />
                ))}
              </View>
            )}

            {completedJourneys.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completedJourneys.map(j => (
                  <JourneyCard key={j.id} journey={j} onAction={handleAction} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Quick actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push("/health/doctors")}
          >
            <Ionicons name="medkit-outline" size={20} color="#4F46E5" />
            <Text style={styles.quickBtnText}>Find doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push("/health/records")}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />
            <Text style={styles.quickBtnText}>Health vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push("/health/labs")}
          >
            <Ionicons name="flask-outline" size={20} color="#4F46E5" />
            <Text style={styles.quickBtnText}>Lab tests</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold", fontFamily: FONTS.displayBold, letterSpacing: -0.3 },
  headerSub: { color: "#C7D2FE", fontSize: 12, marginTop: 4, fontFamily: FONTS.regular, lineHeight: 18 },
  headerBadge: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  headerBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", fontFamily: FONTS.bold },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  howWrap: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.squircle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    alignItems: "center",
    ...SHADOWS.card,
  },
  howStep: { flex: 1, alignItems: "center", gap: 4, position: "relative" },
  howIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  howLabel: { fontSize: 9, color: "#64748B", textAlign: "center", fontFamily: FONTS.medium, lineHeight: 12 },
  howArrow: { position: "absolute", right: -4, top: 11, width: 8, height: 2, backgroundColor: "#E2E8F0" },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold, letterSpacing: -0.2 },

  journeyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.squircle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 10,
    ...SHADOWS.card,
  },
  jHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  jAvatarWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center" },
  jPatientName: { fontSize: 14, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold },
  jDoctor: { fontSize: 11, color: "#64748B", marginTop: 1, fontFamily: FONTS.regular },
  jStageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.xs },
  jStageBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: FONTS.bold },

  jMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  jMetaText: { fontSize: 11, color: "#64748B", fontFamily: FONTS.regular },

  jStageLabels: { flexDirection: "row", marginTop: -4 },
  jStageLabel: { flex: 1, fontSize: 8.5, color: "#94A3B8", textAlign: "center", fontFamily: FONTS.regular },
  jStageLabelActive: { color: "#0D9488", fontWeight: "700", fontFamily: FONTS.bold },

  jActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  jActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  jActionBtnGreen: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  jActionBtnPurple: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  jActionBtnAmber: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  jActionText: { fontSize: 12, fontWeight: "700", color: "#0D9488", fontFamily: FONTS.bold },

  jInstructionBanner: {
    backgroundColor: "#F0FDFA",
    borderRadius: RADIUS.sm,
    padding: 8,
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  jInstructionText: { flex: 1, fontSize: 11, color: "#0F766E", fontFamily: FONTS.regular, lineHeight: 16 },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: FONTS.regular },
  emptyTitle: { fontSize: 15, fontWeight: "bold", color: "#334155", fontFamily: FONTS.displayBold, marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: "#64748B", textAlign: "center", fontFamily: FONTS.regular, maxWidth: 260 },
  ctaBtn: { marginTop: 8, backgroundColor: "#4F46E5", paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.sm, ...SHADOWS.sm },
  ctaBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: FONTS.bold },

  quickActionsRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    ...SHADOWS.card,
  },
  quickBtnText: { fontSize: 11, fontWeight: "700", color: "#4F46E5", fontFamily: FONTS.bold },
});
