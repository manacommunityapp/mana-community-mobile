import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, RADIUS, SHADOWS, SPACING } from "@/constants/config";
import { healthGuardService } from "@/services/healthGuardService";

type BookingStatus = "REQUESTED" | "CONFIRMED" | "DISPATCHED" | "ARRIVED" | "COMPLETED" | "CANCELLED";

interface AmbulanceBooking {
  id: number;
  bookingUuid: string;
  status: BookingStatus;
  pickupAddress: string;
  destinationAddress: string;
  patientName: string;
  patientPhone: string;
  emergencyDescription: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  estimatedArrivalMinutes: number;
  requestedAt: string;
  notes: string;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; step: number }> = {
  REQUESTED: { label: "Requested", color: "#3B82F6", step: 1 },
  CONFIRMED: { label: "Confirmed", color: "#F59E0B", step: 2 },
  DISPATCHED: { label: "On the Way", color: "#F97316", step: 3 },
  ARRIVED: { label: "Arrived", color: "#10B981", step: 4 },
  COMPLETED: { label: "Completed", color: "#6B7280", step: 5 },
  CANCELLED: { label: "Cancelled", color: "#EF4444", step: 0 },
};

const STEPS = ["Requested", "Confirmed", "On the Way", "Arrived"];

export default function AmbulancePage() {
  const router = useRouter();
  const [activeBooking, setActiveBooking] = useState<AmbulanceBooking | null>(null);
  const [history, setHistory] = useState<AmbulanceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pickupAddress: "",
    destinationAddress: "",
    patientName: "",
    patientPhone: "",
    emergencyDescription: "",
  });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [active, hist] = await Promise.all([
        healthGuardService.getActiveAmbulanceBooking().catch(() => null),
        healthGuardService.getAmbulanceHistory().catch(() => []),
      ]);
      setActiveBooking(active);
      setHistory((Array.isArray(hist) ? hist : []).filter(
        (b: AmbulanceBooking) => b.status === "COMPLETED" || b.status === "CANCELLED"
      ));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleBook = async () => {
    if (!form.pickupAddress.trim()) {
      Alert.alert("Required", "Please enter a pickup address.");
      return;
    }
    setBooking(true);
    try {
      const booked = await healthGuardService.bookAmbulance(form);
      setActiveBooking(booked);
      setShowForm(false);
      setForm({ pickupAddress: "", destinationAddress: "", patientName: "", patientPhone: "", emergencyDescription: "" });
    } catch {
      Alert.alert("Error", "Failed to book ambulance. Please call 108 directly.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = () => {
    if (!activeBooking) return;
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this ambulance booking?", [
      { text: "No" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await healthGuardService.cancelAmbulanceBooking(activeBooking.id);
            setHistory(h => [{ ...activeBooking, status: "CANCELLED" }, ...h]);
            setActiveBooking(null);
          } catch {
            Alert.alert("Error", "Could not cancel booking. Please try again.");
          }
        },
      },
    ]);
  };

  const currentStep = activeBooking ? STATUS_CONFIG[activeBooking.status].step : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ambulance Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} />}
      >
        {/* Emergency call strip */}
        <View style={styles.callStrip}>
          <Text style={styles.callLabel}>Emergency Numbers:</Text>
          <TouchableOpacity onPress={() => Linking.openURL("tel:108")} style={styles.callBtn}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={styles.callBtnText}>108 Ambulance</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("tel:112")} style={[styles.callBtn, { backgroundColor: COLORS.error ?? "#EF4444" }]}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={styles.callBtnText}>112 Emergency</Text>
          </TouchableOpacity>
        </View>

        {activeBooking ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Active Booking</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[activeBooking.status].color + "22" }]}>
                <Text style={[styles.statusText, { color: STATUS_CONFIG[activeBooking.status].color }]}>
                  {STATUS_CONFIG[activeBooking.status].label}
                </Text>
              </View>
            </View>

            {/* Progress */}
            {activeBooking.status !== "CANCELLED" && (
              <View style={styles.stepsRow}>
                {STEPS.map((step, i) => {
                  const stepNum = i + 1;
                  const done = stepNum < currentStep;
                  const active = stepNum === currentStep;
                  return (
                    <React.Fragment key={step}>
                      <View style={styles.stepItem}>
                        <View style={[styles.stepCircle, done ? styles.stepDone : active ? styles.stepActive : styles.stepPending]}>
                          <Text style={[styles.stepNum, (done || active) && { color: "#fff" }]}>
                            {done ? "✓" : stepNum}
                          </Text>
                        </View>
                        <Text style={[styles.stepLabel, active && { color: STATUS_CONFIG[activeBooking.status].color, fontWeight: "600" }]}>
                          {step}
                        </Text>
                      </View>
                      {i < STEPS.length - 1 && (
                        <View style={[styles.stepLine, stepNum < currentStep && { backgroundColor: "#10B981" }]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            <View style={styles.detailsBox}>
              {activeBooking.pickupAddress ? (
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{activeBooking.pickupAddress}</Text>
                </View>
              ) : null}
              {activeBooking.estimatedArrivalMinutes ? (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#F97316" />
                  <Text style={[styles.detailText, { color: "#F97316", fontWeight: "600" }]}>
                    ETA: {activeBooking.estimatedArrivalMinutes} min
                  </Text>
                </View>
              ) : null}
              {activeBooking.driverName ? (
                <View style={styles.detailRow}>
                  <Ionicons name="person" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Driver: {activeBooking.driverName}
                    {activeBooking.vehicleNumber ? ` (${activeBooking.vehicleNumber})` : ""}
                  </Text>
                </View>
              ) : null}
              {activeBooking.driverPhone ? (
                <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${activeBooking.driverPhone}`)}>
                  <Ionicons name="call" size={16} color="#3B82F6" />
                  <Text style={[styles.detailText, { color: "#3B82F6" }]}>{activeBooking.driverPhone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {(activeBooking.status === "REQUESTED" || activeBooking.status === "CONFIRMED") && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Book Ambulance</Text>

            <Text style={styles.fieldLabel}>Pickup Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="House/Flat No, Street, Area, City"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              value={form.pickupAddress}
              onChangeText={t => setForm(f => ({ ...f, pickupAddress: t }))}
            />

            <Text style={styles.fieldLabel}>Hospital / Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="Nearest hospital or specific destination"
              placeholderTextColor="#9CA3AF"
              value={form.destinationAddress}
              onChangeText={t => setForm(f => ({ ...f, destinationAddress: t }))}
            />

            <Text style={styles.fieldLabel}>Patient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name of patient"
              placeholderTextColor="#9CA3AF"
              value={form.patientName}
              onChangeText={t => setForm(f => ({ ...f, patientName: t }))}
            />

            <Text style={styles.fieldLabel}>Patient Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={form.patientPhone}
              onChangeText={t => setForm(f => ({ ...f, patientPhone: t }))}
            />

            <Text style={styles.fieldLabel}>Emergency Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Briefly describe the emergency"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              value={form.emergencyDescription}
              onChangeText={t => setForm(f => ({ ...f, emergencyDescription: t }))}
            />

            <View style={styles.formBtns}>
              <TouchableOpacity
                style={[styles.bookBtn, booking && { opacity: 0.6 }]}
                onPress={handleBook}
                disabled={booking}
              >
                <Ionicons name="car" size={18} color="#fff" />
                <Text style={styles.bookBtnText}>{booking ? "Booking..." : "Book Ambulance"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🚑</Text>
              <Text style={styles.emptyTitle}>No Active Booking</Text>
              <Text style={styles.emptySubtitle}>
                Book an ambulance for non-critical transport or when 108 is unavailable
              </Text>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="car" size={18} color="#fff" />
              <Text style={styles.bookBtnText}>Book Ambulance</Text>
            </TouchableOpacity>
          </View>
        )}

        {history.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <Text style={styles.sectionTitle}>Booking History</Text>
            {history.slice(0, 5).map(b => (
              <View key={b.id} style={styles.historyCard}>
                <Ionicons
                  name={b.status === "COMPLETED" ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={b.status === "COMPLETED" ? "#10B981" : "#EF4444"}
                />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {b.pickupAddress || `Booking #${b.id}`}
                  </Text>
                  {b.requestedAt && (
                    <Text style={styles.historyDate}>
                      {new Date(b.requestedAt).toLocaleDateString("en-IN")}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[b.status].color + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[b.status].color }]}>
                    {STATUS_CONFIG[b.status].label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface ?? "#fff",
    ...SHADOWS.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, gap: SPACING.md },
  callStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs ?? 6,
    backgroundColor: "#FEF2F2",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  callLabel: { fontSize: 12, color: "#6B7280", marginRight: 4 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    borderRadius: RADIUS.sm ?? 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  callBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface ?? "#fff",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    gap: SPACING.sm,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  statusBadge: { borderRadius: RADIUS.sm ?? 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  stepsRow: { flexDirection: "row", alignItems: "flex-start", marginVertical: SPACING.xs ?? 6 },
  stepItem: { alignItems: "center", flex: 1 },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center", borderWidth: 2,
  },
  stepDone: { backgroundColor: "#10B981", borderColor: "#10B981" },
  stepActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  stepPending: { backgroundColor: "transparent", borderColor: "#D1D5DB" },
  stepNum: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
  stepLabel: { fontSize: 9, textAlign: "center", marginTop: 3, color: "#6B7280" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#D1D5DB", marginTop: 12 },
  detailsBox: { gap: SPACING.xs ?? 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs ?? 6 },
  detailText: { flex: 1, fontSize: 14, color: COLORS.text },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs ?? 6,
    backgroundColor: "#EF4444",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  cancelBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border ?? "#E5E7EB",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background ?? "#F9FAFB",
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  formBtns: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs ?? 6 },
  bookBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs ?? 6,
    backgroundColor: "#EF4444",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.border ?? "#E5E7EB",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  outlineBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  emptyBox: { alignItems: "center", paddingVertical: SPACING.md, gap: SPACING.xs ?? 6 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary ?? "#6B7280", textAlign: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface ?? "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs ?? 6,
    ...SHADOWS.sm,
  },
  historyTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  historyDate: { fontSize: 11, color: COLORS.textSecondary ?? "#6B7280", marginTop: 2 },
});
