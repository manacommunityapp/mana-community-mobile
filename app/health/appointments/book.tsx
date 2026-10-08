import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { DoctorDto, FamilyMemberDto, ConsultationMode } from "@/types/health";

export default function AppointmentBookScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorDto | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<ConsultationMode>("IN_PERSON");
  const [syncFinance, setSyncFinance] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (doctorId) {
      healthService.getDoctorById(doctorId).then(d => {
        if (d) {
          setDoctor(d);
          setSelectedSlot(d.availableSlots[0] || "");
          setSelectedMode(d.consultationModes[0] || "IN_PERSON");
        }
      });
    }
    healthService.getFamilyMembers().then(members => {
      setFamilyMembers(members);
      if (members.length > 0) setSelectedPatientId(members[0].id);
    });
  }, [doctorId]);

  const handleConfirm = async () => {
    if (!doctor || !selectedPatientId || !selectedSlot) return;
    setBooking(true);
    try {
      const appt = await healthService.bookAppointment({
        doctorId: doctor.id,
        patientId: selectedPatientId,
        slotTime: selectedSlot,
        mode: selectedMode,
        syncToPersonalFinance: syncFinance
      });
      Alert.alert(
        "Appointment Confirmed!",
        `Booked with ${doctor.name} for ${selectedSlot}. Added to Personal Finance.`,
        [{ text: "View Details", onPress: () => router.replace(`/health/appointments/${appt.id}`) }]
      );
    } catch (err: any) {
      Alert.alert("Booking Error", err.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  if (!doctor) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Doctor Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Consulting Doctor</Text>
          <Text style={styles.docName}>{doctor.name}</Text>
          <Text style={styles.docSpec}>{doctor.specialty} • ₹{doctor.consultationFee}</Text>
        </View>

        {/* Select Patient (Family Healthcare) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Select Patient (Family Member)</Text>
          <Text style={styles.subtext}>The appointment will be registered under the selected family profile.</Text>
          <View style={styles.pillsWrap}>
            {familyMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                style={[styles.patientPill, selectedPatientId === member.id && styles.activePill]}
                onPress={() => setSelectedPatientId(member.id)}
              >
                <Ionicons name="person" size={14} color={selectedPatientId === member.id ? "#FFFFFF" : "#0D9488"} />
                <Text style={[styles.pillText, selectedPatientId === member.id && styles.activePillText]}>
                  {member.fullName} ({member.relationship})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Consultation Mode */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Consultation Mode</Text>
          <View style={styles.modeRow}>
            {doctor.consultationModes.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeCard, selectedMode === m && styles.activeModeCard]}
                onPress={() => setSelectedMode(m)}
              >
                <Ionicons
                  name={m === "IN_PERSON" ? "business" : m === "VIDEO" ? "videocam" : "call"}
                  size={20}
                  color={selectedMode === m ? "#0D9488" : "#6B7280"}
                />
                <Text style={[styles.modeCardText, selectedMode === m && styles.activeModeText]}>
                  {m === "IN_PERSON" ? "Clinic Visit" : m === "VIDEO" ? "Video Call" : "Phone Call"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Time Slot */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Available Time Slots</Text>
          <View style={styles.slotsWrap}>
            {doctor.availableSlots.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, selectedSlot === slot && styles.activeSlotChip]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.slotText, selectedSlot === slot && styles.activeSlotText]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smart Personal Finance Sync */}
        <TouchableOpacity
          style={styles.syncCard}
          onPress={() => setSyncFinance(!syncFinance)}
          activeOpacity={0.8}
        >
          <Ionicons name={syncFinance ? "checkbox" : "square-outline"} size={20} color="#0D9488" />
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>Auto-record to My Money (Personal Finance)</Text>
            <Text style={styles.syncDesc}>Automatically logs ₹{doctor.consultationFee} expense under Health category in your private ledger.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalAmount}>₹{doctor.consultationFee}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmBtn, booking && { opacity: 0.7 }]}
          onPress={handleConfirm}
          disabled={booking}
        >
          <Text style={styles.confirmBtnText}>{booking ? "Booking..." : "Confirm & Pay"}</Text>
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
  sectionHeader: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  subtext: { fontSize: 12, color: "#6B7280" },
  docName: { fontSize: 16, fontWeight: "bold", color: "#0D9488" },
  docSpec: { fontSize: 13, color: "#4B5563" },
  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  activePill: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#0F766E" },
  activePillText: { color: "#FFFFFF" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 12, alignItems: "center", gap: 4 },
  activeModeCard: { backgroundColor: "#F0FDFA", borderColor: "#0D9488" },
  modeCardText: { fontSize: 11, fontWeight: "600", color: "#4B5563" },
  activeModeText: { color: "#0D9488", fontWeight: "bold" },
  slotsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  activeSlotChip: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  slotText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  activeSlotText: { color: "#FFFFFF" },
  syncCard: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", padding: 14, borderRadius: 14, flexDirection: "row", gap: 10, alignItems: "center" },
  syncTitle: { fontSize: 13, fontWeight: "bold", color: "#0F766E" },
  syncDesc: { fontSize: 11, color: "#115E59", marginTop: 2 },
  bottomBar: { backgroundColor: "#FFFFFF", padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 11, color: "#6B7280" },
  totalAmount: { fontSize: 20, fontWeight: "bold", color: "#0D9488" },
  confirmBtn: { backgroundColor: "#0D9488", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 }
});