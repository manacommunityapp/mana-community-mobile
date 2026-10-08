import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService, SEED_LAB_PACKAGES, SEED_EMERGENCY_CONTACTS } from "@/services/healthService";
import { DoctorDto, HealthAppointmentDto } from "@/types/health";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";

export default function HealthHubScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [appointments, setAppointments] = useState<HealthAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [d, a] = await Promise.all([
        healthService.getDoctors(),
        healthService.getAppointments()
      ]);
      setDoctors(d);
      setAppointments(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    };
  };

  return (
    <View style={styles.container}>
      {/* Premium Teal Gradient Header */}
      <LinearGradient
        colors={["#0F766E", "#0D9488", "#14B8A6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>🩺 Mana Health</Text>
            <Text style={styles.headerSub}>Trusted healthcare network for your community</Text>
          </View>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => router.push("/health/emergency")}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* AI Symptom Guidance Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => router.push("/health/ai-assistant")}
          activeOpacity={0.85}
        >
          <View style={styles.aiIconWrap}>
            <Ionicons name="sparkles" size={24} color="#0D9488" />
          </View>
          <View style={styles.aiTextWrap}>
            <Text style={styles.aiTitle}>Not sure which doctor to see?</Text>
            <Text style={styles.aiDesc}>Tell Mana AI your symptoms for instant safe guidance & specialty navigation.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#0D9488" />
        </TouchableOpacity>

        {/* Quick Hub Grid */}
        <Text style={styles.sectionTitle}>Healthcare Services</Text>
        <View style={styles.grid}>
          {[
            { title: "Find Doctors", desc: "Specialists & Clinic", icon: "medkit", route: "/health/doctors", color: "#0D9488", bg: "#CCFBF1" },
            { title: "Family Health", desc: "Manage Dependents", icon: "people", route: "/health/family", color: "#6366F1", bg: "#EEF2FF" },
            { title: "Health Vault", desc: "Prescriptions & Reports", icon: "shield-checkmark", route: "/health/records", color: "#059669", bg: "#DCFCE7" },
            { title: "Lab Packages", desc: "Home Collection", icon: "flask", route: "/health/labs", color: "#D97706", bg: "#FEF3C7" },
            { title: "Home Care", desc: "Nurses & Physio", icon: "home", route: "/health/homecare", color: "#DB2777", bg: "#FCE7F3" },
            { title: "Emergency", desc: "Ambulance & 24x7", icon: "warning", route: "/health/emergency", color: "#DC2626", bg: "#FEE2E2" },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.gridItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.gridIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.gridItemTitle}>{item.title}</Text>
              <Text style={styles.gridItemDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Upcoming Consultations</Text>
              <Text style={styles.sectionBadge}>{appointments.length} Active</Text>
            </View>
            {appointments.map(appt => (
              <TouchableOpacity
                key={appt.id}
                style={styles.appointmentCard}
                onPress={() => router.push(`/health/appointments/${appt.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.apptTopRow}>
                  <View>
                    <Text style={styles.apptDoctor}>{appt.doctorName}</Text>
                    <Text style={styles.apptSpecialty}>{appt.doctorSpecialty} • Patient: {appt.patientName}</Text>
                  </View>
                  <View style={styles.modePill}>
                    <Text style={styles.modeText}>{appt.mode}</Text>
                  </View>
                </View>
                <View style={styles.apptBottomRow}>
                  <View style={styles.timeWrap}>
                    <Ionicons name="time-outline" size={14} color="#475569" />
                    <Text style={styles.timeText}>{appt.slotTime}</Text>
                  </View>
                  <Text style={styles.feeText}>₹{appt.fee} Paid</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Community Trusted Doctors */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Community Verified Doctors</Text>
            <TouchableOpacity onPress={() => router.push("/health/doctors")}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          {doctors.slice(0, 2).map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.doctorCard}
              onPress={() => router.push(`/health/doctors/${doc.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.doctorHeader}>
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={24} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.doctorName}>{doc.name}</Text>
                    {doc.verifiedBadge && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.doctorSpec}>{doc.specialty} • {doc.experienceYears} yrs exp</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {doc.rating}</Text>
                </View>
              </View>
              <View style={styles.trustBanner}>
                <Ionicons name="shield-checkmark" size={14} color="#065F46" />
                <Text style={styles.trustText}>
                  {doc.verifiedCommunityConsultations} verified community members consulted
                </Text>
              </View>
              <View style={styles.doctorFooter}>
                <Text style={styles.doctorFee}>₹{doc.consultationFee} consultation</Text>
                <View style={styles.bookBtnSmall}>
                  <Text style={styles.bookBtnSmallText}>Book Slot</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, ...SHADOWS.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold", fontFamily: FONTS.displayBold, letterSpacing: -0.3 },
  headerSub: { color: "#CCFBF1", fontSize: 12, marginTop: 2, fontFamily: FONTS.medium },
  sosButton: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, ...SHADOWS.sm },
  sosButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12, fontFamily: FONTS.bold },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  aiBanner: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", borderRadius: RADIUS.squircle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...SHADOWS.card },
  aiIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  aiTextWrap: { flex: 1 },
  aiTitle: { fontSize: 14, fontWeight: "bold", color: "#0F766E", fontFamily: FONTS.bold },
  aiDesc: { fontSize: 12, color: "#115E59", marginTop: 2, fontFamily: FONTS.regular },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold, letterSpacing: -0.2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "31%", backgroundColor: "#FFFFFF", padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", ...SHADOWS.card },
  gridIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  gridItemTitle: { fontSize: 12, fontWeight: "700", color: "#1E293B", textAlign: "center", fontFamily: FONTS.semiBold },
  gridItemDesc: { fontSize: 9.5, color: "#64748B", textAlign: "center", marginTop: 1, fontFamily: FONTS.regular },
  sectionWrap: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionBadge: { backgroundColor: "#EEF2FF", color: "#4F46E5", fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  seeAllText: { fontSize: 13, fontWeight: "700", color: "#0D9488", fontFamily: FONTS.semiBold },
  appointmentCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: RADIUS.squircle, borderWidth: 1, borderColor: "#E2E8F0", gap: 8, ...SHADOWS.card },
  apptTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  apptDoctor: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold },
  apptSpecialty: { fontSize: 12, color: "#475569", marginTop: 2, fontFamily: FONTS.regular },
  modePill: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  modeText: { color: "#15803D", fontSize: 11, fontWeight: "700", fontFamily: FONTS.bold },
  apptBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  timeWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12, color: "#475569", fontFamily: FONTS.medium },
  feeText: { fontSize: 12, fontWeight: "700", color: "#059669", fontFamily: FONTS.bold },
  doctorCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: RADIUS.squircle, borderWidth: 1, borderColor: "#E2E8F0", gap: 10, ...SHADOWS.card },
  doctorHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  doctorName: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold },
  doctorSpec: { fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: FONTS.regular },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  verifiedText: { color: "#1D4ED8", fontSize: 10, fontWeight: "800", fontFamily: FONTS.bold },
  ratingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#92400E", fontFamily: FONTS.bold },
  trustBanner: { backgroundColor: "#ECFDF5", padding: 8, borderRadius: RADIUS.sm, flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 11, color: "#065F46", fontWeight: "600", fontFamily: FONTS.medium },
  doctorFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  doctorFee: { fontSize: 13, fontWeight: "700", color: "#334155", fontFamily: FONTS.semiBold },
  bookBtnSmall: { backgroundColor: "#0D9488", paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.sm, ...SHADOWS.glowTeal },
  bookBtnSmallText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12, fontFamily: FONTS.bold }
});