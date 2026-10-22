import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

type Tab = "home" | "consult" | "programs" | "crisis";
type Mood = 1 | 2 | 3 | 4 | 5;

const MOODS: { score: Mood; label: string; emoji: string; color: string }[] = [
  { score: 1, label: "Very Low", emoji: "😔", color: "#DC2626" },
  { score: 2, label: "Low", emoji: "😟", color: "#D97706" },
  { score: 3, label: "Okay", emoji: "😐", color: "#CA8A04" },
  { score: 4, label: "Good", emoji: "🙂", color: "#16A34A" },
  { score: 5, label: "Great", emoji: "😄", color: "#059669" },
];

const THERAPISTS = [
  { id: "t1", name: "Dr. Priya Sharma", specialty: "Clinical Psychologist", exp: "12 yrs", fee: 1200, modes: ["Video", "Phone"], next: "Today 5:00 PM", rating: 4.9 },
  { id: "t2", name: "Dr. Rajan Menon", specialty: "Psychiatrist", exp: "18 yrs", fee: 1800, modes: ["Video"], next: "Today 7:00 PM", rating: 4.8 },
  { id: "t3", name: "Dr. Sonal Verma", specialty: "Psychotherapist", exp: "8 yrs", fee: 900, modes: ["Video", "Phone", "Chat"], next: "Tomorrow 10:00 AM", rating: 4.7 },
  { id: "t4", name: "Dr. Amit Krishnan", specialty: "Counselling Psychologist", exp: "6 yrs", fee: 700, modes: ["Chat", "Phone"], next: "Today 3:30 PM", rating: 4.6 },
];

const PROGRAMS = [
  { id: "p1", title: "Stress & Anxiety Relief", sessions: 8, duration: "4 weeks", icon: "leaf", color: "#059669", bg: "#D1FAE5", desc: "CBT-based techniques to manage daily anxiety" },
  { id: "p2", title: "Sleep Improvement", sessions: 6, duration: "3 weeks", icon: "moon", color: "#7C3AED", bg: "#EDE9FE", desc: "Science-backed methods for better sleep hygiene" },
  { id: "p3", title: "Mindfulness & Meditation", sessions: 12, duration: "6 weeks", icon: "body", color: "#2563EB", bg: "#DBEAFE", desc: "Daily mindfulness practices with guided sessions" },
  { id: "p4", title: "Relationship Wellness", sessions: 6, duration: "3 weeks", icon: "heart", color: "#DB2777", bg: "#FCE7F3", desc: "Communication and emotional connection skills" },
  { id: "p5", title: "Work Burnout Recovery", sessions: 8, duration: "4 weeks", icon: "briefcase", color: "#D97706", bg: "#FEF3C7", desc: "Identify and address professional burnout triggers" },
];

export default function MentalHealthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [moodLogged, setMoodLogged] = useState(false);
  const [programModal, setProgramModal] = useState<typeof PROGRAMS[0] | null>(null);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "consult", label: "Consult", icon: "person" },
    { id: "programs", label: "Programs", icon: "library" },
    { id: "crisis", label: "Crisis", icon: "warning" },
  ];

  const handleLogMood = () => {
    if (!selectedMood) return;
    setMoodLogged(true);
    const mood = MOODS.find(m => m.score === selectedMood)!;
    const msg = selectedMood <= 2
      ? "We noticed you're feeling low. A therapist is just a tap away. Would you like to talk to someone?"
      : `Great that you checked in! Keep up your wellness journey.`;
    Alert.alert(`Mood Logged ${mood.emoji}`, msg);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.header}>
        <Text style={styles.headerTitle}>Mental Wellness</Text>
        <Text style={styles.headerSub}>Your mind matters — find support, anytime</Text>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.activeTab]}
            onPress={() => setActiveTab(t.id)}
          >
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.id ? "#7C3AED" : "#6B7280"} />
            <Text style={[styles.tabText, activeTab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeTab === "home" && (
          <>
            {/* Mood Check-in */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How are you feeling today?</Text>
              <Text style={styles.cardSub}>Daily mood tracking helps identify patterns over time.</Text>
              <View style={styles.moodRow}>
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.score}
                    style={[styles.moodBtn, selectedMood === m.score && { borderColor: m.color, backgroundColor: m.color + "18" }]}
                    onPress={() => setSelectedMood(m.score)}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, selectedMood === m.score && { color: m.color, fontWeight: "700" }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedMood && !moodLogged && (
                <>
                  <TextInput
                    style={styles.moodInput}
                    placeholder="Add a note (optional)..."
                    placeholderTextColor="#9CA3AF"
                    value={moodNote}
                    onChangeText={setMoodNote}
                    multiline
                    numberOfLines={2}
                  />
                  <TouchableOpacity style={styles.moodLogBtn} onPress={handleLogMood}>
                    <Text style={styles.moodLogBtnText}>Log Mood</Text>
                  </TouchableOpacity>
                </>
              )}
              {moodLogged && (
                <View style={styles.moodLoggedRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.moodLoggedText}>Mood logged for today!</Text>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickGrid}>
              {[
                { label: "Talk to a Therapist", icon: "chatbubbles", color: "#7C3AED", tab: "consult" as Tab },
                { label: "Wellness Programs", icon: "library", color: "#2563EB", tab: "programs" as Tab },
                { label: "Crisis Support", icon: "call", color: "#DC2626", tab: "crisis" as Tab },
              ].map(q => (
                <TouchableOpacity key={q.label} style={styles.quickCard} onPress={() => setActiveTab(q.tab)}>
                  <View style={[styles.quickIcon, { backgroundColor: q.color + "18" }]}>
                    <Ionicons name={q.icon as any} size={22} color={q.color} />
                  </View>
                  <Text style={styles.quickLabel}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mental Health Tips */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week's Tip</Text>
              <View style={styles.tipRow}>
                <View style={[styles.tipIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="sunny" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>The 5-4-3-2-1 Grounding Technique</Text>
                  <Text style={styles.tipDesc}>When anxious, name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste. Instantly brings you back to the present.</Text>
                </View>
              </View>
            </View>

            {/* Mood Streak */}
            <View style={styles.streakCard}>
              <Ionicons name="flame" size={24} color="#F97316" />
              <View style={{ flex: 1 }}>
                <Text style={styles.streakTitle}>3-Day Check-in Streak 🔥</Text>
                <Text style={styles.streakSub}>Keep logging daily to build your wellness profile</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === "consult" && (
          <>
            <Text style={styles.sectionLabel}>Mental Health Specialists</Text>
            <Text style={styles.sectionSub}>50-minute sessions with licensed therapists & psychiatrists</Text>
            {THERAPISTS.map(t => (
              <View key={t.id} style={styles.therapistCard}>
                <View style={styles.therapistHeader}>
                  <View style={styles.therapistAvatar}>
                    <Ionicons name="person" size={24} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.therapistName}>{t.name}</Text>
                    <Text style={styles.therapistSpec}>{t.specialty} • {t.exp}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{t.rating}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.therapistFee}>₹{t.fee}</Text>
                    <Text style={styles.therapistFeeLabel}>/ session</Text>
                  </View>
                </View>
                <View style={styles.therapistModes}>
                  {t.modes.map(m => (
                    <View key={m} style={styles.modeChip}>
                      <Text style={styles.modeChipText}>{m}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.therapistFooter}>
                  <View style={styles.nextSlotRow}>
                    <Ionicons name="time" size={13} color="#6B7280" />
                    <Text style={styles.nextSlotText}>{t.next}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bookTherapistBtn}
                    onPress={() => Alert.alert("Session Booked", `50-min session with ${t.name} booked!\nYou'll receive a confirmation & meeting link.`)}
                  >
                    <Text style={styles.bookTherapistBtnText}>Book Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === "programs" && (
          <>
            <Text style={styles.sectionLabel}>Wellness Programs</Text>
            <Text style={styles.sectionSub}>Structured multi-session programs with certified coaches</Text>
            {PROGRAMS.map(p => (
              <TouchableOpacity key={p.id} style={styles.programCard} onPress={() => setProgramModal(p)}>
                <View style={[styles.programIcon, { backgroundColor: p.bg }]}>
                  <Ionicons name={p.icon as any} size={22} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.programTitle}>{p.title}</Text>
                  <Text style={styles.programDesc}>{p.desc}</Text>
                  <View style={styles.programMeta}>
                    <Text style={styles.programMetaText}>{p.sessions} sessions</Text>
                    <Text style={styles.programMetaDot}>·</Text>
                    <Text style={styles.programMetaText}>{p.duration}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeTab === "crisis" && (
          <>
            {/* Crisis Banner */}
            <LinearGradient colors={["#DC2626", "#B91C1C"]} style={styles.crisisBanner}>
              <Ionicons name="heart" size={28} color="#FFFFFF" />
              <Text style={styles.crisisTitle}>You Are Not Alone</Text>
              <Text style={styles.crisisSub}>If you're in crisis or having thoughts of self-harm, help is available right now.</Text>
            </LinearGradient>

            {/* Helplines */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crisis Helplines</Text>
              {[
                { name: "iCall (TISS)", number: "9152987821", avail: "Mon–Sat, 8AM–10PM" },
                { name: "Vandrevala Foundation", number: "1860-2662-345", avail: "24×7" },
                { name: "Snehi", number: "044-24640050", avail: "Mon–Sat, 8AM–10PM" },
                { name: "AASRA", number: "9820466627", avail: "24×7" },
              ].map(h => (
                <View key={h.name} style={styles.helplineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.helplineName}>{h.name}</Text>
                    <Text style={styles.helplineAvail}>{h.avail}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Alert.alert("Calling", `Connecting to ${h.name}…`)}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>{h.number}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Immediate Steps */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>If You're in Immediate Danger</Text>
              {["Call emergency services: 112", "Go to the nearest hospital emergency", "Ask someone you trust to be with you", "Remove access to means of harm"].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Talk to Therapist Now */}
            <TouchableOpacity style={styles.crisisConsultBtn} onPress={() => setActiveTab("consult")}>
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
              <Text style={styles.crisisConsultBtnText}>Talk to a Therapist Now</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Program Detail Modal */}
      <Modal visible={!!programModal} transparent animationType="slide" onRequestClose={() => setProgramModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {programModal && (
              <>
                <View style={styles.modalHandle} />
                <View style={[styles.programIcon, { backgroundColor: programModal.bg, alignSelf: "center", marginBottom: 12 }]}>
                  <Ionicons name={programModal.icon as any} size={28} color={programModal.color} />
                </View>
                <Text style={styles.modalTitle}>{programModal.title}</Text>
                <Text style={styles.modalDesc}>{programModal.desc}</Text>
                <View style={styles.modalMeta}>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.modalMetaText}>{programModal.sessions} sessions</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.modalMetaText}>{programModal.duration}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="videocam" size={16} color="#6B7280" />
                    <Text style={styles.modalMetaText}>Live video sessions</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.modalEnrollBtn, { backgroundColor: programModal.color }]}
                  onPress={() => {
                    setProgramModal(null);
                    Alert.alert("Enrolled!", `You've enrolled in "${programModal.title}". A coach will reach out within 24 hours.`);
                  }}
                >
                  <Text style={styles.modalEnrollBtnText}>Enrol in Program</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setProgramModal(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "#C4B5FD", marginTop: 4 },
  tabBar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", maxHeight: 48 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: "center" },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  activeTab: { backgroundColor: "#EDE9FE" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  activeTabText: { color: "#7C3AED", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  cardSub: { fontSize: 12, color: "#6B7280", marginTop: -4 },
  moodRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  moodBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 9, color: "#6B7280", fontWeight: "600", marginTop: 4 },
  moodInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 13, color: "#1E293B", minHeight: 56, textAlignVertical: "top" },
  moodLogBtn: { backgroundColor: "#7C3AED", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  moodLogBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  moodLoggedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moodLoggedText: { fontSize: 13, color: "#059669", fontWeight: "600" },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quickLabel: { fontSize: 11, fontWeight: "700", color: "#374151", textAlign: "center" },
  tipRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  tipIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  tipTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  tipDesc: { fontSize: 12, color: "#4B5563", lineHeight: 18 },
  streakCard: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  streakTitle: { fontSize: 13, fontWeight: "700", color: "#9A3412" },
  streakSub: { fontSize: 11, color: "#C2410C", marginTop: 2 },
  sectionLabel: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  sectionSub: { fontSize: 12, color: "#6B7280", marginTop: -8 },
  therapistCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  therapistHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  therapistAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center" },
  therapistName: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  therapistSpec: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  therapistFee: { fontSize: 16, fontWeight: "900", color: "#7C3AED" },
  therapistFeeLabel: { fontSize: 10, color: "#9CA3AF" },
  therapistModes: { flexDirection: "row", gap: 6 },
  modeChip: { backgroundColor: "#EDE9FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modeChipText: { fontSize: 11, color: "#7C3AED", fontWeight: "600" },
  therapistFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nextSlotRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  nextSlotText: { fontSize: 12, color: "#6B7280" },
  bookTherapistBtn: { backgroundColor: "#7C3AED", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  bookTherapistBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  programCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", gap: 12 },
  programIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  programTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  programDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  programMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  programMetaText: { fontSize: 11, color: "#7C3AED", fontWeight: "600" },
  programMetaDot: { fontSize: 11, color: "#9CA3AF" },
  crisisBanner: { borderRadius: 18, padding: 20, alignItems: "center", gap: 8 },
  crisisTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
  crisisSub: { fontSize: 13, color: "#FECACA", textAlign: "center", lineHeight: 20 },
  helplineRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  helplineName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  helplineAvail: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DC2626", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  callBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },
  stepNumText: { fontSize: 12, fontWeight: "800", color: "#DC2626" },
  stepText: { fontSize: 13, color: "#374151", flex: 1 },
  crisisConsultBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  crisisConsultBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  modalHandle: { width: 36, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", textAlign: "center" },
  modalDesc: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  modalMeta: { flexDirection: "row", justifyContent: "space-around" },
  modalMetaItem: { alignItems: "center", gap: 4 },
  modalMetaText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },
  modalEnrollBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalEnrollBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  modalCancelBtn: { paddingVertical: 10, alignItems: "center" },
  modalCancelText: { fontSize: 14, color: "#6B7280" },
});
