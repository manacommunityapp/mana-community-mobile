import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { HealthCampDto } from "@/types/health";

type MainTab = "camps" | "programs" | "coaching";

interface DiseaseProgram {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  condition: string;
  duration: string;
  sessions: number;
  price: number;
  features: string[];
  enrolled?: boolean;
}

interface CoachingSession {
  id: string;
  title: string;
  coach: string;
  specialty: string;
  nextSession: string;
  duration: string;
  mode: string;
  price: number;
  icon: string;
  color: string;
}

const DISEASE_PROGRAMS: DiseaseProgram[] = [
  {
    id: "dp-1",
    name: "Diabetes Care Program",
    icon: "water",
    color: "#2563EB",
    bg: "#EFF6FF",
    condition: "Type 1 & Type 2 Diabetes",
    duration: "12 weeks",
    sessions: 24,
    price: 2499,
    features: ["HbA1c monitoring every 4 weeks", "Personalised meal plan", "Endocrinologist consultations", "CGM data review", "Medication adherence tracking"]
  },
  {
    id: "dp-2",
    name: "Cardiac Care Program",
    icon: "heart",
    color: "#DC2626",
    bg: "#FEF2F2",
    condition: "Hypertension, CAD, Post-Cardiac Event",
    duration: "16 weeks",
    sessions: 32,
    price: 3299,
    features: ["Weekly BP & ECG monitoring", "Cardiac rehab exercises", "Cardiologist follow-up", "Lipid panel tracking", "Stress management modules"]
  },
  {
    id: "dp-3",
    name: "Weight Management Program",
    icon: "fitness",
    color: "#7C3AED",
    bg: "#F5F3FF",
    condition: "Obesity / Overweight (BMI 25+)",
    duration: "12 weeks",
    sessions: 36,
    price: 1999,
    features: ["BMI & body composition tracking", "Dietician meal plans", "Fitness coach sessions", "Weekly progress reviews", "Behavioural coaching"]
  },
  {
    id: "dp-4",
    name: "COPD & Respiratory Care",
    icon: "cloud",
    color: "#0891B2",
    bg: "#ECFEFF",
    condition: "COPD, Asthma, Post-COVID Lungs",
    duration: "10 weeks",
    sessions: 20,
    price: 2199,
    features: ["Spirometry baseline & tracking", "Pulmonologist follow-up", "Breathing exercises (video)", "Inhaler technique review", "Trigger avoidance plan"]
  },
  {
    id: "dp-5",
    name: "Thyroid Management",
    icon: "medical",
    color: "#D97706",
    bg: "#FEF3C7",
    condition: "Hypothyroidism / Hyperthyroidism",
    duration: "8 weeks",
    sessions: 12,
    price: 1599,
    features: ["TSH/T3/T4 panel tracking", "Endocrinologist review", "Medication calibration", "Diet guidance (iodine)", "Symptom diary"]
  },
  {
    id: "dp-6",
    name: "Bone & Joint Health",
    icon: "body",
    color: "#059669",
    bg: "#ECFDF5",
    condition: "Osteoporosis, Arthritis, Spondylitis",
    duration: "10 weeks",
    sessions: 20,
    price: 1899,
    features: ["DEXA scan coordination", "Rheumatologist / Ortho consult", "Physiotherapy (3×/week)", "Calcium & Vitamin D tracking", "Ergonomics coaching"]
  },
];

const COACHING_SESSIONS: CoachingSession[] = [
  {
    id: "cs-1",
    title: "Stress & Burnout Recovery",
    coach: "Dr. Priya Menon",
    specialty: "Clinical Psychologist",
    nextSession: "3 Nov 2026 • 7:00 PM",
    duration: "45 min",
    mode: "Video",
    price: 799,
    icon: "leaf",
    color: "#059669"
  },
  {
    id: "cs-2",
    title: "Plant-Based Nutrition",
    coach: "Ms. Ananya Iyer",
    specialty: "Registered Dietician",
    nextSession: "4 Nov 2026 • 12:00 PM",
    duration: "30 min",
    mode: "Video",
    price: 499,
    icon: "nutrition",
    color: "#16A34A"
  },
  {
    id: "cs-3",
    title: "Sleep Hygiene Coaching",
    coach: "Dr. Rajiv Khanna",
    specialty: "Sleep Medicine",
    nextSession: "5 Nov 2026 • 9:00 PM",
    duration: "45 min",
    mode: "Video",
    price: 699,
    icon: "moon",
    color: "#4338CA"
  },
  {
    id: "cs-4",
    title: "Fertility & Pre-Conception",
    coach: "Dr. Sunita Rao",
    specialty: "Reproductive Endocrinology",
    nextSession: "6 Nov 2026 • 11:00 AM",
    duration: "60 min",
    mode: "Video",
    price: 999,
    icon: "flower",
    color: "#DB2777"
  },
  {
    id: "cs-5",
    title: "Senior Fitness & Mobility",
    coach: "Mr. Karthik Nair",
    specialty: "Geriatric Fitness Expert",
    nextSession: "7 Nov 2026 • 6:00 AM",
    duration: "30 min",
    mode: "Video",
    price: 399,
    icon: "walk",
    color: "#0D9488"
  },
];

export default function HealthCampsScreen() {
  const [camps, setCamps] = useState<HealthCampDto[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [enrolledPrograms, setEnrolledPrograms] = useState<string[]>([]);
  const [bookedSessions, setBookedSessions] = useState<string[]>([]);
  const [tab, setTab] = useState<MainTab>("camps");

  useEffect(() => {
    healthService.getHealthCamps().then(setCamps);
  }, []);

  const handleRegister = async (camp: HealthCampDto) => {
    Alert.alert(
      "Reserve Private Slot",
      `Reserve for "${camp.title}" at ${camp.venue} (${camp.date})? Results go privately to your Health Vault.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Slot",
          onPress: async () => {
            await healthService.registerForCamp(camp.id, "fam-1", camp.startTime);
            setRegisteredIds(prev => [...prev, camp.id]);
            Alert.alert("Reserved! ✓", "Slot booked. Arrive on time at the Clubhouse venue.");
          }
        }
      ]
    );
  };

  const handleEnrollProgram = (prog: DiseaseProgram) => {
    Alert.alert(
      `Enroll in ${prog.name}`,
      `${prog.duration} · ${prog.sessions} sessions · ₹${prog.price}\n\nYour community health subsidy may cover up to 50% of this program.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Enroll — ₹${prog.price}`,
          onPress: () => {
            setEnrolledPrograms(prev => [...prev, prog.id]);
            Alert.alert("Enrolled! 🎉", `Welcome to ${prog.name}. Your first session will be scheduled within 24 hours.`);
          }
        }
      ]
    );
  };

  const handleBookSession = (session: CoachingSession) => {
    Alert.alert(
      `Book: ${session.title}`,
      `With ${session.coach} (${session.specialty})\n${session.nextSession} · ${session.duration} · ${session.mode}\n\n₹${session.price} per session`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Book — ₹${session.price}`,
          onPress: () => {
            setBookedSessions(prev => [...prev, session.id]);
            Alert.alert("Booked! ✓", `${session.title} confirmed for ${session.nextSession}. Link will be emailed 30 min before.`);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0F766E", "#0D9488"]} style={styles.header}>
        <Text style={styles.headerTitle}>⛺ Health & Wellness Hub</Text>
        <Text style={styles.headerSub}>Camps · Disease programs · Coaching sessions</Text>
      </LinearGradient>

      {/* Main tabs */}
      <View style={styles.tabRow}>
        {(["camps", "programs", "coaching"] as MainTab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "camps" ? "Clubhouse Camps" : t === "programs" ? "Disease Programs" : "Health Coaching"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── CAMPS TAB ── */}
        {tab === "camps" && camps.map(camp => {
          const isRegistered = registeredIds.includes(camp.id);
          return (
            <View key={camp.id} style={styles.campCard}>
              <View style={styles.campTopRow}>
                <View style={styles.campBadge}>
                  <Text style={styles.campBadgeText}>{camp.campCategory.replace("_", " ")}</Text>
                </View>
                <View style={[styles.priceTag, camp.isFree ? styles.freeTag : styles.paidTag]}>
                  <Text style={[styles.priceTagText, camp.isFree ? styles.freeText : styles.paidText]}>
                    {camp.isFree ? "FREE DRIVE" : `₹${camp.feePerResident}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.campTitle}>{camp.title}</Text>
              <Text style={styles.campPartner}>Partner: <Text style={styles.campPartnerBold}>{camp.partnerProviderName}</Text></Text>
              <Text style={styles.campDesc}>{camp.description}</Text>
              <View style={styles.campInfoBox}>
                <View style={styles.infoRow}><Ionicons name="location-outline" size={13} color="#0D9488" /><Text style={styles.infoText}>{camp.venue}</Text></View>
                <View style={styles.infoRow}><Ionicons name="calendar-outline" size={13} color="#0D9488" /><Text style={styles.infoText}>{camp.date} • {camp.startTime}–{camp.endTime}</Text></View>
                <View style={styles.infoRow}><Ionicons name="people-outline" size={13} color="#0D9488" /><Text style={styles.infoText}>{camp.availableSlots}/{camp.totalSlots} slots available</Text></View>
              </View>
              <View style={styles.servicesWrap}>
                {camp.servicesIncluded.map((s, idx) => (
                  <View key={idx} style={styles.serviceChip}><Text style={styles.serviceText}>✓ {s}</Text></View>
                ))}
              </View>
              <TouchableOpacity disabled={isRegistered} style={[styles.campBtn, isRegistered ? styles.campBtnDone : styles.campBtnActive]} onPress={() => handleRegister(camp)}>
                <Text style={[styles.campBtnText, isRegistered && { color: "#64748B" }]}>{isRegistered ? "Slot Reserved ✓" : "Reserve Private Slot"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── DISEASE PROGRAMS TAB ── */}
        {tab === "programs" && (
          <>
            <View style={styles.programsBanner}>
              <Ionicons name="ribbon" size={16} color="#0D9488" />
              <Text style={styles.programsBannerText}>Structured chronic disease programs with specialist oversight, lab tracking, and community subsidy support. Up to 50% subsidised for Mana residents.</Text>
            </View>
            {DISEASE_PROGRAMS.map(prog => {
              const enrolled = enrolledPrograms.includes(prog.id);
              return (
                <View key={prog.id} style={[styles.progCard, { borderLeftColor: prog.color }]}>
                  <View style={styles.progTopRow}>
                    <View style={[styles.progIcon, { backgroundColor: prog.bg }]}>
                      <Ionicons name={prog.icon as any} size={20} color={prog.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.progName}>{prog.name}</Text>
                      <Text style={[styles.progCondition, { color: prog.color }]}>{prog.condition}</Text>
                    </View>
                    {enrolled && (
                      <View style={[styles.enrolledBadge, { backgroundColor: prog.color + "18" }]}>
                        <Text style={[styles.enrolledBadgeText, { color: prog.color }]}>Enrolled ✓</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.progMetaRow}>
                    <Text style={styles.progMeta}>{prog.duration} · {prog.sessions} sessions</Text>
                    <Text style={[styles.progPrice, { color: prog.color }]}>₹{prog.price}</Text>
                  </View>
                  <View style={styles.progFeatures}>
                    {prog.features.map(f => (
                      <View key={f} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={13} color={prog.color} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  {!enrolled && (
                    <TouchableOpacity style={[styles.progBtn, { backgroundColor: prog.color }]} onPress={() => handleEnrollProgram(prog)}>
                      <Text style={styles.progBtnText}>Enroll Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ── COACHING TAB ── */}
        {tab === "coaching" && (
          <>
            <View style={styles.programsBanner}>
              <Ionicons name="school" size={15} color="#0D9488" />
              <Text style={styles.programsBannerText}>1-on-1 coaching with certified specialists. Book single sessions or subscribe for ongoing support. Community discount applied automatically.</Text>
            </View>
            {COACHING_SESSIONS.map(session => {
              const booked = bookedSessions.includes(session.id);
              return (
                <View key={session.id} style={styles.coachCard}>
                  <View style={styles.coachTopRow}>
                    <View style={[styles.coachIcon, { backgroundColor: session.color + "18" }]}>
                      <Ionicons name={session.icon as any} size={20} color={session.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachTitle}>{session.title}</Text>
                      <Text style={styles.coachName}>{session.coach} · {session.specialty}</Text>
                    </View>
                    {booked && (
                      <View style={styles.bookedBadge}>
                        <Text style={styles.bookedBadgeText}>Booked ✓</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.coachMeta}>
                    <View style={styles.coachMetaItem}><Ionicons name="calendar-outline" size={12} color="#6B7280" /><Text style={styles.coachMetaText}>{session.nextSession}</Text></View>
                    <View style={styles.coachMetaItem}><Ionicons name="time-outline" size={12} color="#6B7280" /><Text style={styles.coachMetaText}>{session.duration}</Text></View>
                    <View style={styles.coachMetaItem}><Ionicons name="videocam-outline" size={12} color="#6B7280" /><Text style={styles.coachMetaText}>{session.mode}</Text></View>
                  </View>
                  <View style={styles.coachFooter}>
                    <Text style={[styles.coachPrice, { color: session.color }]}>₹{session.price} / session</Text>
                    {!booked && (
                      <TouchableOpacity style={[styles.coachBtn, { backgroundColor: session.color }]} onPress={() => handleBookSession(session)}>
                        <Text style={styles.coachBtnText}>Book Session</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  headerTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  headerSub: { color: "#CCFBF1", fontSize: 11, marginTop: 2 },
  tabRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#0D9488" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#0D9488", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40, gap: 14 },
  // Camp cards
  campCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  campTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  campBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#CCFBF1" },
  campBadgeText: { fontSize: 10, fontWeight: "700", color: "#0F766E" },
  priceTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  freeTag: { backgroundColor: "#DCFCE7" }, paidTag: { backgroundColor: "#EFF6FF" },
  priceTagText: { fontSize: 10, fontWeight: "800" }, freeText: { color: "#166534" }, paidText: { color: "#1E40AF" },
  campTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  campPartner: { fontSize: 11, color: "#64748B", marginTop: 2 },
  campPartnerBold: { fontWeight: "700", color: "#0D9488" },
  campDesc: { fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 17 },
  campInfoBox: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, marginTop: 10, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: "#334155" },
  servicesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  serviceChip: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  serviceText: { fontSize: 10, color: "#334155", fontWeight: "500" },
  campBtn: { marginTop: 12, paddingVertical: 11, borderRadius: 10, alignItems: "center" },
  campBtnActive: { backgroundColor: "#0D9488" }, campBtnDone: { backgroundColor: "#E2E8F0" },
  campBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  // Programs
  programsBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F0FDFA", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#99F6E4" },
  programsBannerText: { fontSize: 12, color: "#0F766E", flex: 1, lineHeight: 17 },
  progCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", borderLeftWidth: 4, gap: 10 },
  progTopRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  progIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  progName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  progCondition: { fontSize: 11, marginTop: 1, fontWeight: "500" },
  progMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progMeta: { fontSize: 12, color: "#6B7280" },
  progPrice: { fontSize: 16, fontWeight: "800" },
  progFeatures: { gap: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureText: { fontSize: 12, color: "#374151" },
  enrolledBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  enrolledBadgeText: { fontSize: 10, fontWeight: "800" },
  progBtn: { paddingVertical: 11, borderRadius: 10, alignItems: "center" },
  progBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  // Coaching
  coachCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  coachTopRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  coachIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  coachTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  coachName: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  bookedBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bookedBadgeText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  coachMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  coachMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  coachMetaText: { fontSize: 11, color: "#6B7280" },
  coachFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  coachPrice: { fontSize: 15, fontWeight: "800" },
  coachBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  coachBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
});
