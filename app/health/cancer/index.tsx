import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";

// ── Seed Data ─────────────────────────────────────────────────────────────────

const ONCOLOGISTS = [
  { id: "o1", name: "Dr. Vikram Desai", specialty: "Medical Oncology", exp: 18, rating: 4.9, fee: 800, hospital: "Apollo Cancer Centre", nextSlot: "Tomorrow 11:00 AM", secondOpinion: true },
  { id: "o2", name: "Dr. Kavita Sharma", specialty: "Surgical Oncology", exp: 22, rating: 4.8, fee: 900, hospital: "Yashoda Cancer Hospital", nextSlot: "24 Oct 2026", secondOpinion: true },
  { id: "o3", name: "Dr. Arun Nair", specialty: "Radiation Oncology", exp: 15, rating: 4.7, fee: 750, hospital: "HCG Cancer Centre", nextSlot: "Today 5:30 PM", secondOpinion: false },
  { id: "o4", name: "Dr. Priya Mehta", specialty: "Gynecological Oncology", exp: 12, rating: 4.8, fee: 700, hospital: "Basavatarakam Indo American Cancer Hospital", nextSlot: "25 Oct 2026", secondOpinion: true },
];

const CANCER_TYPES = [
  { name: "Breast Cancer", icon: "ribbon", color: "#DB2777", bg: "#FCE7F3" },
  { name: "Lung Cancer", icon: "fitness", color: "#64748B", bg: "#F1F5F9" },
  { name: "Colorectal Cancer", icon: "medical", color: "#D97706", bg: "#FEF3C7" },
  { name: "Blood Cancer", icon: "water", color: "#DC2626", bg: "#FEE2E2" },
  { name: "Prostate Cancer", icon: "man", color: "#2563EB", bg: "#DBEAFE" },
  { name: "Gynecological", icon: "woman", color: "#7C3AED", bg: "#EDE9FE" },
  { name: "Head & Neck", icon: "people", color: "#059669", bg: "#D1FAE5" },
  { name: "Bone Sarcoma", icon: "accessibility", color: "#0D9488", bg: "#CCFBF1" },
];

interface OncologyJourneyStep {
  id: string;
  stage: string;
  label: string;
  detail: string;
  completed: boolean;
  date?: string;
}

const ONCOLOGY_JOURNEY: OncologyJourneyStep[] = [
  { id: "s1", stage: "DIAGNOSIS", label: "Diagnosis Confirmed", detail: "Biopsy / pathology report received", completed: true, date: "5 Sep 2026" },
  { id: "s2", stage: "STAGING", label: "Cancer Staging", detail: "Stage II — localised, nodes involved", completed: true, date: "12 Sep 2026" },
  { id: "s3", stage: "SECOND_OPINION", label: "Second Opinion", detail: "Confirmed staging with Dr. Vikram Desai", completed: true, date: "18 Sep 2026" },
  { id: "s4", stage: "TREATMENT_PLAN", label: "Treatment Plan Ready", detail: "4 cycles chemo + radiation therapy", completed: true, date: "22 Sep 2026" },
  { id: "s5", stage: "TREATMENT", label: "Treatment In Progress", detail: "Cycle 2 of 4 — Next: 30 Oct 2026", completed: false },
  { id: "s6", stage: "RESPONSE_EVAL", label: "Response Evaluation", detail: "Mid-treatment CT scan & blood markers", completed: false },
  { id: "s7", stage: "FOLLOWUP", label: "Follow-up & Remission", detail: "Ongoing surveillance", completed: false },
];

const CHEMO_SCHEDULE = [
  { cycle: 1, date: "6 Oct 2026", status: "Completed", drug: "Paclitaxel + Carboplatin" },
  { cycle: 2, date: "27 Oct 2026", status: "Upcoming", drug: "Paclitaxel + Carboplatin" },
  { cycle: 3, date: "17 Nov 2026", status: "Scheduled", drug: "Paclitaxel + Carboplatin" },
  { cycle: 4, date: "8 Dec 2026", status: "Scheduled", drug: "Paclitaxel + Carboplatin" },
];

const SUPPORT_RESOURCES = [
  { title: "Can Survive Foundation", desc: "Peer support groups for cancer patients", icon: "heart", color: "#DB2777" },
  { title: "National Cancer Helpline", desc: "1800-180-4104 — Free, 24×7", icon: "call", color: "#059669" },
  { title: "Nutrition for Cancer Patients", desc: "Diet guidance during chemotherapy", icon: "nutrition", color: "#D97706" },
  { title: "Palliative Care Network", desc: "Pain management & quality of life", icon: "medkit", color: "#7C3AED" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = "specialists" | "journey" | "second_opinion" | "support";

export default function CancerCareScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("specialists");
  const [journey, setJourney] = useState(ONCOLOGY_JOURNEY);
  const [showJourney, setShowJourney] = useState(false);
  const [soType, setSoType] = useState("");
  const [soSubmitted, setSoSubmitted] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#7C3AED", "#6D28D9", "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancer Care & Oncology</Text>
        <Text style={styles.headerSub}>Oncology specialists · Second opinion · Care journey</Text>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {([
          { id: "specialists", label: "Specialists" },
          { id: "journey", label: "Care Journey" },
          { id: "second_opinion", label: "Second Opinion" },
          { id: "support", label: "Support" },
        ] as { id: Tab; label: string }[]).map(t => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Tab: Specialists ────────────────────────────────────────────────── */}
      {tab === "specialists" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Cancer Type Grid */}
          <Text style={styles.sectionLabel}>Cancer Categories</Text>
          <View style={styles.typeGrid}>
            {CANCER_TYPES.map((ct, i) => (
              <TouchableOpacity key={i} style={styles.typeChip} onPress={() => Alert.alert(ct.name, `Showing oncology specialists for ${ct.name}.\n\nAll doctors listed below are trained in this specific cancer type.`)} activeOpacity={0.8}>
                <Ionicons name={ct.icon as any} size={18} color={ct.color} />
                <Text style={styles.typeChipText}>{ct.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Oncology Specialists</Text>
          {ONCOLOGISTS.map(doc => (
            <View key={doc.id} style={styles.doctorCard}>
              <View style={styles.doctorHeader}>
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={22} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{doc.name}</Text>
                  <Text style={styles.doctorSpec}>{doc.specialty} · {doc.exp} yrs</Text>
                  <Text style={styles.doctorHospital}>{doc.hospital}</Text>
                </View>
                <Text style={styles.ratingBadge}>⭐ {doc.rating}</Text>
              </View>
              <View style={styles.doctorBadges}>
                {doc.secondOpinion && <View style={styles.soBadge}><Text style={styles.soBadgeText}>Second Opinion</Text></View>}
                <Text style={styles.nextSlot}>🕐 {doc.nextSlot}</Text>
              </View>
              <View style={styles.doctorFooter}>
                <Text style={styles.feeText}>₹{doc.fee} / consult</Text>
                <TouchableOpacity onPress={() => Alert.alert("Book Consultation", `Booking with ${doc.name}\n${doc.specialty}\n\nNext slot: ${doc.nextSlot}\n\nConfirmation SMS will be sent.`)} style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Tab: Care Journey ───────────────────────────────────────────────── */}
      {tab === "journey" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {!showJourney ? (
            <View style={styles.journeyStartCard}>
              <Ionicons name="git-merge" size={48} color="#7C3AED" />
              <Text style={styles.journeyStartTitle}>Track Oncology Care Journey</Text>
              <Text style={styles.journeyStartDesc}>Monitor your cancer treatment stages — from diagnosis to remission. Includes chemo schedule, response evaluations, and follow-ups.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowJourney(true)}>
                <Text style={styles.primaryBtnText}>View My Journey</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Oncology Care Journey</Text>
              {journey.map((step, i) => (
                <View key={step.id} style={styles.journeyItem}>
                  <View style={styles.journeyLeft}>
                    <View style={[styles.journeyDot, step.completed && styles.journeyDotDone]}>
                      {step.completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    {i < journey.length - 1 && <View style={[styles.journeyLine, step.completed && styles.journeyLineDone]} />}
                  </View>
                  <View style={[styles.journeyContent, !step.completed && styles.journeyContentPending]}>
                    <Text style={[styles.journeyLabel, !step.completed && styles.journeyLabelPending]}>{step.label}</Text>
                    <Text style={styles.journeyDetail}>{step.detail}</Text>
                    {step.date && <Text style={styles.journeyDate}>{step.date}</Text>}
                  </View>
                </View>
              ))}

              <Text style={styles.sectionLabel}>Chemotherapy Schedule</Text>
              {CHEMO_SCHEDULE.map((c, i) => (
                <View key={i} style={styles.chemoCard}>
                  <View style={[styles.cycleBadge, { backgroundColor: c.status === "Completed" ? "#D1FAE5" : c.status === "Upcoming" ? "#FEF3C7" : "#F1F5F9" }]}>
                    <Text style={[styles.cycleText, { color: c.status === "Completed" ? "#059669" : c.status === "Upcoming" ? "#D97706" : "#64748B" }]}>Cycle {c.cycle}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chemoDate}>{c.date}</Text>
                    <Text style={styles.chemoDrug}>{c.drug}</Text>
                  </View>
                  <View style={[styles.chemoStatus, { backgroundColor: c.status === "Completed" ? "#D1FAE5" : c.status === "Upcoming" ? "#FEF3C7" : "#F1F5F9" }]}>
                    <Text style={[styles.chemoStatusText, { color: c.status === "Completed" ? "#059669" : c.status === "Upcoming" ? "#D97706" : "#64748B" }]}>{c.status}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Tab: Second Opinion ─────────────────────────────────────────────── */}
      {tab === "second_opinion" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {!soSubmitted ? (
            <>
              <View style={styles.soInfoBanner}>
                <Ionicons name="chatbubbles" size={24} color="#7C3AED" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.soInfoTitle}>Why get a Second Opinion?</Text>
                  <Text style={styles.soInfoDesc}>25% of cancer diagnoses benefit from a second expert review. It's your right — and often covered by insurance.</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Select Cancer Type</Text>
              <View style={styles.typeGrid}>
                {CANCER_TYPES.map((ct, i) => (
                  <TouchableOpacity key={i} style={[styles.typeChip, soType === ct.name && styles.typeChipSelected]} onPress={() => setSoType(ct.name)} activeOpacity={0.8}>
                    <Ionicons name={ct.icon as any} size={18} color={soType === ct.name ? "#FFFFFF" : ct.color} />
                    <Text style={[styles.typeChipText, soType === ct.name && { color: "#FFFFFF" }]}>{ct.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Available for Second Opinion</Text>
              {ONCOLOGISTS.filter(d => d.secondOpinion).map(doc => (
                <View key={doc.id} style={styles.doctorCard}>
                  <View style={styles.doctorHeader}>
                    <View style={styles.avatarWrap}>
                      <Ionicons name="person" size={22} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doctorName}>{doc.name}</Text>
                      <Text style={styles.doctorSpec}>{doc.specialty} · {doc.hospital}</Text>
                    </View>
                    <Text style={styles.ratingBadge}>⭐ {doc.rating}</Text>
                  </View>
                  <TouchableOpacity style={styles.soRequestBtn} onPress={() => {
                    if (!soType) { Alert.alert("Select Cancer Type", "Please choose the cancer type above first."); return; }
                    Alert.alert("Second Opinion Requested", `Your request has been sent to ${doc.name}.\n\nThey will review your existing reports and contact you within 24–48 hours.\n\nCancer type: ${soType}`, [{ text: "OK", onPress: () => setSoSubmitted(true) }]);
                  }} activeOpacity={0.85}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
                    <Text style={styles.soRequestBtnText}>Request Second Opinion</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.soSuccessCard}>
              <Ionicons name="checkmark-circle" size={56} color="#059669" />
              <Text style={styles.soSuccessTitle}>Second Opinion Requested</Text>
              <Text style={styles.soSuccessDesc}>The specialist will review your diagnosis and contact you within 24–48 hours. You can attach your existing reports from Health Vault.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#7C3AED" }]} onPress={() => router.push("/health/records")} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Attach Reports from Vault</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSoSubmitted(false)} style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ color: "#94A3B8", fontWeight: "600" }}>Request Another Opinion</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Tab: Support ────────────────────────────────────────────────────── */}
      {tab === "support" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          <View style={styles.supportHeroBanner}>
            <Text style={styles.supportHeroTitle}>You Are Not Alone</Text>
            <Text style={styles.supportHeroDesc}>Our community is here to support you every step of the way.</Text>
          </View>
          {SUPPORT_RESOURCES.map((res, i) => (
            <TouchableOpacity key={i} style={styles.supportCard} onPress={() => Alert.alert(res.title, res.desc)} activeOpacity={0.85}>
              <View style={[styles.supportIcon, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name={res.icon as any} size={22} color={res.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportTitle}>{res.title}</Text>
                <Text style={styles.supportDesc}>{res.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#7C3AED" }]} onPress={() => router.push("/health/doctors" as any)} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Find Oncology Specialist</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, gap: 4 },
  backBtn: { marginBottom: 6 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", fontFamily: FONTS.displayBold },
  headerSub: { color: "#DDD6FE", fontSize: 12, fontFamily: FONTS.regular },

  tabScroll: { flexGrow: 0, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tabScrollContent: { paddingHorizontal: 12, gap: 0 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#7C3AED" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#7C3AED", fontWeight: "700" },

  scrollContent: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: "#E2E8F0" },
  typeChipSelected: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  typeChipText: { fontSize: 12, fontWeight: "600", color: "#475569" },

  doctorCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  doctorHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center" },
  doctorName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  doctorSpec: { fontSize: 12, color: "#64748B", marginTop: 2 },
  doctorHospital: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  ratingBadge: { fontSize: 12, fontWeight: "700", color: "#92400E", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  doctorBadges: { flexDirection: "row", gap: 8, alignItems: "center" },
  soBadge: { backgroundColor: "#EDE9FE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  soBadgeText: { fontSize: 10, fontWeight: "700", color: "#7C3AED" },
  nextSlot: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  doctorFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10 },
  feeText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  bookBtn: { backgroundColor: "#7C3AED", paddingHorizontal: 20, paddingVertical: 9, borderRadius: RADIUS.sm },
  bookBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  journeyStartCard: { alignItems: "center", gap: 16, paddingVertical: 32, paddingHorizontal: 20 },
  journeyStartTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  journeyStartDesc: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 },

  journeyItem: { flexDirection: "row", gap: 14, minHeight: 72 },
  journeyLeft: { alignItems: "center", width: 28 },
  journeyDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  journeyDotDone: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  journeyLine: { flex: 1, width: 2, backgroundColor: "#E2E8F0", marginTop: 4 },
  journeyLineDone: { backgroundColor: "#7C3AED" },
  journeyContent: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: "#E2E8F0", gap: 3, marginBottom: 4 },
  journeyContentPending: { opacity: 0.6 },
  journeyLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  journeyLabelPending: { color: "#94A3B8" },
  journeyDetail: { fontSize: 12, color: "#64748B" },
  journeyDate: { fontSize: 11, fontWeight: "600", color: "#7C3AED" },

  chemoCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  cycleBadge: { width: 52, alignItems: "center", paddingVertical: 6, borderRadius: RADIUS.sm },
  cycleText: { fontSize: 12, fontWeight: "700" },
  chemoDate: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  chemoDrug: { fontSize: 11, color: "#64748B", marginTop: 2 },
  chemoStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  chemoStatusText: { fontSize: 11, fontWeight: "700" },

  soInfoBanner: { backgroundColor: "#EDE9FE", borderRadius: RADIUS.lg, padding: 14, flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#DDD6FE" },
  soInfoTitle: { fontSize: 14, fontWeight: "700", color: "#4C1D95" },
  soInfoDesc: { fontSize: 12, color: "#6D28D9", marginTop: 3, lineHeight: 18 },
  soRequestBtn: { backgroundColor: "#7C3AED", paddingVertical: 10, borderRadius: RADIUS.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  soRequestBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  soSuccessCard: { alignItems: "center", gap: 16, paddingVertical: 32, paddingHorizontal: 20 },
  soSuccessTitle: { fontSize: 22, fontWeight: "800", color: "#059669", textAlign: "center" },
  soSuccessDesc: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 },

  supportHeroBanner: { backgroundColor: "#EDE9FE", borderRadius: RADIUS.squircle, padding: 20, gap: 6, borderWidth: 1, borderColor: "#DDD6FE" },
  supportHeroTitle: { fontSize: 20, fontWeight: "800", color: "#4C1D95", textAlign: "center" },
  supportHeroDesc: { fontSize: 13, color: "#6D28D9", textAlign: "center" },
  supportCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  supportIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  supportTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  supportDesc: { fontSize: 12, color: "#64748B", marginTop: 2 },

  primaryBtn: { backgroundColor: "#7C3AED", paddingVertical: 16, borderRadius: 14, alignItems: "center", ...SHADOWS.sm },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
