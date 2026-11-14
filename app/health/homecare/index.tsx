import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { HomecareProviderDto } from "@/types/health";

type ServiceType = "nursing" | "physiotherapy" | "attendant" | "elder" | "post_surgery" | "equipment";
type ShiftType = "visit" | "8hr" | "12hr" | "24hr" | "monthly";

interface ServiceTab {
  id: ServiceType;
  label: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
}

const SERVICE_TABS: ServiceTab[] = [
  { id: "nursing", label: "Nursing Care", icon: "medical", color: "#DC2626", bg: "#FEE2E2", desc: "Wound care, injections, IV drip, vital monitoring by registered nurses" },
  { id: "physiotherapy", label: "Physiotherapy", icon: "body", color: "#2563EB", bg: "#DBEAFE", desc: "Stroke rehab, post-op recovery, musculoskeletal therapy by licensed physios" },
  { id: "attendant", label: "Attendant / Caregiver", icon: "person", color: "#0D9488", bg: "#CCFBF1", desc: "Daily personal care, mobility assist, bathing & hygiene support" },
  { id: "elder", label: "Elder Care", icon: "people", color: "#7C3AED", bg: "#EDE9FE", desc: "Specialised geriatric care — companionship, medication reminders, exercise" },
  { id: "post_surgery", label: "Post-Surgery Care", icon: "bandage", color: "#D97706", bg: "#FEF3C7", desc: "Ortho, cardiac & abdominal surgery recovery. Daily dressing change included" },
  { id: "equipment", label: "Medical Equipment", icon: "hardware-chip", color: "#059669", bg: "#D1FAE5", desc: "Wheelchair, oxygen concentrator, hospital bed, nebulizer rental" },
];

const SHIFTS: { id: ShiftType; label: string; hours?: string; priceMultiplier: number }[] = [
  { id: "visit", label: "Per Visit", hours: "1–2 hr", priceMultiplier: 0.15 },
  { id: "8hr", label: "8 Hours", hours: "Day shift", priceMultiplier: 0.35 },
  { id: "12hr", label: "12 Hours", hours: "Day+Eve", priceMultiplier: 0.5 },
  { id: "24hr", label: "24 Hours", hours: "Round-the-clock", priceMultiplier: 1 },
  { id: "monthly", label: "Monthly Plan", hours: "30 days", priceMultiplier: 22 },
];

const EQUIPMENT_ITEMS = [
  { name: "Hospital Bed (Electric)", daily: 299, deposit: 2000, icon: "bed" },
  { name: "Wheelchair (Standard)", daily: 99, deposit: 500, icon: "accessibility" },
  { name: "Oxygen Concentrator (5L)", daily: 599, deposit: 5000, icon: "cloud" },
  { name: "Nebulizer Machine", daily: 79, deposit: 800, icon: "water" },
  { name: "Pulse Oximeter", daily: 49, deposit: 300, icon: "pulse" },
  { name: "BP Monitor (Digital)", daily: 59, deposit: 400, icon: "heart" },
  { name: "CPAP Machine", daily: 399, deposit: 8000, icon: "settings" },
  { name: "Commode Chair", daily: 69, deposit: 600, icon: "body" },
];

const CARE_PLANS = [
  {
    name: "Basic Care",
    desc: "Vitals monitoring, medication reminders, hygiene assistance",
    services: ["Vital checks 3×/day", "Medication reminders", "Hygiene support", "Activity log"],
    color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4"
  },
  {
    name: "Comprehensive Care",
    desc: "All Basic + Wound dressing, IV administration, doctor-prescribed procedures",
    services: ["All Basic services", "Wound dressing", "IV/IM procedures", "Diet management", "Family briefing"],
    color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE"
  },
  {
    name: "ICU Step-Down",
    desc: "Post-ICU intensive monitoring for medically complex cases",
    services: ["Continuous monitoring", "Suctioning/tracheostomy", "Feeding tube care", "Physiotherapy coordination", "24×7 nurse coverage"],
    color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD"
  },
];

const TIME_SLOTS = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "06:00 PM"];

const TODAY = new Date();
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() + i);
  return {
    key: d.toISOString().split("T")[0],
    day: d.toLocaleDateString("en-IN", { weekday: "short" }),
    date: d.getDate(),
    month: d.toLocaleDateString("en-IN", { month: "short" }),
  };
});

export default function HomecareScreen() {
  const [providers, setProviders] = useState<HomecareProviderDto[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>("nursing");
  const [shift, setShift] = useState<ShiftType>("8hr");
  const [selectedDate, setSelectedDate] = useState(DATES[0].key);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState<HomecareProviderDto | null>(null);
  const [patientName, setPatientName] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"providers" | "plans" | "equipment">("providers");

  useEffect(() => {
    healthService.getHomecareProviders().then(setProviders);
  }, []);

  const activeService = SERVICE_TABS.find(s => s.id === serviceType)!;
  const activeShift = SHIFTS.find(s => s.id === shift)!;

  const filteredProviders = serviceType === "equipment" ? [] : providers.filter(p => {
    if (serviceType === "nursing") return p.role === "Nurse";
    if (serviceType === "physiotherapy") return p.role === "Physiotherapist";
    if (serviceType === "post_surgery") return p.role === "Post-Surgery Care";
    if (serviceType === "elder") return p.role === "Elder Care";
    return true;
  });

  const calcPrice = (base: number) => Math.round(base * activeShift.priceMultiplier);

  const handleConfirmBooking = () => {
    if (!patientName.trim() || !flatNo.trim()) {
      Alert.alert("Required", "Please fill patient name and flat number.");
      return;
    }
    if (!selectedTime) {
      Alert.alert("Required", "Please select a start time.");
      return;
    }
    setShowBooking(null);
    Alert.alert(
      "Care Service Booked ✓",
      `${activeService.label} booked for ${patientName} at Flat ${flatNo}.\n\nDate: ${selectedDate} at ${selectedTime}\nShift: ${activeShift.label}\n\nYour caregiver will arrive 15 min early for handover briefing.`,
      [{ text: "Done" }]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#DB2777", "#BE185D"]} style={styles.header}>
        <Ionicons name="home" size={22} color="#FCE7F3" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Home Healthcare</Text>
          <Text style={styles.headerSub}>Verified caregivers · Doorstep service · Background checked</Text>
        </View>
      </LinearGradient>

      {/* Service Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceTabScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
        {SERVICE_TABS.map(st => (
          <TouchableOpacity
            key={st.id}
            style={[styles.serviceTab, serviceType === st.id && { backgroundColor: st.color, borderColor: st.color }]}
            onPress={() => { setServiceType(st.id); setTab(st.id === "equipment" ? "equipment" : "providers"); }}
          >
            <Ionicons name={st.icon as any} size={14} color={serviceType === st.id ? "#FFFFFF" : st.color} />
            <Text style={[styles.serviceTabText, serviceType === st.id && { color: "#FFFFFF" }]}>{st.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service description banner */}
      <View style={[styles.descBanner, { backgroundColor: activeService.bg, borderColor: activeService.color + "44" }]}>
        <Ionicons name={activeService.icon as any} size={16} color={activeService.color} />
        <Text style={[styles.descText, { color: activeService.color }]}>{activeService.desc}</Text>
      </View>

      {serviceType !== "equipment" && (
        <>
          {/* Sub-tabs */}
          <View style={styles.subTabRow}>
            {(["providers", "plans"] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.subTab, tab === t && styles.subTabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.subTabText, tab === t && styles.subTabTextActive]}>
                  {t === "providers" ? "Available Caregivers" : "Care Plans"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shift selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shiftScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
            {SHIFTS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.shiftChip, shift === s.id && styles.shiftChipActive]}
                onPress={() => setShift(s.id)}
              >
                <Text style={[styles.shiftLabel, shift === s.id && styles.shiftLabelActive]}>{s.label}</Text>
                {s.hours && <Text style={[styles.shiftSub, shift === s.id && { color: "#CCFBF1" }]}>{s.hours}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Equipment rental */}
        {(serviceType === "equipment" || tab === "equipment") && serviceType === "equipment" && (
          <>
            <Text style={styles.sectionTitle}>Medical Equipment Rental</Text>
            <View style={styles.equipmentGrid}>
              {EQUIPMENT_ITEMS.map(eq => (
                <View key={eq.name} style={styles.equipCard}>
                  <View style={styles.equipIconWrap}>
                    <Ionicons name={eq.icon as any} size={22} color="#059669" />
                  </View>
                  <Text style={styles.equipName}>{eq.name}</Text>
                  <Text style={styles.equipPrice}>₹{eq.daily}/day</Text>
                  <Text style={styles.equipDeposit}>Deposit: ₹{eq.deposit}</Text>
                  <TouchableOpacity
                    style={styles.equipBtn}
                    onPress={() => Alert.alert("Rental Request", `Request for ${eq.name} submitted. Our team will confirm within 2 hours.`)}
                  >
                    <Text style={styles.equipBtnText}>Rent Now</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Care Plans */}
        {tab === "plans" && serviceType !== "equipment" && (
          <>
            <Text style={styles.sectionTitle}>Care Plans</Text>
            {CARE_PLANS.map(plan => (
              <View key={plan.name} style={[styles.planCard, { backgroundColor: plan.bg, borderColor: plan.border }]}>
                <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                <Text style={styles.planDesc}>{plan.desc}</Text>
                <View style={styles.planServices}>
                  {plan.services.map(s => (
                    <View key={s} style={styles.planServiceRow}>
                      <Ionicons name="checkmark-circle" size={14} color={plan.color} />
                      <Text style={styles.planServiceText}>{s}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.planBtn, { backgroundColor: plan.color }]}
                  onPress={() => Alert.alert("Plan Selected", `${plan.name} will be applied to your caregiver booking.`)}
                >
                  <Text style={styles.planBtnText}>Select {plan.name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Providers */}
        {tab === "providers" && serviceType !== "equipment" && (
          <>
            <Text style={styles.sectionTitle}>
              {filteredProviders.length} {activeService.label} Professionals Available
            </Text>
            {(filteredProviders.length > 0 ? filteredProviders : providers).map(p => (
              <View key={p.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={[styles.avatar, { backgroundColor: activeService.bg }]}>
                    <Ionicons name={activeService.icon as any} size={22} color={activeService.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{p.name}</Text>
                      {p.verifiedHealthcareBadge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>✓ Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.role}>{p.role} · {p.experienceYears} yrs exp · {p.licenseNumber}</Text>
                    <View style={styles.tagsRow}>
                      <Text style={styles.tag}>⭐ {p.rating}</Text>
                      {p.available && <Text style={[styles.tag, styles.availTag]}>Available Today</Text>}
                    </View>
                  </View>
                </View>
                <Text style={styles.desc}>{p.description}</Text>
                <View style={styles.pricingRow}>
                  <View>
                    <Text style={styles.shiftLabel2}>{activeShift.label} Charge</Text>
                    <Text style={styles.price}>₹{calcPrice(p.dailyRate)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.bookBtn, { backgroundColor: activeService.color }]}
                    onPress={() => setShowBooking(p)}
                  >
                    <Text style={styles.bookBtnText}>Book {activeShift.label}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Trust indicators */}
        <View style={styles.trustRow}>
          {[
            { icon: "shield-checkmark", label: "Police verified" },
            { icon: "school", label: "Certified nurses" },
            { icon: "star", label: "Rated 4.8+" },
            { icon: "time", label: "On-time guarantee" },
          ].map(t => (
            <View key={t.label} style={styles.trustItem}>
              <Ionicons name={t.icon as any} size={16} color="#DB2777" />
              <Text style={styles.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!showBooking} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book {activeService.label}</Text>
            <TouchableOpacity onPress={() => setShowBooking(null)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.providerSummary}>
              <View style={[styles.avatar, { backgroundColor: activeService.bg }]}>
                <Ionicons name={activeService.icon as any} size={20} color={activeService.color} />
              </View>
              <View>
                <Text style={styles.modalProviderName}>{showBooking?.name}</Text>
                <Text style={styles.modalProviderRole}>{showBooking?.role} · {activeShift.label}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Patient Name *</Text>
            <TextInput style={styles.input} placeholder="Full name of patient" value={patientName} onChangeText={setPatientName} />

            <Text style={styles.fieldLabel}>Flat / Unit Number *</Text>
            <TextInput style={styles.input} placeholder="e.g. A-1204" value={flatNo} onChangeText={setFlatNo} />

            <Text style={styles.fieldLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={{ gap: 8 }}>
              {DATES.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dateChip, selectedDate === d.key && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d.key)}
                >
                  <Text style={[styles.dateDay, selectedDate === d.key && { color: "#FFFFFF" }]}>{d.day}</Text>
                  <Text style={[styles.dateNum, selectedDate === d.key && { color: "#FFFFFF" }]}>{d.date}</Text>
                  <Text style={[styles.dateMon, selectedDate === d.key && { color: "#FCE7F3" }]}>{d.month}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Select Start Time</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeChip, selectedTime === slot && styles.timeChipActive]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[styles.timeChipText, selectedTime === slot && styles.timeChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Special Instructions (optional)</Text>
            <TextInput
              style={[styles.input, { height: 72 }]}
              multiline
              placeholder="Allergies, special requirements, access instructions..."
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.priceSummaryBox}>
              <Text style={styles.priceSummaryLabel}>Total Charge</Text>
              <Text style={styles.priceSummaryValue}>
                ₹{calcPrice(showBooking?.dailyRate ?? 600)} <Text style={styles.priceSummaryShift}>/ {activeShift.label}</Text>
              </Text>
              <Text style={styles.priceSummaryNote}>Includes platform fee. No hidden charges.</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: activeService.color }]} onPress={handleConfirmBooking}>
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, gap: 10 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#FBCFE8", fontSize: 11, marginTop: 2 },
  serviceTabScroll: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", maxHeight: 52 },
  serviceTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  serviceTabText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  descBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  descText: { fontSize: 11, fontWeight: "500", flex: 1, lineHeight: 16 },
  subTabRow: { flexDirection: "row", marginHorizontal: 12, marginTop: 8, backgroundColor: "#F1F5F9", borderRadius: 10, padding: 3 },
  subTab: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
  subTabActive: { backgroundColor: "#FFFFFF" },
  subTabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  subTabTextActive: { color: "#111827", fontWeight: "700" },
  shiftScroll: { maxHeight: 50, marginTop: 8 },
  shiftChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", alignItems: "center" },
  shiftChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  shiftLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  shiftLabelActive: { color: "#FFFFFF" },
  shiftSub: { fontSize: 9, color: "#9CA3AF", marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  equipmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  equipCard: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", gap: 4 },
  equipIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  equipName: { fontSize: 12, fontWeight: "700", color: "#111827", textAlign: "center" },
  equipPrice: { fontSize: 13, fontWeight: "800", color: "#059669" },
  equipDeposit: { fontSize: 10, color: "#6B7280" },
  equipBtn: { marginTop: 6, backgroundColor: "#059669", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  equipBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  planCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 8 },
  planName: { fontSize: 15, fontWeight: "800" },
  planDesc: { fontSize: 12, color: "#4B5563", lineHeight: 17 },
  planServices: { gap: 4 },
  planServiceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planServiceText: { fontSize: 12, color: "#374151" },
  planBtn: { paddingVertical: 10, borderRadius: 10, alignItems: "center", marginTop: 4 },
  planBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontWeight: "800", color: "#111827" },
  badge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: "#15803D", fontSize: 9, fontWeight: "800" },
  role: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  tag: { fontSize: 10, fontWeight: "700", color: "#92400E", backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  availTag: { color: "#065F46", backgroundColor: "#D1FAE5" },
  desc: { fontSize: 12, color: "#4B5563", lineHeight: 17 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  shiftLabel2: { fontSize: 10, color: "#9CA3AF" },
  price: { fontSize: 16, fontWeight: "800", color: "#111827" },
  bookBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4, width: "45%" },
  trustText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  // Modal
  modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  modalContent: { padding: 16, gap: 10, paddingBottom: 40 },
  providerSummary: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  modalProviderName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  modalProviderRole: { fontSize: 12, color: "#6B7280" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 4 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827" },
  dateScroll: { maxHeight: 70 },
  dateChip: { width: 52, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  dateChipActive: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  dateDay: { fontSize: 10, fontWeight: "600", color: "#6B7280" },
  dateNum: { fontSize: 18, fontWeight: "800", color: "#111827" },
  dateMon: { fontSize: 9, color: "#9CA3AF" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  timeChipActive: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  timeChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  timeChipTextActive: { color: "#FFFFFF" },
  priceSummaryBox: { backgroundColor: "#FFF7ED", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FED7AA", gap: 2 },
  priceSummaryLabel: { fontSize: 12, color: "#92400E" },
  priceSummaryValue: { fontSize: 22, fontWeight: "800", color: "#B45309" },
  priceSummaryShift: { fontSize: 12, fontWeight: "400", color: "#92400E" },
  priceSummaryNote: { fontSize: 10, color: "#92400E" },
  confirmBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
