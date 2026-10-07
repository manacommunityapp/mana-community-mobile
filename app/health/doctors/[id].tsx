import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { DoctorDto } from "@/types/health";

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorDto | null>(null);

  useEffect(() => {
    if (id) {
      healthService.getDoctorById(id).then(d => setDoctor(d || null));
    }
  }, [id]);

  if (!doctor) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0D9488" />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Doctor Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={36} color="#0D9488" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.name}>{doctor.name}</Text>
                {doctor.verifiedBadge && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.specialty}>{doctor.specialty}</Text>
              <Text style={styles.quals}>{doctor.qualifications.join(", ")}</Text>
              <Text style={styles.exp}>{doctor.experienceYears} Years Experience</Text>
            </View>
          </View>

          {/* Trust Metric */}
          <View style={styles.trustBox}>
            <Ionicons name="shield-checkmark" size={18} color="#065F46" />
            <Text style={styles.trustText}>
              {doctor.verifiedCommunityConsultations} verified community members have consulted this doctor.
            </Text>
          </View>
        </View>

        {/* Verification Credentials */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medical Registration & Credentials</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration No:</Text>
            <Text style={styles.infoValue}>{doctor.registrationNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Medical Council:</Text>
            <Text style={styles.infoValue}>{doctor.medicalCouncil}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Languages:</Text>
            <Text style={styles.infoValue}>{doctor.languages.join(", ")}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hospital Affiliations:</Text>
            <Text style={styles.infoValue}>{doctor.hospitalAffiliations.join(", ")}</Text>
          </View>
        </View>

        {/* Clinic Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clinic & Consultation Modes</Text>
          <Text style={styles.clinicName}>{doctor.clinicName}</Text>
          <Text style={styles.clinicAddress}>{doctor.clinicAddress}</Text>
          <View style={styles.modesRow}>
            {doctor.consultationModes.map(m => (
              <View key={m} style={styles.modePill}>
                <Text style={styles.modeText}>{m === "IN_PERSON" ? "🏥 In-Person Clinic" : m === "VIDEO" ? "📹 Video Call" : "📞 Phone"}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Verified Community Reviews */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.cardTitle}>Community Reviews ({doctor.reviews.length})</Text>
            <Text style={styles.ratingHeader}>⭐ {doctor.rating} / 5</Text>
          </View>
          {doctor.reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet. Be the first to consult and review!</Text>
          ) : (
            doctor.reviews.map((rev, idx) => (
              <View key={idx} style={styles.reviewItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.revAuthor}>{rev.authorName}</Text>
                  <Text style={styles.revDate}>{rev.date}</Text>
                </View>
                <Text style={styles.revComment}>{rev.comment}</Text>
                <View style={styles.revDims}>
                  <Text style={styles.dimText}>Comm: ⭐{rev.communication}</Text>
                  <Text style={styles.dimText}>Wait: ⭐{rev.waitingTime}</Text>
                  <Text style={styles.dimText}>Prof: ⭐{rev.professionalism}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeAmount}>₹{doctor.consultationFee}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookCta}
          onPress={() => router.push({ pathname: "/health/appointments/book", params: { doctorId: doctor.id } })}
        >
          <Text style={styles.bookCtaText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  specialty: { fontSize: 14, color: "#0D9488", fontWeight: "600", marginTop: 2 },
  quals: { fontSize: 12, color: "#4B5563" },
  exp: { fontSize: 12, color: "#6B7280" },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: "#1D4ED8", fontSize: 10, fontWeight: "bold" },
  trustBox: { backgroundColor: "#ECFDF5", padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  trustText: { fontSize: 12, color: "#065F46", fontWeight: "600", flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: "#6B7280" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  clinicName: { fontSize: 14, fontWeight: "bold", color: "#1F2937" },
  clinicAddress: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  modesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  modePill: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modeText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  ratingHeader: { fontSize: 14, fontWeight: "bold", color: "#B45309" },
  emptyReviews: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginVertical: 8 },
  reviewItem: { backgroundColor: "#F9FAFB", padding: 10, borderRadius: 10, gap: 4, marginTop: 6 },
  revAuthor: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  revDate: { fontSize: 10, color: "#9CA3AF" },
  revComment: { fontSize: 12, color: "#374151" },
  revDims: { flexDirection: "row", gap: 10, marginTop: 4 },
  dimText: { fontSize: 10, color: "#6B7280" },
  bottomBar: { backgroundColor: "#FFFFFF", padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feeLabel: { fontSize: 11, color: "#6B7280" },
  feeAmount: { fontSize: 20, fontWeight: "bold", color: "#0D9488" },
  bookCta: { backgroundColor: "#0D9488", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  bookCtaText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 }
});