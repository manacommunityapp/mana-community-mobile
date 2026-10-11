import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Switch
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { healthService } from "@/services/healthService";
import {
  HealthAppointmentDto,
  ProviderStaffMemberDto,
  ProviderServiceItemDto,
  PatientQueryDto
} from "@/types/health";

export default function ProviderOperationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"appointments" | "slots" | "services" | "queries" | "staff">("appointments");
  const [appointments, setAppointments] = useState<HealthAppointmentDto[]>([]);
  const [isAcceptingPatients, setIsAcceptingPatients] = useState(true);
  const [emergencyBufferActive, setEmergencyBufferActive] = useState(true);

  // Seed sample provider items for mobile console
  const [services, setServices] = useState<ProviderServiceItemDto[]>([
    {
      id: "srv-m1",
      name: "In-Person Cardiology OPD",
      category: "CONSULTATION",
      price: 700,
      originalPrice: 850,
      communityDiscountPercent: 15,
      turnaroundTime: "Same Day",
      enabled: true
    },
    {
      id: "srv-m2",
      name: "HD Video Teleconsultation",
      category: "CONSULTATION",
      price: 500,
      originalPrice: 600,
      communityDiscountPercent: 15,
      turnaroundTime: "Instant",
      enabled: true
    },
    {
      id: "srv-m3",
      name: "Home Visit (Elder Care)",
      category: "PROCEDURE",
      price: 1200,
      originalPrice: 1500,
      communityDiscountPercent: 20,
      turnaroundTime: "Within 2 Hours",
      enabled: true
    }
  ]);

  const [staff, setStaff] = useState<ProviderStaffMemberDto[]>([
    {
      id: "stf-1",
      name: "Dr. Rajesh Kumar",
      role: "CHIEF_DOCTOR",
      phone: "+91-98801-44221",
      permissions: ["SLOTS", "BOOKINGS", "PRICING", "RX_REPORTS"],
      active: true
    },
    {
      id: "stf-2",
      name: "Sister Kavitha Nair",
      role: "CLINIC_ADMIN",
      phone: "+91-98450-88123",
      permissions: ["SLOTS", "BOOKINGS", "QUERIES"],
      active: true
    }
  ]);

  const [queries, setQueries] = useState<PatientQueryDto[]>([
    {
      id: "q-1",
      patientName: "M. K. Varma (Father)",
      patientPhone: "+91-98800-11223",
      subject: "Fasting guidance for lipid test",
      message: "Should I fast 10 hours before tomorrow's 5:30 PM consultation?",
      receivedAt: "Today, 10:15 AM",
      status: "OPEN"
    }
  ]);

  useEffect(() => {
    healthService.getAppointments().then(appts => {
      setAppointments(appts);
    });
  }, []);

  const handleUpdateStatus = async (appointmentId: string, status: "CONFIRMED" | "CANCELLED" | "COMPLETED") => {
    const updated = appointments.map(a => a.id === appointmentId ? { ...a, status } : a);
    setAppointments(updated);
    Alert.alert("Success", `Appointment marked as ${status}. Resident notified in app.`);
  };

  const handleToggleService = (serviceId: string) => {
    setServices(services.map(s => s.id === serviceId ? { ...s, enabled: !s.enabled } : s));
  };

  const handleReplyQuery = (queryId: string) => {
    Alert.prompt
      ? Alert.prompt(
          "Reply to Resident",
          "Enter medical advice or clarification message:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send",
              onPress: (reply?: string) => {
                setQueries(queries.map(q => q.id === queryId ? { ...q, status: "RESPONDED", replyMessage: reply || "" } : q));
                Alert.alert("Sent", "Reply securely delivered to patient's private Health Vault.");
              }
            }
          ]
        )
      : Alert.alert("Sent", "Reply sent to resident.");
  };

  return (
    <View style={styles.container}>
      {/* Provider Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>CLINIC & DOCTOR WORKSPACE</Text>
          </View>
          <Text style={styles.title}>Dr. Rajesh Kumar</Text>
          <Text style={styles.subtitle}>Cardiologist & General Medicine • Reg: KMC-48291</Text>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: "appointments", label: "Appointments", icon: "calendar" },
            { id: "slots", label: "Availability", icon: "time" },
            { id: "services", label: "Catalog & Rates", icon: "pricetag" },
            { id: "queries", label: "Queries", icon: "chatbubble-ellipses" },
            { id: "staff", label: "Staff Access", icon: "people" }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? "#FFFFFF" : "#4B5563"}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* TAB 1: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Clinical Consultations Queue ({appointments.length})</Text>
            {appointments.map(appt => (
              <View key={appt.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.patientName}>{appt.patientName}</Text>
                  <View style={[styles.statusBadge, appt.status === "COMPLETED" ? styles.bgDone : styles.bgPending]}>
                    <Text style={[styles.statusBadgeText, appt.status === "COMPLETED" ? styles.textDone : styles.textPending]}>
                      {appt.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="#0D9488" />
                  <Text style={styles.metaText}>{appt.slotTime} • {appt.mode} Consultation</Text>
                </View>
                <Text style={styles.feeText}>Consultation Fee: ₹{appt.fee}</Text>

                <View style={styles.btnRow}>
                  {appt.status !== "COMPLETED" && (
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => handleUpdateStatus(appt.id, "COMPLETED")}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.actionBtnPrimaryText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  {appt.status !== "CANCELLED" && (
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleUpdateStatus(appt.id, "CANCELLED")}
                    >
                      <Text style={styles.actionBtnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: AVAILABILITY & SLOTS */}
        {activeTab === "slots" && (
          <View style={{ gap: 14 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Live Booking Gate Controls</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Accepting New Patients</Text>
                  <Text style={styles.switchDesc}>Show profile available for bookings across society towers.</Text>
                </View>
                <Switch
                  value={isAcceptingPatients}
                  onValueChange={setIsAcceptingPatients}
                  trackColor={{ true: "#0D9488", false: "#D1D5DB" }}
                />
              </View>

              <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Emergency Buffer Slots</Text>
                  <Text style={styles.switchDesc}>Lock emergency slots for acute resident priority.</Text>
                </View>
                <Switch
                  value={emergencyBufferActive}
                  onValueChange={setEmergencyBufferActive}
                  trackColor={{ true: "#0D9488", false: "#D1D5DB" }}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today's Fast Slot Roster</Text>
              <View style={styles.slotGrid}>
                {[
                  { time: "09:00 AM", mode: "OPD", booked: false },
                  { time: "09:30 AM", mode: "OPD", booked: true },
                  { time: "10:00 AM", mode: "VIDEO", booked: false },
                  { time: "04:30 PM", mode: "OPD", booked: false },
                  { time: "05:00 PM", mode: "EMERGENCY", booked: false },
                  { time: "05:30 PM", mode: "OPD", booked: true }
                ].map((s, idx) => (
                  <View key={idx} style={[styles.slotItem, s.booked && styles.slotItemBooked]}>
                    <Text style={styles.slotTimeText}>{s.time}</Text>
                    <Text style={styles.slotModeText}>{s.booked ? "BOOKED" : s.mode}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: SERVICES & RATES */}
        {activeTab === "services" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Service Catalog & Society Rates</Text>
            {services.map(srv => (
              <View key={srv.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{srv.name}</Text>
                    <Text style={styles.metaText}>{srv.category} • {srv.turnaroundTime}</Text>
                  </View>
                  <Switch
                    value={srv.enabled}
                    onValueChange={() => handleToggleService(srv.id)}
                    trackColor={{ true: "#0D9488", false: "#D1D5DB" }}
                  />
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrent}>₹{srv.price}</Text>
                  {srv.originalPrice && (
                    <Text style={styles.priceOld}>₹{srv.originalPrice}</Text>
                  )}
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{srv.communityDiscountPercent}% Mana Discount</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: PATIENT INQUIRIES */}
        {activeTab === "queries" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Patient Questions & Clarifications</Text>
            {queries.map(q => (
              <View key={q.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.patientName}>{q.subject}</Text>
                  <Text style={styles.badgeText}>{q.status}</Text>
                </View>
                <Text style={styles.metaText}>From: {q.patientName} • {q.receivedAt}</Text>
                <Text style={styles.queryBody}>"{q.message}"</Text>

                {q.replyMessage ? (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyHeading}>✓ Your Advice Sent:</Text>
                    <Text style={styles.replyText}>{q.replyMessage}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => handleReplyQuery(q.id)}
                  >
                    <Ionicons name="chatbox-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Reply to Resident</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: STAFF ACCESS */}
        {activeTab === "staff" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Verified Staff & Permissions</Text>
            {staff.map(stf => (
              <View key={stf.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.patientName}>{stf.name}</Text>
                    <Text style={styles.metaText}>{stf.role} • {stf.phone}</Text>
                  </View>
                  <Text style={[styles.badgeText, { color: "#166534" }]}>VERIFIED</Text>
                </View>
                <View style={styles.permRow}>
                  {stf.permissions.map((p, idx) => (
                    <View key={idx} style={styles.permChip}>
                      <Text style={styles.permText}>{p}</Text>
                    </View>
                  ))}
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { backgroundColor: "#0F172A", padding: 20, paddingTop: 16 },
  badgeRow: { backgroundColor: "rgba(13, 148, 136, 0.2)", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  badgeText: { fontSize: 10, fontWeight: "bold", color: "#2DD4BF" },
  title: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  tabBar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F3F4F6" },
  tabButtonActive: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  tabTextActive: { color: "#FFFFFF" },
  content: { flex: 1 },
  sectionHeading: { fontSize: 15, fontWeight: "bold", color: "#111827", marginBottom: 2 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#6B7280" },
  feeText: { fontSize: 13, fontWeight: "bold", color: "#111827" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bgDone: { backgroundColor: "#DCFCE7" },
  bgPending: { backgroundColor: "#FEF3C7" },
  statusBadgeText: { fontSize: 10, fontWeight: "bold" },
  textDone: { color: "#166534" },
  textPending: { color: "#92400E" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtnPrimary: { flex: 1, backgroundColor: "#0D9488", padding: 10, borderRadius: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  actionBtnPrimaryText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  actionBtnSecondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center" },
  actionBtnSecondaryText: { color: "#DC2626", fontWeight: "bold", fontSize: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  switchTitle: { fontSize: 13, fontWeight: "bold", color: "#111827" },
  switchDesc: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  slotItem: { width: "30%", backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", borderRadius: 10, padding: 8, alignItems: "center" },
  slotItemBooked: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  slotTimeText: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  slotModeText: { fontSize: 10, color: "#0D9488", marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  priceCurrent: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  priceOld: { fontSize: 12, color: "#9CA3AF", textDecorationLine: "line-through" },
  discountBadge: { backgroundColor: "#CCFBF1", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountText: { fontSize: 10, fontWeight: "bold", color: "#0F766E" },
  queryBody: { fontSize: 12, color: "#374151", fontStyle: "italic", backgroundColor: "#F9FAFB", padding: 10, borderRadius: 8 },
  replyBox: { backgroundColor: "#F0FDFA", padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#0D9488", gap: 2 },
  replyHeading: { fontSize: 11, fontWeight: "bold", color: "#0F766E" },
  replyText: { fontSize: 12, color: "#115E59" },
  permRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  permChip: { backgroundColor: "#F3F4F6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  permText: { fontSize: 10, fontWeight: "600", color: "#4B5563" }
});