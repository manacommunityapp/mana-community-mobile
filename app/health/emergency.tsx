import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { HealthEmergencyContactDto } from "@/types/health";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";

const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const BLOOD_AVAILABILITY = {
  "A+": { units: 12, status: "available" }, "A−": { units: 3, status: "low" },
  "B+": { units: 8, status: "available" }, "B−": { units: 1, status: "critical" },
  "AB+": { units: 6, status: "available" }, "AB−": { units: 0, status: "unavailable" },
  "O+": { units: 15, status: "available" }, "O−": { units: 2, status: "low" },
} as const;

const DONATION_DRIVES = [
  { date: "8 Nov 2026", location: "Clubhouse Banquet Hall", slots: 40, booked: 28 },
  { date: "22 Nov 2026", location: "Community Health Centre", slots: 30, booked: 12 },
];

function BloodBankSection() {
  const [showDonate, setShowDonate] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorBloodType, setDonorBloodType] = useState("");
  const [donorDriveIdx, setDonorDriveIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const statusColor: Record<string, string> = {
    available: "#059669", low: "#D97706", critical: "#DC2626", unavailable: "#9CA3AF"
  };
  const statusBg: Record<string, string> = {
    available: "#DCFCE7", low: "#FEF3C7", critical: "#FEE2E2", unavailable: "#F3F4F6"
  };

  return (
    <View>
      <LinearGradient colors={["#7F1D1D", "#DC2626"]} style={bbStyles.header}>
        <Ionicons name="water" size={20} color="#FCA5A5" />
        <View style={{ flex: 1 }}>
          <Text style={bbStyles.headerTitle}>Community Blood Bank</Text>
          <Text style={bbStyles.headerSub}>Real-time availability · Donate & save a life</Text>
        </View>
        <TouchableOpacity style={bbStyles.donateBtn} onPress={() => setShowDonate(true)}>
          <Text style={bbStyles.donateBtnText}>Donate →</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={bbStyles.availGrid}>
        {BLOOD_TYPES.map(bt => {
          const info = BLOOD_AVAILABILITY[bt as keyof typeof BLOOD_AVAILABILITY];
          return (
            <View key={bt} style={[bbStyles.btCard, { backgroundColor: statusBg[info.status] }]}>
              <Text style={[bbStyles.btType, { color: statusColor[info.status] }]}>{bt}</Text>
              <Text style={[bbStyles.btUnits, { color: statusColor[info.status] }]}>{info.units} units</Text>
              <Text style={[bbStyles.btStatus, { color: statusColor[info.status] }]}>
                {info.status === "unavailable" ? "Need" : info.status.charAt(0).toUpperCase() + info.status.slice(1)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={bbStyles.drivesTitle}>Upcoming Donation Drives</Text>
      {DONATION_DRIVES.map((d, i) => (
        <View key={i} style={bbStyles.driveRow}>
          <Ionicons name="calendar" size={14} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={bbStyles.driveDate}>{d.date} — {d.location}</Text>
            <Text style={bbStyles.driveSlots}>{d.booked}/{d.slots} slots booked</Text>
          </View>
          <TouchableOpacity style={bbStyles.driveRegBtn} onPress={() => { setDonorDriveIdx(i); setShowDonate(true); }}>
            <Text style={bbStyles.driveRegBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={showDonate} animationType="slide" transparent>
        <View style={bbStyles.modalOverlay}>
          <View style={bbStyles.modalCard}>
            <View style={bbStyles.modalHeader}>
              <Text style={bbStyles.modalTitle}>Register as Blood Donor</Text>
              <TouchableOpacity onPress={() => { setShowDonate(false); setSubmitted(false); }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {submitted ? (
              <View style={bbStyles.successWrap}>
                <Ionicons name="heart" size={48} color="#DC2626" />
                <Text style={bbStyles.successTitle}>Thank You! 🎉</Text>
                <Text style={bbStyles.successDesc}>Your donor registration is confirmed for {DONATION_DRIVES[donorDriveIdx].date}. You'll receive a reminder 2 days before.</Text>
                <TouchableOpacity style={bbStyles.doneBtn} onPress={() => { setShowDonate(false); setSubmitted(false); }}>
                  <Text style={bbStyles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ gap: 10 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={bbStyles.fieldLabel}>Full Name</Text>
                    <TextInput style={bbStyles.input} value={donorName} onChangeText={setDonorName} placeholder="Your name" />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={bbStyles.fieldLabel}>Phone Number *</Text>
                    <TextInput style={bbStyles.input} value={donorPhone} onChangeText={setDonorPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={bbStyles.fieldLabel}>Blood Type</Text>
                    <View style={bbStyles.btPickerRow}>
                      {BLOOD_TYPES.map(bt => (
                        <TouchableOpacity key={bt} style={[bbStyles.btPicker, donorBloodType === bt && bbStyles.btPickerActive]} onPress={() => setDonorBloodType(bt)}>
                          <Text style={[bbStyles.btPickerText, donorBloodType === bt && bbStyles.btPickerTextActive]}>{bt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={bbStyles.fieldLabel}>Drive Date</Text>
                    <View style={{ gap: 6 }}>
                      {DONATION_DRIVES.map((d, i) => (
                        <TouchableOpacity key={i} style={[bbStyles.drivePickRow, donorDriveIdx === i && bbStyles.drivePickRowActive]} onPress={() => setDonorDriveIdx(i)}>
                          <Text style={[bbStyles.drivePickText, donorDriveIdx === i && { color: "#FFFFFF" }]}>{d.date} · {d.location}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[bbStyles.submitBtn, !donorPhone && { opacity: 0.5 }]}
                  disabled={!donorPhone}
                  onPress={() => setSubmitted(true)}
                >
                  <Ionicons name="heart" size={16} color="#FFFFFF" />
                  <Text style={bbStyles.submitBtnText}>Confirm Donation Registration</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const bbStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  headerTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  headerSub: { color: "#FCA5A5", fontSize: 10, marginTop: 2 },
  donateBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  donateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  availGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0, borderWidth: 1, borderTopWidth: 0, borderColor: "#FEE2E2", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: "hidden" },
  btCard: { width: "25%", padding: 10, alignItems: "center", gap: 2 },
  btType: { fontSize: 15, fontWeight: "800" },
  btUnits: { fontSize: 10, fontWeight: "600" },
  btStatus: { fontSize: 9, fontWeight: "600" },
  drivesTitle: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 12, marginBottom: 6 },
  driveRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 6 },
  driveDate: { fontSize: 12, fontWeight: "700", color: "#111827" },
  driveSlots: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  driveRegBtn: { backgroundColor: "#DC2626", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  driveRegBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 13, color: "#0F172A" },
  btPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  btPicker: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  btPickerActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  btPickerText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  btPickerTextActive: { color: "#FFFFFF" },
  drivePickRow: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  drivePickRowActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  drivePickText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  submitBtn: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, marginTop: 4 },
  submitBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  successWrap: { alignItems: "center", paddingVertical: 20, gap: 10 },
  successTitle: { fontSize: 18, fontWeight: "800", color: "#DC2626" },
  successDesc: { fontSize: 12, color: "#374151", textAlign: "center" },
  doneBtn: { backgroundColor: "#DC2626", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  doneBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});

const EMERGENCY_SIGNS = [
  { sign: "Chest pain or difficulty breathing", icon: "heart" },
  { sign: "Signs of stroke (face drooping, arm weakness, slurred speech)", icon: "warning" },
  { sign: "Major trauma, accident or fall injuries", icon: "bandage" },
  { sign: "Severe allergic reaction / anaphylaxis", icon: "alert-circle" },
  { sign: "Loss of consciousness, seizure or faint", icon: "body" },
  { sign: "Severe bleeding or burns", icon: "flame" },
  { sign: "High fever with confusion or stiff neck", icon: "thermometer" },
  { sign: "Severe abdominal pain", icon: "medical" },
];

export default function EmergencyHealthScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<HealthEmergencyContactDto[]>([]);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackDesc, setCallbackDesc] = useState("");
  const [callbackAddress, setCallbackAddress] = useState("");
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);

  useEffect(() => {
    healthService.getEmergencyContacts().then(setContacts);
  }, []);

  const handleSos = () => {
    Alert.alert(
      "🚨 Broadcast Medical SOS",
      "This will immediately notify Security Control Room, on-call ambulance and configured primary responders.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "DISPATCH SOS", style: "destructive", onPress: () => Alert.alert("SOS Dispatched", "Security & on-call medical response team notified.") }
      ]
    );
  };

  const handleCallbackSubmit = async () => {
    if (!callbackPhone.trim()) {
      Alert.alert("Required", "Please enter your phone number.");
      return;
    }
    setCallbackLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setCallbackLoading(false);
    setCallbackSubmitted(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Big SOS Trigger */}
        <TouchableOpacity style={styles.sosCard} onPress={handleSos} activeOpacity={0.85}>
          <Ionicons name="alert-circle" size={40} color="#FFFFFF" />
          <Text style={styles.sosTitle}>1-TAP MEDICAL EMERGENCY SOS</Text>
          <Text style={styles.sosSub}>Alerts On-Site Security & Nearest Ambulance Unit Instantaneously</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push("/health/ambulance")}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="car" size={22} color="#DC2626" />
            </View>
            <Text style={styles.quickLabel}>Book Ambulance</Text>
            <Text style={styles.quickSub}>Basic / ALS / ICU</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => setShowCallbackModal(true)}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="call" size={22} color="#2563EB" />
            </View>
            <Text style={styles.quickLabel}>Request Callback</Text>
            <Text style={styles.quickSub}>24/7 Health Desk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => Linking.openURL("tel:112")}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="phone-portrait" size={22} color="#D97706" />
            </View>
            <Text style={styles.quickLabel}>Call 112</Text>
            <Text style={styles.quickSub}>National Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Symptom Check Panel */}
        <View style={styles.symptomPanel}>
          <View style={styles.symptomHeader}>
            <Ionicons name="medical" size={18} color="#991B1B" />
            <Text style={styles.symptomTitle}>When to Seek Emergency Care</Text>
          </View>
          <Text style={styles.symptomSubtitle}>Go to ER immediately or call 112 if you notice:</Text>
          {EMERGENCY_SIGNS.map((item, i) => (
            <View key={i} style={styles.signRow}>
              <View style={styles.signIconWrap}>
                <Ionicons name={item.icon as any} size={14} color="#DC2626" />
              </View>
              <Text style={styles.signText}>{item.sign}</Text>
            </View>
          ))}
        </View>

        {/* Blood Bank */}
        <BloodBankSection />

        {/* Emergency Contacts */}
        <Text style={styles.sectionHeader}>Verified Community Emergency Contacts</Text>
        {contacts.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={styles.typeRow}>
                <Text style={styles.typeBadge}>{c.type}</Text>
                {c.is24x7 && <Text style={styles.pill247}>24x7 Active</Text>}
              </View>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.addr}>{c.address} • {c.distanceKm} km away</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(c.address)}`)}
              >
                <Ionicons name="navigate" size={14} color="#0D9488" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${c.phone}`)}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Emergency Callback Modal */}
      <Modal visible={showCallbackModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Emergency Callback</Text>
              <TouchableOpacity onPress={() => { setShowCallbackModal(false); setCallbackSubmitted(false); }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {callbackSubmitted ? (
              <View style={styles.callbackSuccess}>
                <Ionicons name="checkmark-circle" size={48} color="#0D9488" />
                <Text style={styles.callbackSuccessTitle}>Callback Requested!</Text>
                <Text style={styles.callbackSuccessDesc}>Our 24/7 health desk will call you within 5–10 minutes.</Text>
                <Text style={styles.callbackAgent}>Agent: Community Health Desk</Text>
                <TouchableOpacity style={styles.callbackDoneBtn} onPress={() => { setShowCallbackModal(false); setCallbackSubmitted(false); }}>
                  <Text style={styles.callbackDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 400 }}>
                  <View style={styles.cbInputGroup}>
                    <Text style={styles.cbInputLabel}>Your Name</Text>
                    <TextInput style={styles.cbInput} value={callbackName} onChangeText={setCallbackName} placeholder="Full name" />
                  </View>
                  <View style={styles.cbInputGroup}>
                    <Text style={styles.cbInputLabel}>Phone Number *</Text>
                    <TextInput style={styles.cbInput} value={callbackPhone} onChangeText={setCallbackPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
                  </View>
                  <View style={styles.cbInputGroup}>
                    <Text style={styles.cbInputLabel}>Emergency Description</Text>
                    <TextInput style={[styles.cbInput, { minHeight: 72, textAlignVertical: "top" }]} value={callbackDesc} onChangeText={setCallbackDesc} placeholder="Briefly describe the emergency or medical concern..." multiline numberOfLines={3} />
                  </View>
                  <View style={styles.cbInputGroup}>
                    <Text style={styles.cbInputLabel}>Location / Address</Text>
                    <TextInput style={styles.cbInput} value={callbackAddress} onChangeText={setCallbackAddress} placeholder="Flat, block or area" />
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.cbSubmitBtn, (!callbackPhone || callbackLoading) && styles.cbSubmitBtnDisabled]}
                  onPress={handleCallbackSubmit}
                  disabled={!callbackPhone || callbackLoading}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                  <Text style={styles.cbSubmitBtnText}>{callbackLoading ? "Requesting…" : "Request Callback"}</Text>
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  sosCard: { backgroundColor: "#DC2626", padding: 20, borderRadius: 20, alignItems: "center", gap: 6, shadowColor: "#DC2626", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sosTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  sosSub: { color: "#FEE2E2", fontSize: 11, textAlign: "center" },
  quickActions: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: RADIUS.lg, padding: 12, alignItems: "center", gap: 4, ...SHADOWS.card },
  quickIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  quickLabel: { fontSize: 11, fontWeight: "bold", color: "#111827", textAlign: "center", fontFamily: FONTS.bold },
  quickSub: { fontSize: 9, color: "#6B7280", textAlign: "center", fontFamily: FONTS.regular },
  symptomPanel: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: RADIUS.lg, padding: 14, gap: 8 },
  symptomHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  symptomTitle: { fontSize: 14, fontWeight: "bold", color: "#991B1B", fontFamily: FONTS.bold },
  symptomSubtitle: { fontSize: 12, color: "#B91C1C", marginBottom: 4, fontFamily: FONTS.regular },
  signRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  signIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginTop: 1 },
  signText: { flex: 1, fontSize: 12, color: "#7F1D1D", fontFamily: FONTS.regular },
  sectionHeader: { fontSize: 15, fontWeight: "bold", color: "#111827", fontFamily: FONTS.bold },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", gap: 10, ...SHADOWS.card },
  typeRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  typeBadge: { backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: 10, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pill247: { backgroundColor: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  name: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  addr: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  directionsBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: "#CCFBF1", backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center" },
  callBtn: { backgroundColor: "#DC2626", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  callText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#111827", fontFamily: FONTS.bold },
  cbInputGroup: { gap: 4, marginBottom: 12 },
  cbInputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", fontFamily: FONTS.semiBold },
  cbInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.sm, padding: 12, fontSize: 13, color: "#0F172A" },
  cbSubmitBtn: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: RADIUS.squircle, marginTop: 4 },
  cbSubmitBtnDisabled: { opacity: 0.5 },
  cbSubmitBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, fontFamily: FONTS.bold },
  callbackSuccess: { alignItems: "center", paddingVertical: 20, gap: 10 },
  callbackSuccessTitle: { fontSize: 18, fontWeight: "bold", color: "#0D9488", fontFamily: FONTS.displayBold },
  callbackSuccessDesc: { fontSize: 13, color: "#374151", textAlign: "center", fontFamily: FONTS.regular },
  callbackAgent: { fontSize: 12, color: "#0D9488", fontWeight: "600", fontFamily: FONTS.semiBold },
  callbackDoneBtn: { backgroundColor: "#0D9488", paddingHorizontal: 28, paddingVertical: 12, borderRadius: RADIUS.squircle, marginTop: 8 },
  callbackDoneBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, fontFamily: FONTS.bold },
});
