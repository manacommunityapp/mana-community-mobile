import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, FlatList
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";

// ── Seed Data ─────────────────────────────────────────────────────────────────

interface SurgeryProcedure { id: string; name: string; category: string; icon: string; color: string; bg: string; minCost: number; maxCost: number; stayDays: string; }

const PROCEDURES: SurgeryProcedure[] = [
  // Cardiac
  { id: "bypass", name: "Bypass Surgery (CABG)", category: "Cardiac", icon: "heart", color: "#DC2626", bg: "#FEE2E2", minCost: 200000, maxCost: 500000, stayDays: "7–10 days" },
  { id: "angioplasty", name: "Angioplasty & Stenting", category: "Cardiac", icon: "heart", color: "#DC2626", bg: "#FEE2E2", minCost: 150000, maxCost: 350000, stayDays: "3–5 days" },
  // Ortho
  { id: "knee", name: "Knee Replacement (TKR)", category: "Orthopedics", icon: "accessibility", color: "#7C3AED", bg: "#EDE9FE", minCost: 120000, maxCost: 280000, stayDays: "5–7 days" },
  { id: "hip", name: "Hip Replacement (THR)", category: "Orthopedics", icon: "accessibility", color: "#7C3AED", bg: "#EDE9FE", minCost: 130000, maxCost: 300000, stayDays: "5–7 days" },
  { id: "spine", name: "Spine / Disc Surgery", category: "Orthopedics", icon: "accessibility", color: "#7C3AED", bg: "#EDE9FE", minCost: 100000, maxCost: 250000, stayDays: "4–6 days" },
  // Eye
  { id: "cataract", name: "Cataract Surgery", category: "Ophthalmology", icon: "eye", color: "#0D9488", bg: "#CCFBF1", minCost: 15000, maxCost: 60000, stayDays: "Day care" },
  { id: "lasik", name: "LASIK / Laser Vision", category: "Ophthalmology", icon: "eye", color: "#0D9488", bg: "#CCFBF1", minCost: 30000, maxCost: 80000, stayDays: "Day care" },
  // Gyne
  { id: "hysterectomy", name: "Hysterectomy", category: "Gynecology", icon: "woman", color: "#DB2777", bg: "#FCE7F3", minCost: 60000, maxCost: 150000, stayDays: "3–5 days" },
  { id: "laparoscopy", name: "Laparoscopic Surgery", category: "Gynecology", icon: "woman", color: "#DB2777", bg: "#FCE7F3", minCost: 40000, maxCost: 120000, stayDays: "2–3 days" },
  // General
  { id: "appendix", name: "Appendectomy", category: "General Surgery", icon: "medkit", color: "#D97706", bg: "#FEF3C7", minCost: 30000, maxCost: 80000, stayDays: "2–3 days" },
  { id: "gallbladder", name: "Gallbladder Removal", category: "General Surgery", icon: "medkit", color: "#D97706", bg: "#FEF3C7", minCost: 40000, maxCost: 100000, stayDays: "2–3 days" },
  { id: "hernia", name: "Hernia Repair", category: "General Surgery", icon: "medkit", color: "#D97706", bg: "#FEF3C7", minCost: 35000, maxCost: 90000, stayDays: "1–2 days" },
  // Bariatric
  { id: "bariatric", name: "Bariatric / Weight Loss", category: "Bariatric", icon: "body", color: "#059669", bg: "#D1FAE5", minCost: 150000, maxCost: 350000, stayDays: "3–5 days" },
];

const HOSPITALS = [
  { name: "Apollo Hospital", rating: 4.9, cashless: true, nabl: true, estCost: 1.0, beds: 14 },
  { name: "Yashoda Super Speciality", rating: 4.7, cashless: true, nabl: true, estCost: 0.85, beds: 8 },
  { name: "Care Hospitals", rating: 4.6, cashless: true, nabl: false, estCost: 0.75, beds: 12 },
  { name: "Star Hospitals", rating: 4.5, cashless: false, nabl: true, estCost: 0.7, beds: 5 },
];

const POST_SURGERY_CHECKLIST = [
  { id: "1", title: "Rest & Recovery", desc: "Bed rest for 24–48 hrs, avoid strain", done: false, day: "Day 1–2" },
  { id: "2", title: "Medications", desc: "Take prescribed antibiotics & pain relief", done: false, day: "Day 1–7" },
  { id: "3", title: "Wound Care", desc: "Keep dressing clean & dry", done: false, day: "Day 1–5" },
  { id: "4", title: "Diet Modifications", desc: "Follow dietician's post-op diet plan", done: false, day: "Day 1–14" },
  { id: "5", title: "Follow-up Consult", desc: "Visit surgeon for stitch removal check", done: false, day: "Day 7" },
  { id: "6", title: "Physiotherapy", desc: "Begin prescribed exercises under guidance", done: false, day: "Day 10+" },
  { id: "7", title: "Return to Activity", desc: "Gradual return to normal activities", done: false, day: "Week 3–6" },
];

const EMI_OPTIONS = [3, 6, 9, 12, 18, 24];

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "select" | "plan" | "confirm" | "done";

export default function SurgeryCareScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<SurgeryProcedure | null>(null);
  const [selectedHospital, setSelectedHospital] = useState(HOSPITALS[0]);
  const [emiMonths, setEmiMonths] = useState(6);
  const [checklist, setChecklist] = useState(POST_SURGERY_CHECKLIST);
  const [filter, setFilter] = useState<string>("All");
  const [showEmi, setShowEmi] = useState(false);

  const categories = ["All", ...Array.from(new Set(PROCEDURES.map(p => p.category)))];
  const filteredProcs = filter === "All" ? PROCEDURES : PROCEDURES.filter(p => p.category === filter);

  const estimatedCost = selected
    ? Math.round(((selected.minCost + selected.maxCost) / 2) * selectedHospital.estCost)
    : 0;
  const emiAmount = Math.round(estimatedCost / emiMonths);

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  // ── Step: Select Procedure ─────────────────────────────────────────────────
  if (step === "select") {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0F766E", "#0D9488", "#14B8A6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Surgery Care</Text>
          <Text style={styles.headerSub}>Cost estimates • Cashless hospitals • Care Buddy</Text>
        </LinearGradient>

        {/* Care Buddy Banner */}
        <View style={styles.buddyBanner}>
          <View style={styles.buddyAvatar}>
            <Ionicons name="person" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buddyTitle}>Your Care Buddy: Priya Sharma</Text>
            <Text style={styles.buddySub}>Dedicated coordinator · Available 24×7 · Free service</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert("Care Buddy", "Priya Sharma will coordinate your pre-op tests, hospital admission, paperwork, and post-surgery follow-ups.\n\nCall: +91 98765 43210")} style={styles.buddyCallBtn}>
            <Ionicons name="call" size={14} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setFilter(cat)} style={[styles.filterChip, filter === cat && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Text style={styles.sectionLabel}>Select Procedure ({filteredProcs.length})</Text>
          {filteredProcs.map(proc => (
            <TouchableOpacity key={proc.id} style={styles.procCard} onPress={() => { setSelected(proc); setStep("plan"); }} activeOpacity={0.8}>
              <View style={[styles.procIcon, { backgroundColor: proc.bg }]}>
                <Ionicons name={proc.icon as any} size={20} color={proc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.procName}>{proc.name}</Text>
                <Text style={styles.procCategory}>{proc.category} • Stay: {proc.stayDays}</Text>
              </View>
              <View style={styles.procCostWrap}>
                <Text style={styles.procCostRange}>₹{(proc.minCost / 1000).toFixed(0)}K–{(proc.maxCost / 1000).toFixed(0)}K</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Step: Plan (Hospital + Cost) ───────────────────────────────────────────
  if (step === "plan" && selected) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0F766E", "#0D9488"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => setStep("select")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selected.name}</Text>
          <Text style={styles.headerSub}>Step 2 of 3 · Choose hospital & review costs</Text>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>

          {/* Cost Summary Card */}
          <View style={styles.costCard}>
            <Text style={styles.costCardTitle}>Estimated Surgery Cost</Text>
            <Text style={styles.costMain}>₹{(estimatedCost / 1000).toFixed(0)}K</Text>
            <Text style={styles.costSub}>Range: ₹{(selected.minCost / 1000).toFixed(0)}K – ₹{(selected.maxCost / 1000).toFixed(0)}K</Text>
            <View style={styles.costBreakdownRow}>
              <View style={styles.costItem}><Text style={styles.costItemLabel}>Surgeon fee</Text><Text style={styles.costItemVal}>~₹{(estimatedCost * 0.3 / 1000).toFixed(0)}K</Text></View>
              <View style={styles.costItem}><Text style={styles.costItemLabel}>Hospital charges</Text><Text style={styles.costItemVal}>~₹{(estimatedCost * 0.45 / 1000).toFixed(0)}K</Text></View>
              <View style={styles.costItem}><Text style={styles.costItemLabel}>Implants / Misc</Text><Text style={styles.costItemVal}>~₹{(estimatedCost * 0.25 / 1000).toFixed(0)}K</Text></View>
            </View>
          </View>

          {/* Hospital Selector */}
          <Text style={styles.sectionLabel}>Cashless Empanelled Hospitals</Text>
          {HOSPITALS.map((h, i) => (
            <TouchableOpacity key={i} style={[styles.hospitalCard, selectedHospital.name === h.name && styles.hospitalCardSelected]} onPress={() => setSelectedHospital(h)} activeOpacity={0.85}>
              <View style={styles.hospitalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>{h.name}</Text>
                  <View style={styles.hospitalBadges}>
                    {h.cashless && <View style={styles.badge}><Text style={styles.badgeText}>Cashless</Text></View>}
                    {h.nabl && <View style={[styles.badge, { backgroundColor: "#EEF2FF" }]}><Text style={[styles.badgeText, { color: "#4F46E5" }]}>NABH</Text></View>}
                    <Text style={styles.hospitalBeds}>{h.beds} beds avail</Text>
                  </View>
                </View>
                <View style={styles.hospitalRightCol}>
                  <Text style={styles.hospitalRating}>⭐ {h.rating}</Text>
                  <Text style={styles.hospitalCost}>₹{(estimatedCost * h.estCost / 1000).toFixed(0)}K est</Text>
                  {selectedHospital.name === h.name && <Ionicons name="checkmark-circle" size={18} color="#0D9488" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* EMI Section */}
          <View style={styles.emiCard}>
            <TouchableOpacity style={styles.emiHeader} onPress={() => setShowEmi(v => !v)}>
              <View style={styles.emiHeaderLeft}>
                <Ionicons name="card" size={20} color="#0D9488" />
                <Text style={styles.emiTitle}>EMI / No-Cost Finance Options</Text>
              </View>
              <Ionicons name={showEmi ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
            </TouchableOpacity>
            {showEmi && (
              <View style={styles.emiBody}>
                <Text style={styles.emiSub}>Select tenure — 0% interest via partner banks</Text>
                <View style={styles.emiGrid}>
                  {EMI_OPTIONS.map(m => (
                    <TouchableOpacity key={m} onPress={() => setEmiMonths(m)} style={[styles.emiChip, emiMonths === m && styles.emiChipActive]}>
                      <Text style={[styles.emiChipText, emiMonths === m && styles.emiChipTextActive]}>{m} months</Text>
                      <Text style={[styles.emiChipAmt, emiMonths === m && { color: "#FFFFFF" }]}>₹{(estimatedCost / m / 1000).toFixed(1)}K/mo</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.emiNote}>Partner banks: HDFC, ICICI, Bajaj Finance, ZestMoney</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep("confirm")} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Proceed to Confirmation →</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Step: Confirm ──────────────────────────────────────────────────────────
  if (step === "confirm" && selected) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0F766E", "#0D9488"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => setStep("plan")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Surgery Request</Text>
          <Text style={styles.headerSub}>Step 3 of 3 · Review and submit</Text>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Surgery Summary</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Procedure</Text><Text style={styles.summaryVal}>{selected.name}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Category</Text><Text style={styles.summaryVal}>{selected.category}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Hospital</Text><Text style={styles.summaryVal}>{selectedHospital.name}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Est. Stay</Text><Text style={styles.summaryVal}>{selected.stayDays}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Est. Cost</Text><Text style={[styles.summaryVal, { color: "#0D9488", fontWeight: "800" }]}>₹{(estimatedCost / 1000).toFixed(0)}K</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment</Text><Text style={styles.summaryVal}>{selectedHospital.cashless ? "Cashless (Insurance)" : `EMI ₹${(emiAmount / 1000).toFixed(1)}K/mo for ${emiMonths} months`}</Text></View>
          </View>

          {/* What happens next */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What Happens Next</Text>
            {["Your Care Buddy Priya will call within 2 hrs", "Pre-op tests arranged at home or clinic", "Surgery slot confirmed within 24–48 hrs", "Insurance / cashless pre-auth submitted", "Admission process managed end-to-end"].map((step, i) => (
              <View key={i} style={styles.nextStep}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => { Alert.alert("Request Submitted!", "Your Care Buddy Priya Sharma will contact you within 2 hours to begin coordination.", [{ text: "OK", onPress: () => setStep("done") }]); }} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Submit Surgery Request</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Step: Done (Post-surgery care) ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0F766E", "#0D9488"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post-Surgery Care</Text>
        <Text style={styles.headerSub}>Your recovery checklist</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={44} color="#059669" />
          <Text style={styles.successTitle}>Surgery Request Submitted</Text>
          <Text style={styles.successSub}>Care Buddy will contact you shortly</Text>
        </View>

        <Text style={styles.sectionLabel}>Post-Surgery Recovery Checklist</Text>
        {checklist.map(item => (
          <TouchableOpacity key={item.id} style={[styles.checkItem, item.done && styles.checkItemDone]} onPress={() => toggleCheck(item.id)} activeOpacity={0.85}>
            <View style={[styles.checkBox, item.done && styles.checkBoxDone]}>
              {item.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkTitle, item.done && styles.checkTitleDone]}>{item.title}</Text>
              <Text style={styles.checkDesc}>{item.desc}</Text>
            </View>
            <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{item.day}</Text></View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#4F46E5" }]} onPress={() => router.push("/health")} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Back to Health Hub</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, gap: 4 },
  backBtn: { marginBottom: 6 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", fontFamily: FONTS.displayBold },
  headerSub: { color: "#CCFBF1", fontSize: 12, fontFamily: FONTS.regular },

  buddyBanner: { margin: 16, backgroundColor: "#EDE9FE", borderRadius: RADIUS.lg, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#DDD6FE" },
  buddyAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#C4B5FD", justifyContent: "center", alignItems: "center" },
  buddyTitle: { fontSize: 13, fontWeight: "700", color: "#4C1D95", fontFamily: FONTS.semiBold },
  buddySub: { fontSize: 11, color: "#6D28D9", marginTop: 1 },
  buddyCallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#DDD6FE", justifyContent: "center", alignItems: "center" },

  filterRow: { paddingVertical: 10, flexGrow: 0 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  filterChipTextActive: { color: "#FFFFFF" },

  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#374151", fontFamily: FONTS.semiBold },

  procCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  procIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  procName: { fontSize: 13, fontWeight: "700", color: "#1E293B", fontFamily: FONTS.semiBold },
  procCategory: { fontSize: 11, color: "#64748B", marginTop: 2 },
  procCostWrap: {},
  procCostRange: { fontSize: 12, fontWeight: "800", color: "#0D9488" },

  costCard: { backgroundColor: "#0D9488", borderRadius: RADIUS.squircle, padding: 18, gap: 6 },
  costCardTitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "600" },
  costMain: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  costSub: { color: "#99F6E4", fontSize: 12 },
  costBreakdownRow: { flexDirection: "row", gap: 0, marginTop: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: RADIUS.md, padding: 12, justifyContent: "space-between" },
  costItem: { alignItems: "center", gap: 3, flex: 1 },
  costItemLabel: { fontSize: 10, color: "#CCFBF1" },
  costItemVal: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  hospitalCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: 14, borderWidth: 1.5, borderColor: "#E2E8F0", ...SHADOWS.card },
  hospitalCardSelected: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  hospitalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  hospitalName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  hospitalBadges: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" },
  badge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
  hospitalBeds: { fontSize: 11, color: "#94A3B8" },
  hospitalRightCol: { alignItems: "flex-end", gap: 4 },
  hospitalRating: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  hospitalCost: { fontSize: 13, fontWeight: "800", color: "#0D9488" },

  emiCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  emiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  emiHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  emiTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  emiBody: { padding: 14, paddingTop: 0, gap: 10 },
  emiSub: { fontSize: 12, color: "#64748B" },
  emiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emiChip: { flex: 1, minWidth: "30%", padding: 10, borderRadius: RADIUS.md, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  emiChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  emiChipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  emiChipTextActive: { color: "#FFFFFF" },
  emiChipAmt: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  emiNote: { fontSize: 11, color: "#94A3B8", textAlign: "center" },

  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 10, ...SHADOWS.card },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 8 },
  summaryLabel: { fontSize: 13, color: "#64748B" },
  summaryVal: { fontSize: 13, fontWeight: "600", color: "#1E293B" },

  nextStepsCard: { backgroundColor: "#F0FDFA", borderRadius: RADIUS.squircle, padding: 16, borderWidth: 1, borderColor: "#99F6E4", gap: 12 },
  nextStepsTitle: { fontSize: 14, fontWeight: "800", color: "#0F766E" },
  nextStep: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#0D9488", justifyContent: "center", alignItems: "center" },
  stepNum: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  stepText: { fontSize: 13, color: "#115E59", flex: 1, paddingTop: 2 },

  primaryBtn: { backgroundColor: "#0D9488", paddingVertical: 16, borderRadius: 14, alignItems: "center", ...SHADOWS.sm },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },

  successBanner: { alignItems: "center", gap: 8, paddingVertical: 20 },
  successTitle: { fontSize: 20, fontWeight: "800", color: "#059669" },
  successSub: { fontSize: 13, color: "#64748B" },

  checkItem: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  checkItemDone: { opacity: 0.6, backgroundColor: "#F8FAFC" },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#CBD5E1", justifyContent: "center", alignItems: "center" },
  checkBoxDone: { backgroundColor: "#059669", borderColor: "#059669" },
  checkTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  checkTitleDone: { textDecorationLine: "line-through", color: "#94A3B8" },
  checkDesc: { fontSize: 11, color: "#64748B", marginTop: 2 },
  dayBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  dayBadgeText: { fontSize: 10, color: "#475569", fontWeight: "600" },
});
