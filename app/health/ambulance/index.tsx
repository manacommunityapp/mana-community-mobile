import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";
import { AmbulanceVehicleType, AmbulanceBookingDto } from "@/types/health";

const VEHICLES: { type: AmbulanceVehicleType; title: string; desc: string; icon: string; color: string; bg: string; eta: string }[] = [
  { type: "BASIC", title: "Basic Ambulance", desc: "First aid, oxygen, stretcher. For stable patients.", icon: "car-outline", color: "#0D9488", bg: "#CCFBF1", eta: "8–12 min" },
  { type: "ADVANCED", title: "Advanced Life Support", desc: "Cardiac monitor, IV access, paramedic on board.", icon: "medkit", color: "#2563EB", bg: "#DBEAFE", eta: "10–15 min" },
  { type: "ICU", title: "ICU Mobile Unit", desc: "Full ICU setup for critical/ventilated patients.", icon: "pulse", color: "#DC2626", bg: "#FEE2E2", eta: "12–18 min" },
];

const EMERGENCY_SIGNS = [
  "Chest pain or difficulty breathing",
  "Signs of stroke (face drooping, arm weakness)",
  "Major trauma or accident injuries",
  "Severe allergic reaction / anaphylaxis",
  "Loss of consciousness or seizure",
  "Severe bleeding or burns",
];

export default function AmbulanceBookingScreen() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<AmbulanceVehicleType>("BASIC");
  const [patientName, setPatientName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [emergencyNote, setEmergencyNote] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [booking, setBooking] = useState<AmbulanceBookingDto | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!patientName.trim() || !pickupAddress.trim() || !contactPhone.trim()) {
      Alert.alert("Missing Details", "Patient name, pickup address and contact phone are required.");
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const fakeBooking: AmbulanceBookingDto = {
        id: String(Date.now()),
        bookingUuid: crypto.randomUUID?.() ?? "amb-uuid",
        vehicleType: selectedVehicle,
        status: "DISPATCHED",
        pickupAddress,
        destinationAddress,
        driverName: "Suresh Kumar",
        driverPhone: "+91-9800012345",
        vehicleNumber: "WB-01-AB-1234",
        estimatedMinutes: selectedVehicle === "BASIC" ? 10 : selectedVehicle === "ADVANCED" ? 13 : 16,
        requestedAt: new Date().toISOString(),
        dispatchedAt: new Date().toISOString(),
      };
      setBooking(fakeBooking);
    } catch {
      Alert.alert("Error", "Could not dispatch ambulance. Call 112 immediately.");
    } finally {
      setLoading(false);
    }
  };

  if (booking) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.dispatchCard}>
            <Ionicons name="checkmark-circle" size={52} color="#FFFFFF" />
            <Text style={styles.dispatchTitle}>Ambulance Dispatched!</Text>
            <Text style={styles.dispatchSub}>ETA: ~{booking.estimatedMinutes} minutes</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoSectionTitle}>Driver Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color="#0D9488" />
              <Text style={styles.infoText}>{booking.driverName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color="#0D9488" />
              <Text style={styles.infoText}>{booking.driverPhone}</Text>
              <TouchableOpacity
                style={styles.callChip}
                onPress={() => Linking.openURL(`tel:${booking.driverPhone}`)}
              >
                <Text style={styles.callChipText}>Call Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="car" size={16} color="#0D9488" />
              <Text style={styles.infoText}>{booking.vehicleNumber}</Text>
            </View>
          </View>

          <View style={styles.statusTrack}>
            {(["REQUESTED", "DISPATCHED", "EN_ROUTE", "ARRIVED"] as const).map((s, i) => {
              const statusOrder = ["REQUESTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "COMPLETED"];
              const done = statusOrder.indexOf(booking.status) >= i;
              return (
                <View key={s} style={styles.statusStep}>
                  <View style={[styles.statusDot, done && styles.statusDotDone]} />
                  <Text style={[styles.statusLabel, done && styles.statusLabelDone]}>
                    {s.replace("_", " ")}
                  </Text>
                  {i < 3 && <View style={[styles.statusLine, done && styles.statusLineDone]} />}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.callEmergencyBtn}
            onPress={() => Linking.openURL("tel:112")}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callEmergencyText}>Call 112 — National Emergency</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Health</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Emergency Signs Panel */}
        <View style={styles.emergencyPanel}>
          <View style={styles.emergencyPanelHeader}>
            <Ionicons name="warning" size={20} color="#DC2626" />
            <Text style={styles.emergencyPanelTitle}>When to Request Ambulance</Text>
          </View>
          {EMERGENCY_SIGNS.map((sign, i) => (
            <View key={i} style={styles.signRow}>
              <View style={styles.signDot} />
              <Text style={styles.signText}>{sign}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.call112Btn}
            onPress={() => Linking.openURL("tel:112")}
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.call112Text}>Call 112 for Life-Threatening Emergencies</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Selection */}
        <Text style={styles.sectionTitle}>Select Ambulance Type</Text>
        {VEHICLES.map(v => (
          <TouchableOpacity
            key={v.type}
            style={[styles.vehicleCard, selectedVehicle === v.type && styles.vehicleCardSelected]}
            onPress={() => setSelectedVehicle(v.type)}
            activeOpacity={0.85}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: v.bg }]}>
              <Ionicons name={v.icon as any} size={26} color={v.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleTitle}>{v.title}</Text>
              <Text style={styles.vehicleDesc}>{v.desc}</Text>
              <Text style={[styles.vehicleEta, { color: v.color }]}>ETA: {v.eta}</Text>
            </View>
            {selectedVehicle === v.type && (
              <Ionicons name="checkmark-circle" size={22} color="#0D9488" />
            )}
          </TouchableOpacity>
        ))}

        {/* Form */}
        <Text style={styles.sectionTitle}>Patient & Location Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Patient Name *</Text>
          <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Full name of patient" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pickup Address *</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Flat / Block / Area" multiline numberOfLines={2} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Destination Hospital (optional)</Text>
          <TextInput style={styles.input} value={destinationAddress} onChangeText={setDestinationAddress} placeholder="Hospital name or address" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact Phone *</Text>
          <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Emergency Note</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={emergencyNote} onChangeText={setEmergencyNote} placeholder="Brief description of emergency condition..." multiline numberOfLines={3} />
        </View>

        <TouchableOpacity
          style={[styles.dispatchBtn, loading && styles.dispatchBtnDisabled]}
          onPress={handleBook}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="car" size={18} color="#FFFFFF" />
          <Text style={styles.dispatchBtnText}>{loading ? "Dispatching…" : "Dispatch Ambulance Now"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  emergencyPanel: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: RADIUS.lg, padding: 14, gap: 6 },
  emergencyPanelHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  emergencyPanelTitle: { fontSize: 14, fontWeight: "bold", color: "#991B1B", fontFamily: FONTS.bold },
  signRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  signDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DC2626" },
  signText: { fontSize: 12, color: "#7F1D1D", fontFamily: FONTS.regular },
  call112Btn: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: RADIUS.sm, marginTop: 6, justifyContent: "center" },
  call112Text: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12, fontFamily: FONTS.bold },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold },
  vehicleCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.squircle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...SHADOWS.card },
  vehicleCardSelected: { borderColor: "#0D9488", borderWidth: 2, backgroundColor: "#F0FDFA" },
  vehicleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  vehicleTitle: { fontSize: 14, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.bold },
  vehicleDesc: { fontSize: 12, color: "#475569", marginTop: 2, fontFamily: FONTS.regular },
  vehicleEta: { fontSize: 11, fontWeight: "700", marginTop: 3, fontFamily: FONTS.semiBold },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", fontFamily: FONTS.semiBold },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.sm, padding: 12, fontSize: 13, color: "#0F172A", fontFamily: FONTS.regular },
  inputMultiline: { minHeight: 60, textAlignVertical: "top" },
  dispatchBtn: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: RADIUS.squircle, marginTop: 6, ...SHADOWS.md },
  dispatchBtnDisabled: { opacity: 0.6 },
  dispatchBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold", fontFamily: FONTS.bold },
  // dispatch success
  dispatchCard: { backgroundColor: "#DC2626", borderRadius: RADIUS.xl, padding: 28, alignItems: "center", gap: 8, ...SHADOWS.md },
  dispatchTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold", fontFamily: FONTS.displayBold },
  dispatchSub: { color: "#FEE2E2", fontSize: 14, fontFamily: FONTS.medium },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, ...SHADOWS.card },
  infoSectionTitle: { fontSize: 14, fontWeight: "bold", color: "#0F172A", marginBottom: 4, fontFamily: FONTS.bold },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: "#334155", flex: 1, fontFamily: FONTS.medium },
  callChip: { backgroundColor: "#0D9488", paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  callChipText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 11, fontFamily: FONTS.bold },
  statusTrack: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 0, ...SHADOWS.card },
  statusStep: { flex: 1, alignItems: "center", position: "relative" },
  statusDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#E2E8F0", marginBottom: 4 },
  statusDotDone: { backgroundColor: "#0D9488" },
  statusLabel: { fontSize: 9, color: "#94A3B8", textAlign: "center", fontFamily: FONTS.regular },
  statusLabelDone: { color: "#0D9488", fontWeight: "700" },
  statusLine: { position: "absolute", top: 7, right: -30, width: 30, height: 2, backgroundColor: "#E2E8F0" },
  statusLineDone: { backgroundColor: "#0D9488" },
  callEmergencyBtn: { backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: RADIUS.squircle, ...SHADOWS.md },
  callEmergencyText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, fontFamily: FONTS.bold },
  backBtn: { padding: 14, alignItems: "center" },
  backBtnText: { color: "#0D9488", fontWeight: "600", fontSize: 14, fontFamily: FONTS.semiBold },
});
