import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Modal, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { DoctorDto, DoctorReview } from "@/types/health";

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorDto | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rComm, setRComm] = useState(5);
  const [rWait, setRWait] = useState(5);
  const [rProf, setRProf] = useState(5);
  const [rClinic, setRClinic] = useState(5);
  const [rRecommend, setRRecommend] = useState(true);
  const [rComment, setRComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      healthService.getDoctorById(id).then(d => setDoctor(d || null));
    }
  }, [id]);

  const handleSubmitReview = async () => {
    if (!doctor) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 700));
    const newReview: DoctorReview = {
      communication: rComm, waitingTime: rWait, professionalism: rProf,
      clinicExperience: rClinic, wouldRecommend: rRecommend,
      comment: rComment || undefined, authorName: "You", date: new Date().toLocaleDateString("en-IN")
    };
    setDoctor(prev => prev ? { ...prev, reviews: [newReview, ...prev.reviews] } : prev);
    setSubmitting(false);
    setReviewSubmitted(true);
    setShowReviewModal(false);
    Alert.alert("Thank you!", "Your verified review helps fellow community members make informed healthcare choices.");
  };

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

        {/* Community Exclusive Offer */}
        {doctor.communityOffer && (
          <View style={[styles.card, styles.offerCard]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.offerCardTitle}>🎉 {doctor.communityOffer.title}</Text>
              <View style={styles.offerBadgePill}>
                <Text style={styles.offerBadgeText}>{doctor.communityOffer.badge}</Text>
              </View>
            </View>
            <Text style={styles.offerDesc}>{doctor.communityOffer.description}</Text>
            {doctor.communityOffer.promoCode && (
              <Text style={styles.promoCodeText}>Code: {doctor.communityOffer.promoCode}</Text>
            )}
          </View>
        )}

        {/* Clinic Location & Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clinic Schedule & Modes</Text>
          <Text style={styles.clinicName}>{doctor.clinicName}</Text>
          <Text style={styles.clinicAddress}>
            {doctor.clinicAddress} {doctor.distanceKm !== undefined ? `(${doctor.distanceKm === 0 ? "On-Campus" : `${doctor.distanceKm} km`})` : ""}
          </Text>
          
          {doctor.phone && (
            <TouchableOpacity
              style={styles.callRow}
              onPress={() => Linking.openURL(`tel:${doctor.phone?.replace(/[^0-9+]/g, "")}`)}
            >
              <Ionicons name="call" size={15} color="#0D9488" />
              <Text style={styles.callPhoneText}>Call: {doctor.phone}</Text>
            </TouchableOpacity>
          )}

          {/* Weekly Hours */}
          {doctor.clinicHours && doctor.clinicHours.length > 0 && (
            <View style={styles.hoursList}>
              <Text style={styles.hoursTitle}>Operating Hours:</Text>
              {doctor.clinicHours.map((slot, idx) => (
                <View key={idx} style={styles.hourRow}>
                  <Text style={styles.hourDay}>{slot.day}</Text>
                  <Text style={styles.hourVal}>
                    {slot.is24x7 ? "24x7 Open" : slot.isClosed ? "Closed" : [slot.morning, slot.evening].filter(Boolean).join(" | ")}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.modesRow}>
            {doctor.consultationModes.map(m => (
              <View key={m} style={styles.modePill}>
                <Text style={styles.modeText}>{m === "IN_PERSON" ? "🏥 Clinic Visit" : m === "VIDEO" ? "📹 Video Call" : "📞 Phone"}</Text>
              </View>
            ))}
            {doctor.homeVisitAvailable && (
              <View style={[styles.modePill, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[styles.modeText, { color: "#065F46" }]}>🏡 Home Visit Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Verified Community Reviews */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.cardTitle}>Community Reviews ({doctor.reviews.length})</Text>
            <Text style={styles.ratingHeader}>⭐ {doctor.rating} / 5</Text>
          </View>

          {!reviewSubmitted && (
            <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)} activeOpacity={0.85}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.writeReviewBtnText}>Rate & Review This Doctor</Text>
            </TouchableOpacity>
          )}

          {doctor.reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet. Be the first to consult and review!</Text>
          ) : (
            doctor.reviews.map((rev, idx) => (
              <View key={idx} style={styles.reviewItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.revAuthor}>{rev.authorName}</Text>
                  <Text style={styles.revDate}>{rev.date}</Text>
                </View>
                {rev.comment && <Text style={styles.revComment}>{rev.comment}</Text>}
                <View style={styles.revDims}>
                  <Text style={styles.dimText}>Comm: ⭐{rev.communication}</Text>
                  <Text style={styles.dimText}>Wait: ⭐{rev.waitingTime}</Text>
                  <Text style={styles.dimText}>Prof: ⭐{rev.professionalism}</Text>
                  {rev.wouldRecommend && <Text style={styles.recommendedText}>👍 Recommends</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Write Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={styles.reviewModalTitle}>Rate {doctor.name}</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.reviewModalSub}>Tap stars to rate each dimension</Text>

              {([
                { label: "Communication", val: rComm, set: setRComm },
                { label: "Waiting Time", val: rWait, set: setRWait },
                { label: "Professionalism", val: rProf, set: setRProf },
                { label: "Clinic Experience", val: rClinic, set: setRClinic }
              ] as { label: string; val: number; set: (n: number) => void }[]).map(dim => (
                <View key={dim.label} style={styles.reviewDimRow}>
                  <Text style={styles.reviewDimLabel}>{dim.label}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <TouchableOpacity key={n} onPress={() => dim.set(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                        <Ionicons name={n <= dim.val ? "star" : "star-outline"} size={24} color={n <= dim.val ? "#F59E0B" : "#D1D5DB"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.recommendToggle, rRecommend && styles.recommendToggleActive]}
                onPress={() => setRRecommend(!rRecommend)}
              >
                <Ionicons name={rRecommend ? "thumbs-up" : "thumbs-up-outline"} size={16} color={rRecommend ? "#0D9488" : "#6B7280"} />
                <Text style={[styles.recommendToggleText, rRecommend && { color: "#0D9488" }]}>
                  {rRecommend ? "I would recommend this doctor" : "Would you recommend this doctor?"}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.reviewTextInput}
                placeholder="Share your experience (optional)..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={rComment}
                onChangeText={setRComment}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={styles.reviewCancelBtn} onPress={() => setShowReviewModal(false)}>
                  <Text style={styles.reviewCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reviewSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitReview}
                  disabled={submitting}
                >
                  <Text style={styles.reviewSubmitText}>{submitting ? "Submitting…" : "Submit Review"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  revDims: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dimText: { fontSize: 10, color: "#6B7280" },
  recommendedText: { fontSize: 10, color: "#0D9488", fontWeight: "600" },
  writeReviewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", paddingVertical: 10, borderRadius: 10 },
  writeReviewBtnText: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  bottomBar: { backgroundColor: "#FFFFFF", padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feeLabel: { fontSize: 11, color: "#6B7280" },
  feeAmount: { fontSize: 20, fontWeight: "bold", color: "#0D9488" },
  bookCta: { backgroundColor: "#0D9488", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  bookCtaText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  offerCard: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  offerCardTitle: { fontSize: 14, fontWeight: "bold", color: "#92400E" },
  offerBadgePill: { backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  offerBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  offerDesc: { fontSize: 12, color: "#78350F", marginTop: 4 },
  promoCodeText: { fontSize: 11, fontWeight: "bold", color: "#B45309", marginTop: 4 },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 },
  callPhoneText: { fontSize: 12, color: "#0D9488", fontWeight: "bold" },
  hoursList: { backgroundColor: "#F8FAFC", padding: 10, borderRadius: 8, marginVertical: 6, gap: 4 },
  hoursTitle: { fontSize: 11, fontWeight: "bold", color: "#334155", marginBottom: 2 },
  hourRow: { flexDirection: "row", justifyContent: "space-between" },
  hourDay: { fontSize: 11, fontWeight: "600", color: "#475569" },
  hourVal: { fontSize: 11, color: "#64748B" },
  reviewModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  reviewModalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  reviewModalTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  reviewModalSub: { fontSize: 12, color: "#6B7280", marginBottom: 12 },
  reviewDimRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  reviewDimLabel: { fontSize: 13, color: "#374151", fontWeight: "600" },
  recommendToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", marginVertical: 10 },
  recommendToggleActive: { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" },
  recommendToggleText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  reviewTextInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, minHeight: 80, fontSize: 13, color: "#0F172A", backgroundColor: "#F9FAFB", marginBottom: 8 },
  reviewCancelBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  reviewCancelText: { color: "#374151", fontWeight: "700", fontSize: 13 },
  reviewSubmitBtn: { flex: 1, backgroundColor: "#0D9488", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  reviewSubmitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 }
});