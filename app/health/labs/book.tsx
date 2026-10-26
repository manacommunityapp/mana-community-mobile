import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, ActivityIndicator
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { FamilyMemberDto } from "@/types/health";

const COLLECTION_DATES = [
  { label: "Tomorrow", sub: "6 AM – 9 AM collection window", dateKey: "tomorrow" },
  { label: "Day After", sub: "6 AM – 9 AM collection window", dateKey: "day-after" },
  { label: "In 3 Days", sub: "9 AM – 12 PM collection window", dateKey: "3-days" },
];

const TIME_SLOTS = [
  { id: "morning", label: "🌅 Early Morning", time: "6:00 AM – 9:00 AM", note: "Fasting recommended before this window" },
  { id: "forenoon", label: "🌤️ Forenoon", time: "9:00 AM – 12:00 PM", note: "For non-fasting packages" },
  { id: "afternoon", label: "☀️ Afternoon", time: "12:00 PM – 3:00 PM", note: "Afternoon collection available" },
];

export default function LabBookingScreen() {
  const router = useRouter();
  const { pkgId, pkgName, pkgPrice, turnaround, fastingRequired } = useLocalSearchParams<{
    pkgId: string;
    pkgName: string;
    pkgPrice: string;
    turnaround: string;
    fastingRequired: string;
  }>();

  const [family, setFamily] = useState<FamilyMemberDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("tomorrow");
  const [selectedSlot, setSelectedSlot] = useState<string>("morning");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [phlebotomistName] = useState("Pradeep R. (Phlebotomist)");

  useEffect(() => {
    healthService.getFamilyMembers().then(members => {
      setFamily(members);
      if (members.length > 0) setSelectedPatientId(members[0].id);
    });
  }, []);

  const selectedPatient = family.find(m => m.id === selectedPatientId);
  const selectedDateInfo = COLLECTION_DATES.find(d => d.dateKey === selectedDate);
  const selectedSlotInfo = TIME_SLOTS.find(s => s.id === selectedSlot);

  const handleConfirmBooking = async () => {
    if (!selectedPatientId) {
      Alert.alert("Select Patient", "Please choose who the sample collection is for.");
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setBooked(true);
  };

  if (booked) {
    return (
      <View style={styles.successWrap}>
        <LinearGradient colors={["#0F766E", "#0D9488"]} style={styles.successHeader}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={52} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Collection Scheduled!</Text>
          <Text style={styles.successSub}>Your home sample collection has been confirmed.</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.successBody}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Ionicons name="flask" size={18} color="#0D9488" />
              <Text style={styles.confirmLabel}>Package</Text>
              <Text style={styles.confirmVal}>{pkgName}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="person" size={18} color="#0D9488" />
              <Text style={styles.confirmLabel}>Patient</Text>
              <Text style={styles.confirmVal}>{selectedPatient?.fullName} ({selectedPatient?.relationship})</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="calendar" size={18} color="#0D9488" />
              <Text style={styles.confirmLabel}>Date</Text>
              <Text style={styles.confirmVal}>{selectedDateInfo?.label}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="time" size={18} color="#0D9488" />
              <Text style={styles.confirmLabel}>Window</Text>
              <Text style={styles.confirmVal}>{selectedSlotInfo?.time}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="person-circle" size={18} color="#0D9488" />
              <Text style={styles.confirmLabel}>Assigned</Text>
              <Text style={styles.confirmVal}>{phlebotomistName}</Text>
            </View>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📋 Preparation Instructions</Text>
            {fastingRequired === "true" && (
              <View style={styles.instructionRow}>
                <Ionicons name="warning" size={14} color="#D97706" />
                <Text style={styles.instructionText}>Fast for at least 10–12 hours before collection. Water is allowed.</Text>
              </View>
            )}
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.instructionText}>Keep your Aadhaar or any ID ready at door.</Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.instructionText}>Reports dispatched to your Health Vault within {turnaround || "24"} hours.</Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="notifications" size={14} color="#0D9488" />
              <Text style={styles.instructionText}>You'll receive SMS + in-app notification when phlebotomist is 15 min away.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Lab Tests</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0F766E", "#0D9488", "#14B8A6"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerPkg}>{pkgName}</Text>
            <Text style={styles.headerSub}>Home Sample Collection • ₹{pkgPrice} • Reports in {turnaround}h</Text>
          </View>
          <View style={styles.homeIcon}>
            <Ionicons name="home" size={20} color="#0D9488" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Patient Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who is this test for?</Text>
          <View style={styles.patientRow}>
            {family.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.patientPill, selectedPatientId === m.id && styles.patientPillActive]}
                onPress={() => setSelectedPatientId(m.id)}
              >
                <Ionicons
                  name="person"
                  size={14}
                  color={selectedPatientId === m.id ? "#FFFFFF" : "#0D9488"}
                />
                <Text style={[styles.patientPillText, selectedPatientId === m.id && { color: "#FFFFFF" }]}>
                  {m.fullName.split(" ")[0]}
                </Text>
                <Text style={[styles.patientRelText, selectedPatientId === m.id && { color: "#CCFBF1" }]}>
                  {m.relationship}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Collection Date</Text>
          <View style={styles.dateRow}>
            {COLLECTION_DATES.map(d => (
              <TouchableOpacity
                key={d.dateKey}
                style={[styles.dateCard, selectedDate === d.dateKey && styles.dateCardActive]}
                onPress={() => setSelectedDate(d.dateKey)}
              >
                <Text style={[styles.dateName, selectedDate === d.dateKey && { color: "#FFFFFF" }]}>
                  {d.label}
                </Text>
                <Text style={[styles.dateSub, selectedDate === d.dateKey && { color: "#CCFBF1" }]}>
                  {d.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Window</Text>
          {TIME_SLOTS.map(slot => (
            <TouchableOpacity
              key={slot.id}
              style={[styles.slotCard, selectedSlot === slot.id && styles.slotCardActive]}
              onPress={() => setSelectedSlot(slot.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.slotLabel, selectedSlot === slot.id && { color: "#0D9488" }]}>
                  {slot.label}
                </Text>
                <Text style={styles.slotTime}>{slot.time}</Text>
                <Text style={styles.slotNote}>{slot.note}</Text>
              </View>
              {selectedSlot === slot.id && (
                <Ionicons name="checkmark-circle" size={22} color="#0D9488" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Fasting Warning */}
        {fastingRequired === "true" && (
          <View style={styles.fastingBanner}>
            <Ionicons name="warning" size={16} color="#D97706" />
            <Text style={styles.fastingText}>
              This package requires 10–12 hour fasting. Plan your collection window accordingly.
            </Text>
          </View>
        )}

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Ring bell, 3rd floor flat 302, patient is elderly..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Address Confirmation */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={16} color="#0D9488" />
            <Text style={styles.addressTitle}>Collection Address</Text>
          </View>
          <Text style={styles.addressText}>Flat 302, Tower C, Mana Residency</Text>
          <Text style={styles.addressSub}>Your registered residential address • 0.0 km</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text style={styles.summaryVal}>{pkgName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Home Collection</Text>
            <Text style={[styles.summaryVal, { color: "#059669" }]}>FREE</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10, marginTop: 4 }]}>
            <Text style={[styles.summaryLabel, { fontWeight: "800", color: "#0F172A" }]}>Total</Text>
            <Text style={[styles.summaryVal, { fontSize: 16, fontWeight: "800", color: "#0D9488" }]}>₹{pkgPrice}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Confirm Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPkg}>{selectedDateInfo?.label} • {selectedSlotInfo?.time}</Text>
          <Text style={styles.bottomNote}>Phlebotomist assigned within 30 min of booking</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Booking →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerPkg: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 11, color: "#CCFBF1", marginTop: 2 },
  homeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 18, paddingBottom: 120 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  patientRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#0D9488", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F0FDFA" },
  patientPillActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  patientPillText: { fontSize: 13, fontWeight: "700", color: "#0D9488" },
  patientRelText: { fontSize: 10, color: "#0D9488" },

  dateRow: { flexDirection: "row", gap: 8 },
  dateCard: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: "#FFFFFF" },
  dateCardActive: { borderColor: "#0D9488", backgroundColor: "#0D9488" },
  dateName: { fontSize: 13, fontWeight: "700", color: "#1E293B", textAlign: "center" },
  dateSub: { fontSize: 9, color: "#64748B", textAlign: "center", marginTop: 2 },

  slotCard: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, backgroundColor: "#FFFFFF" },
  slotCardActive: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  slotLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  slotTime: { fontSize: 12, color: "#0D9488", fontWeight: "600", marginTop: 2 },
  slotNote: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  fastingBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FDE68A" },
  fastingText: { fontSize: 12, color: "#B45309", flex: 1, lineHeight: 17 },

  notesInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: "#FFFFFF", minHeight: 60, textAlignVertical: "top" },

  addressCard: { backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#BFDBFE", gap: 4 },
  addressHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  addressTitle: { fontSize: 13, fontWeight: "700", color: "#1D4ED8" },
  addressText: { fontSize: 14, fontWeight: "600", color: "#1E3A8A" },
  addressSub: { fontSize: 11, color: "#3B82F6" },

  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 8 },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, color: "#64748B" },
  summaryVal: { fontSize: 13, fontWeight: "700", color: "#1E293B" },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  bottomPkg: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  bottomNote: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  confirmBtn: { backgroundColor: "#0D9488", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  // Success state
  successWrap: { flex: 1, backgroundColor: "#F8FAFC" },
  successHeader: { paddingTop: 50, paddingBottom: 30, alignItems: "center", gap: 8 },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  successSub: { fontSize: 13, color: "#CCFBF1" },
  successBody: { padding: 20, gap: 16 },
  confirmCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 12 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmLabel: { fontSize: 12, color: "#94A3B8", width: 60 },
  confirmVal: { fontSize: 13, fontWeight: "700", color: "#1E293B", flex: 1 },
  instructionCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  instructionTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  instructionText: { fontSize: 12, color: "#374151", flex: 1, lineHeight: 17 },
  doneBtn: { backgroundColor: "#0D9488", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  doneBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
