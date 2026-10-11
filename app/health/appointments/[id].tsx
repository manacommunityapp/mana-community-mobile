import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { HealthAppointmentDto, CareJourneyDto } from "@/types/health";

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<HealthAppointmentDto | null>(null);
  const [journey, setJourney] = useState<CareJourneyDto | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [comm, setComm] = useState(5);
  const [wait, setWait] = useState(5);
  const [prof, setProf] = useState(5);
  const [clinic, setClinic] = useState(5);
  const [recommend, setRecommend] = useState(true);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (id) {
      healthService.getAppointments().then(appts => {
        const found = appts.find(a => a.id === id);
        if (found) setAppointment(found);
      });
      healthService.getCareJourneys().then(journeys => {
        const matched = journeys.find(j => j.appointmentId === id || j.id === id);
        if (matched) {
          setJourney(matched);
        } else if (journeys.length > 0) {
          // Fallback to sample care journey for demonstration
          setJourney(journeys[0]);
        }
      });
    }
  }, [id]);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            if (appointment) {
              const updated = await healthService.cancelAppointment(appointment.id, "Cancelled by user");
              setAppointment({ ...updated });
            }
          }
        }
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!appointment) return;
    try {
      await healthService.submitDoctorReview(appointment.id, appointment.doctorId, {
        communication: comm,
        waitingTime: wait,
        professionalism: prof,
        clinicExperience: clinic,
        wouldRecommend: recommend,
        comment
      });
      setAppointment({ ...appointment, reviewSubmitted: true });
      setShowReviewModal(false);
      Alert.alert("Thank you!", "Your verified review helps fellow community members make informed healthcare choices.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit review");
    }
  };

  if (!appointment) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{appointment.status}</Text>
            </View>
            <Text style={styles.modeText}>{appointment.mode}</Text>
          </View>
          <Text style={styles.docName}>{appointment.doctorName}</Text>
          <Text style={styles.docSpec}>{appointment.doctorSpecialty}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.val}>{appointment.patientName} ({appointment.patientRelationship})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Slot:</Text>
            <Text style={styles.val}>{appointment.slotTime}</Text>
          </View>
        </View>

        {/* Action / Meeting Link */}
        {appointment.mode === "VIDEO" && appointment.meetingLink && (
          <View style={styles.videoCard}>
            <Ionicons name="videocam" size={24} color="#0D9488" />
            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle}>Secure Video Room Ready</Text>
              <Text style={styles.videoLink}>{appointment.meetingLink}</Text>
            </View>
          </View>
        )}

        {/* 6-Stage Care Journey Lifecycle */}
        {journey && (
          <View style={styles.card}>
            <View style={styles.journeyHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>🔄 Continuous Care Journey</Text>
                <Text style={styles.journeySubtitle}>Connected 6-stage healthcare cycle</Text>
              </View>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Active</Text>
              </View>
            </View>

            {/* Stepper horizontal/grid */}
            <View style={styles.stepperContainer}>
              {[
                { stage: "APPOINTMENT_BOOKED", label: "1. Booked", done: true, icon: "calendar" },
                { stage: "CONSULTATION_COMPLETED", label: "2. Consult", done: true, icon: "medkit" },
                { stage: "PRESCRIPTION_ISSUED", label: "3. Prescription", done: !!journey.prescriptionId, icon: "document-text" },
                { stage: "LAB_TEST_ORDERED", label: "4. Lab Test", done: !!journey.labPackageName, icon: "flask" },
                { stage: "RESULTS_READY", label: "5. Results", done: journey.resultsAvailable, icon: "analytics" },
                { stage: "FOLLOW_UP_SCHEDULED", label: "6. Follow-up", done: journey.clinicianRecommendedFollowUp?.status === "BOOKED", icon: "notifications" }
              ].map((step, idx) => (
                <View key={idx} style={[styles.stepChip, step.done ? styles.stepChipDone : styles.stepChipPending]}>
                  <Ionicons name={step.icon as any} size={14} color={step.done ? "#0F766E" : "#9CA3AF"} />
                  <Text style={[styles.stepText, step.done ? styles.stepTextDone : styles.stepTextPending]}>
                    {step.label}
                  </Text>
                  {step.done && <Ionicons name="checkmark-circle" size={12} color="#0D9488" />}
                </View>
              ))}
            </View>

            {/* Prescription summary if present */}
            {journey.prescriptionSummary && (
              <View style={styles.journeyDetailBox}>
                <Text style={styles.journeyDetailHeading}>💊 Active Prescription:</Text>
                <Text style={styles.journeyDetailText}>{journey.prescriptionSummary}</Text>
              </View>
            )}

            {/* Diagnostic Lab Status */}
            {journey.labPackageName && (
              <View style={[styles.journeyDetailBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                <Text style={[styles.journeyDetailHeading, { color: "#166534" }]}>🧪 Diagnostic Tests:</Text>
                <Text style={[styles.journeyDetailText, { color: "#14532D" }]}>
                  {journey.labPackageName} • {journey.resultsAvailable ? "Verified Results Ready in Vault" : "Sample In Transit"}
                </Text>
              </View>
            )}

            {/* Clinician-Decided Follow-up Decision Guardrail */}
            {journey.clinicianRecommendedFollowUp && (
              <View style={styles.clinicianDecisionBox}>
                <View style={styles.clinicianHeaderRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#4338CA" />
                  <Text style={styles.clinicianTitle}>Clinician Follow-up Decision</Text>
                </View>
                <Text style={styles.clinicianAdvice}>
                  "{journey.clinicianRecommendedFollowUp.instructions}"
                </Text>
                <View style={styles.clinicianFooterRow}>
                  <Text style={styles.clinicianDateText}>
                    Target Review: <Text style={{ fontWeight: "700" }}>{journey.clinicianRecommendedFollowUp.dueDate}</Text>
                  </Text>
                  <View style={[
                    styles.followUpBadge,
                    journey.clinicianRecommendedFollowUp.status === "BOOKED" ? styles.followUpBooked : styles.followUpPending
                  ]}>
                    <Text style={[
                      styles.followUpBadgeText,
                      journey.clinicianRecommendedFollowUp.status === "BOOKED" ? { color: "#166534" } : { color: "#92400E" }
                    ]}>
                      {journey.clinicianRecommendedFollowUp.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.clinicalGuardrailNote}>
                  🛡️ Safe Care Policy: Diagnostic tests are never auto-diagnosed. Follow-ups are directed strictly by clinician recommendations.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Status History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status Timeline</Text>
          {appointment.statusHistory.map((h, i) => (
            <View key={i} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <Text style={styles.historyText}>{h}</Text>
            </View>
          ))}
        </View>

        {/* Review Action */}
        {!appointment.reviewSubmitted && appointment.status !== "CANCELLED" && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => setShowReviewModal(true)}
          >
            <Ionicons name="star" size={16} color="#FFFFFF" />
            <Text style={styles.reviewBtnText}>Write Multi-Dimensional Review</Text>
          </TouchableOpacity>
        )}

        {appointment.status !== "CANCELLED" && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Experience with {appointment.doctorName}</Text>
            <Text style={styles.modalSub}>Multi-dimensional reviews ensure authentic ratings for community trust.</Text>

            <View style={styles.dimRow}>
              <Text style={styles.dimLabel}>Communication (1-5):</Text>
              <Text style={styles.dimVal}>⭐ {comm}</Text>
            </View>
            <View style={styles.dimRow}>
              <Text style={styles.dimLabel}>Waiting Time (1-5):</Text>
              <Text style={styles.dimVal}>⭐ {wait}</Text>
            </View>
            <View style={styles.dimRow}>
              <Text style={styles.dimLabel}>Professionalism (1-5):</Text>
              <Text style={styles.dimVal}>⭐ {prof}</Text>
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Share details of your consultation (optional)..."
              multiline
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowReviewModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitReview}>
                <Text style={styles.modalSubmitText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: "#15803D", fontWeight: "bold", fontSize: 12 },
  modeText: { color: "#0D9488", fontWeight: "bold", fontSize: 12 },
  docName: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  docSpec: { fontSize: 13, color: "#6B7280" },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, color: "#6B7280" },
  val: { fontSize: 13, fontWeight: "600", color: "#111827" },
  videoCard: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", padding: 14, borderRadius: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  videoTitle: { fontSize: 13, fontWeight: "bold", color: "#0F766E" },
  videoLink: { fontSize: 11, color: "#0D9488", marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 3 },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0D9488" },
  historyText: { fontSize: 12, color: "#4B5563" },
  reviewBtn: { backgroundColor: "#0D9488", padding: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  reviewBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  cancelBtn: { backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12, alignItems: "center" },
  cancelBtnText: { color: "#DC2626", fontWeight: "bold", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  modalSub: { fontSize: 12, color: "#6B7280" },
  dimRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  dimLabel: { fontSize: 13, color: "#374151" },
  dimVal: { fontSize: 13, fontWeight: "bold", color: "#B45309" },
  reviewInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, height: 80, fontSize: 13, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalCancel: { flex: 1, backgroundColor: "#E5E7EB", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelText: { color: "#374151", fontWeight: "bold" },
  modalSubmit: { flex: 1, backgroundColor: "#0D9488", padding: 12, borderRadius: 10, alignItems: "center" },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "bold" },
  journeyHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  journeySubtitle: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  activeTag: { backgroundColor: "#CCFBF1", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeTagText: { fontSize: 10, fontWeight: "700", color: "#0F766E" },
  stepperContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 4 },
  stepChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  stepChipDone: { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" },
  stepChipPending: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  stepText: { fontSize: 11, fontWeight: "600" },
  stepTextDone: { color: "#115E59" },
  stepTextPending: { color: "#9CA3AF" },
  journeyDetailBox: { backgroundColor: "#F8FAFC", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", gap: 2 },
  journeyDetailHeading: { fontSize: 11, fontWeight: "700", color: "#334155" },
  journeyDetailText: { fontSize: 12, color: "#1E293B" },
  clinicianDecisionBox: { backgroundColor: "#EEF2FF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#C7D2FE", gap: 6 },
  clinicianHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  clinicianTitle: { fontSize: 12, fontWeight: "700", color: "#3730A3" },
  clinicianAdvice: { fontSize: 12, color: "#312E81", fontStyle: "italic" },
  clinicianFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  clinicianDateText: { fontSize: 11, color: "#4338CA" },
  followUpBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  followUpBooked: { backgroundColor: "#DCFCE7" },
  followUpPending: { backgroundColor: "#FEF3C7" },
  followUpBadgeText: { fontSize: 10, fontWeight: "700" },
  clinicalGuardrailNote: { fontSize: 10, color: "#475569", marginTop: 2 }
});